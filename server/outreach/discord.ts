import { Client, GatewayIntentBits, TextChannel, DMChannel, Message, Guild, Channel, ChannelType, Invite } from 'discord.js';

interface DiscordInboxItem {
  id: string;
  type: 'mention' | 'dm' | 'reply';
  authorId: string;
  authorTag: string;
  content: string;
  channelId: string;
  channelName: string;
  guildId?: string;
  guildName?: string;
  messageId: string;
  timestamp: number;
}

interface DiscordMessageResult {
  id: string;
  authorTag: string;
  content: string;
  timestamp: string;
  channelId: string;
}

let client: Client | null = null;
let isConnecting = false;
const inboxQueue: DiscordInboxItem[] = [];
const MAX_INBOX = 50;
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_CACHE = 500;

export function isDiscordBotConfigured(): boolean {
  return !!process.env.DISCORD_BOT_TOKEN?.trim();
}

export function isDiscordBotReady(): boolean {
  return client?.isReady() ?? false;
}

export function getDiscordBotTag(): string | null {
  return client?.user?.tag ?? null;
}

export async function connectDiscordBot(): Promise<{ success: boolean; tag?: string; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) {
    return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };
  }

  if (client?.isReady()) {
    return { success: true, tag: client.user?.tag };
  }

  if (isConnecting) {
    return { success: false, error: 'Connection already in progress' };
  }

  isConnecting = true;

  try {
    if (client) {
      client.removeAllListeners();
      await client.destroy().catch(() => {});
    }

    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });

    client.on('messageCreate', handleIncomingMessage);
    client.on('error', (err) => {
      console.error('[Discord] Client error:', err.message);
    });
    client.on('warn', (msg) => {
      console.warn('[Discord] Warning:', msg);
    });

    await client.login(token);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);
      client!.once('ready', () => {
        clearTimeout(timeout);
        console.log(`[Discord] Bot connected as ${client!.user?.tag} in ${client!.guilds.cache.size} servers`);
        resolve();
      });
    });

    isConnecting = false;
    return { success: true, tag: client.user?.tag ?? undefined };
  } catch (err: any) {
    isConnecting = false;
    console.error('[Discord] Connection failed:', err.message);
    return { success: false, error: err.message };
  }
}

export async function disconnectDiscordBot(): Promise<{ success: boolean }> {
  if (client) {
    client.removeAllListeners();
    await client.destroy().catch(() => {});
    client = null;
    console.log('[Discord] Bot disconnected');
  }
  return { success: true };
}

function handleIncomingMessage(message: Message) {
  if (message.author.bot) return;
  if (!client?.user) return;

  if (processedMessageIds.has(message.id)) return;
  processedMessageIds.add(message.id);
  if (processedMessageIds.size > MAX_PROCESSED_CACHE) {
    const arr = Array.from(processedMessageIds);
    for (let i = 0; i < 100; i++) processedMessageIds.delete(arr[i]);
  }

  const isMention = message.mentions.has(client.user);
  const isDM = message.channel.type === ChannelType.DM;
  const isReply = message.reference?.messageId ? true : false;

  if (!isMention && !isDM) return;

  const item: DiscordInboxItem = {
    id: `discord-${message.id}`,
    type: isDM ? 'dm' : isMention ? 'mention' : 'reply',
    authorId: message.author.id,
    authorTag: message.author.tag,
    content: message.content,
    channelId: message.channelId,
    channelName: isDM ? 'DM' : (message.channel as TextChannel).name || 'unknown',
    guildId: message.guildId ?? undefined,
    guildName: message.guild?.name ?? undefined,
    messageId: message.id,
    timestamp: message.createdTimestamp,
  };

  inboxQueue.push(item);
  if (inboxQueue.length > MAX_INBOX) inboxQueue.shift();

  console.log(`[Discord] Inbox: ${item.type} from ${item.authorTag} in ${item.guildName || 'DM'}: "${item.content.substring(0, 80)}"`);
}

export function getDiscordInbox(limit = 10): DiscordInboxItem[] {
  return inboxQueue.splice(0, Math.min(limit, inboxQueue.length));
}

export function peekDiscordInbox(): { count: number; preview: DiscordInboxItem[] } {
  return {
    count: inboxQueue.length,
    preview: inboxQueue.slice(0, 5),
  };
}

export async function listDiscordServers(): Promise<{ success: boolean; servers?: Array<{ id: string; name: string; memberCount: number; channels: number }>; error?: string }> {
  if (!client?.isReady()) {
    return { success: false, error: 'Discord bot not connected' };
  }

  const servers = client.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    channels: g.channels.cache.size,
  }));

  return { success: true, servers };
}

export async function listDiscordChannels(guildId: string): Promise<{ success: boolean; channels?: Array<{ id: string; name: string; type: string; topic?: string }>; error?: string }> {
  if (!client?.isReady()) {
    return { success: false, error: 'Discord bot not connected' };
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { success: false, error: `Not in server ${guildId}` };
  }

  const channels = guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement || ch.type === ChannelType.GuildForum)
    .map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ChannelType[ch.type] || 'unknown',
      topic: (ch as TextChannel).topic ?? undefined,
    }));

  return { success: true, channels };
}

export async function sendDiscordMessage(
  channelId: string,
  content: string,
  options?: { replyTo?: string; embed?: { title: string; description: string; color?: number } }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!client?.isReady()) {
    return { success: false, error: 'Discord bot not connected' };
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !('send' in channel)) {
      return { success: false, error: `Channel ${channelId} not found or not a text channel` };
    }

    const textChannel = channel as TextChannel | DMChannel;
    const msgPayload: any = {};

    if (options?.embed) {
      msgPayload.embeds = [{
        title: options.embed.title,
        description: options.embed.description,
        color: options.embed.color ?? 0x7C3AED,
      }];
    } else {
      msgPayload.content = content;
    }

    if (options?.replyTo) {
      msgPayload.reply = { messageReference: options.replyTo };
    }

    const sent = await textChannel.send(msgPayload);
    console.log(`[Discord] Sent message in ${channelId}: "${content.substring(0, 80)}"`);
    return { success: true, messageId: sent.id };
  } catch (err: any) {
    console.error(`[Discord] Send failed:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function readDiscordMessages(
  channelId: string,
  limit = 20
): Promise<{ success: boolean; messages?: DiscordMessageResult[]; error?: string }> {
  if (!client?.isReady()) {
    return { success: false, error: 'Discord bot not connected' };
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !('messages' in channel)) {
      return { success: false, error: `Channel ${channelId} not found or not a text channel` };
    }

    const textChannel = channel as TextChannel | DMChannel;
    const fetched = await textChannel.messages.fetch({ limit: Math.min(limit, 50) });

    const messages = fetched.map(m => ({
      id: m.id,
      authorTag: m.author.tag,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      channelId: m.channelId,
    })).reverse();

    return { success: true, messages };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function joinDiscordServer(inviteCode: string): Promise<{ success: boolean; guildName?: string; guildId?: string; error?: string }> {
  if (!client?.isReady()) {
    return { success: false, error: 'Discord bot not connected' };
  }

  try {
    const code = inviteCode.replace(/^(https?:\/\/)?(discord\.gg\/|discord\.com\/invite\/)/, '');

    const invite = await client.fetchInvite(code);
    if (!invite.guild) {
      return { success: false, error: 'Invalid invite or no guild associated' };
    }

    const alreadyIn = client.guilds.cache.has(invite.guild.id);
    if (alreadyIn) {
      return { success: true, guildName: invite.guild.name, guildId: invite.guild.id, error: 'Already in this server' };
    }

    return {
      success: true,
      guildName: invite.guild.name,
      guildId: invite.guild.id,
      error: 'Bot accounts cannot self-join via invite codes. The server admin must add the bot using the OAuth2 URL. Invite URL: https://discord.com/api/oauth2/authorize?client_id=' + client.user?.id + '&permissions=274877975552&scope=bot',
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function searchDiscordMessages(
  channelId: string,
  query: string,
  limit = 20
): Promise<{ success: boolean; messages?: DiscordMessageResult[]; error?: string }> {
  if (!client?.isReady()) {
    return { success: false, error: 'Discord bot not connected' };
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !('messages' in channel)) {
      return { success: false, error: `Channel ${channelId} not found` };
    }

    const textChannel = channel as TextChannel | DMChannel;
    const fetched = await textChannel.messages.fetch({ limit: 100 });

    const queryLower = query.toLowerCase();
    const matching = fetched
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .first(limit);

    const messages = Array.from(matching.values()).map(m => ({
      id: m.id,
      authorTag: m.author.tag,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
      channelId: m.channelId,
    }));

    return { success: true, messages };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getDiscordStatus(): {
  configured: boolean;
  connected: boolean;
  tag: string | null;
  servers: number;
  inboxSize: number;
} {
  return {
    configured: isDiscordBotConfigured(),
    connected: isDiscordBotReady(),
    tag: getDiscordBotTag(),
    servers: client?.guilds.cache.size ?? 0,
    inboxSize: inboxQueue.length,
  };
}

export async function autoConnectDiscord(): Promise<void> {
  if (isDiscordBotConfigured() && !isDiscordBotReady()) {
    console.log('[Discord] Auto-connecting bot...');
    const result = await connectDiscordBot();
    if (result.success) {
      console.log(`[Discord] Auto-connected as ${result.tag}`);
    } else {
      console.log(`[Discord] Auto-connect failed: ${result.error}`);
    }
  }
}
