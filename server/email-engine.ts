import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

interface MailTmDomain {
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
}

interface MailTmAccount {
  id: string;
  address: string;
  token: string;
  password: string;
  createdAt: string;
}

interface MailTmMessage {
  id: string;
  from: { address: string; name: string };
  to: { address: string; name: string }[];
  subject: string;
  intro: string;
  text: string;
  html: string[];
  createdAt: string;
  seen: boolean;
  hasAttachments: boolean;
}

const BASE_URL = 'https://api.mail.tm';

const activeAccounts: Map<string, MailTmAccount> = new Map();

export async function getAvailableDomains(): Promise<MailTmDomain[]> {
  const res = await fetch(`${BASE_URL}/domains`);
  if (!res.ok) throw new Error(`Failed to get domains: ${res.statusText}`);
  const data = await res.json() as any;
  return data['hydra:member'] || data;
}

export async function createEmailAccount(username?: string): Promise<MailTmAccount> {
  const domains = await getAvailableDomains();
  if (!domains.length) throw new Error('No available email domains');
  
  const activeDomain = domains.find(d => d.isActive && !d.isPrivate) || domains.find(d => d.isActive) || domains[0];
  const domain = activeDomain.domain;
  const name = username || `eva_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const address = `${name}@${domain}`;
  const password = `Eva_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  
  const createRes = await fetch(`${BASE_URL}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password })
  });
  
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create account: ${err}`);
  }
  
  const account = await createRes.json() as any;
  
  const tokenRes = await fetch(`${BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password })
  });
  
  if (!tokenRes.ok) throw new Error('Failed to get auth token');
  const tokenData = await tokenRes.json() as any;
  
  const result: MailTmAccount = {
    id: account.id,
    address,
    token: tokenData.token,
    password,
    createdAt: new Date().toISOString()
  };
  
  activeAccounts.set(address, result);
  console.log(`[Email] Created email account: ${address}`);
  
  return result;
}

export async function getMessages(address: string): Promise<MailTmMessage[]> {
  const account = activeAccounts.get(address);
  if (!account) throw new Error(`No active account for ${address}`);
  
  const res = await fetch(`${BASE_URL}/messages`, {
    headers: { 'Authorization': `Bearer ${account.token}` }
  });
  
  if (!res.ok) throw new Error(`Failed to get messages: ${res.statusText}`);
  const data = await res.json() as any;
  return data['hydra:member'] || data;
}

export async function getMessageById(address: string, messageId: string): Promise<MailTmMessage> {
  const account = activeAccounts.get(address);
  if (!account) throw new Error(`No active account for ${address}`);
  
  const res = await fetch(`${BASE_URL}/messages/${messageId}`, {
    headers: { 'Authorization': `Bearer ${account.token}` }
  });
  
  if (!res.ok) throw new Error(`Failed to get message: ${res.statusText}`);
  return await res.json() as MailTmMessage;
}

export async function waitForEmail(address: string, timeoutMs: number = 60000, pollIntervalMs: number = 3000): Promise<MailTmMessage | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const messages = await getMessages(address);
      if (messages.length > 0) {
        const fullMessage = await getMessageById(address, messages[0].id);
        return fullMessage;
      }
    } catch (e) {
      console.log(`[Email] Poll error for ${address}: ${(e as Error).message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return null;
}

export function extractVerificationLinks(html: string | string[]): string[] {
  const content = Array.isArray(html) ? html.join(' ') : html;
  const urlRegex = /https?:\/\/[^\s"'<>]+(?:verify|confirm|activate|registration|signup|token|code|validate|click)[^\s"'<>]*/gi;
  const matches = content.match(urlRegex) || [];
  
  const allLinks = /https?:\/\/[^\s"'<>]+/gi;
  const allMatches = content.match(allLinks) || [];
  
  const uniqueVerifyLinks = [...new Set(matches)];
  if (uniqueVerifyLinks.length > 0) return uniqueVerifyLinks;
  
  return [...new Set(allMatches)].slice(0, 10);
}

export function extractVerificationCodes(text: string): string[] {
  const codes: string[] = [];
  
  const sixDigit = text.match(/\b\d{6}\b/g);
  if (sixDigit) codes.push(...sixDigit);
  
  const fourDigit = text.match(/\b\d{4}\b/g);
  if (fourDigit) codes.push(...fourDigit);
  
  const alphaCode = text.match(/\b[A-Z0-9]{6,10}\b/g);
  if (alphaCode) codes.push(...alphaCode);
  
  return [...new Set(codes)];
}

export function getActiveAccounts(): MailTmAccount[] {
  return Array.from(activeAccounts.values()).map(a => ({
    ...a,
    token: a.token.substring(0, 10) + '...',
    password: '***'
  }));
}

export function getAccountCount(): number {
  return activeAccounts.size;
}

export async function deleteEmailAccount(address: string): Promise<boolean> {
  const account = activeAccounts.get(address);
  if (!account) return false;
  
  try {
    await fetch(`${BASE_URL}/accounts/${account.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${account.token}` }
    });
    activeAccounts.delete(address);
    console.log(`[Email] Deleted email account: ${address}`);
    return true;
  } catch {
    return false;
  }
}

function getGmailTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const transporter = getGmailTransporter();
  if (!transporter) {
    return { success: false, error: 'GMAIL_USER and GMAIL_APP_PASSWORD not configured. Cannot send emails.' };
  }

  const gmailUser = process.env.GMAIL_USER!;
  const fromAddress = options.from || `Eva <${gmailUser}>`;
  const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients,
      subject: options.subject,
      ...(options.html ? { html: options.html } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(!options.html && !options.text ? { text: '' } : {}),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    console.log(`[Email] Sent email to ${recipients} (ID: ${info.messageId})`);
    return { success: true, id: info.messageId };
  } catch (e) {
    const errMsg = (e as Error).message;
    console.log(`[Email] Send error: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

export interface GmailMessage {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  text: string;
  messageId: string;
  inReplyTo?: string;
}

const seenReplyUids = new Set<number>();
const pendingReplies: GmailMessage[] = [];

export function getPendingReplies(): GmailMessage[] {
  return [...pendingReplies];
}

export function clearPendingReply(uid: number): void {
  const idx = pendingReplies.findIndex(r => r.uid === uid);
  if (idx !== -1) pendingReplies.splice(idx, 1);
}

export function getSeenReplyCount(): number {
  return seenReplyUids.size;
}

export async function checkGmailInbox(knownOutreachEmails: string[]): Promise<GmailMessage[]> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  if (!user || !pass) {
    console.log('[GmailInbox] No Gmail credentials configured');
    return [];
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false
  });

  const newReplies: GmailMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const msgs = client.fetch(
        { since, seen: false },
        { envelope: true, source: true, uid: true }
      );

      for await (const msg of msgs) {
        if (seenReplyUids.has(msg.uid)) continue;

        const envelope = msg.envelope;
        if (!envelope?.from?.[0]?.address) continue;

        const fromAddr = envelope.from[0].address.toLowerCase();
        const isFromOutreach = knownOutreachEmails.some(e => e.toLowerCase() === fromAddr);
        if (!isFromOutreach) continue;

        const source = msg.source?.toString() || '';
        const textMatch = source.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\r\n)/);
        let textBody = textMatch ? textMatch[1] : '';
        if (!textBody && source) {
          const lines = source.split('\r\n');
          const bodyStart = lines.findIndex(l => l === '') + 1;
          if (bodyStart > 0) textBody = lines.slice(bodyStart, bodyStart + 50).join('\n');
        }
        textBody = textBody
          .replace(/=\r?\n/g, '')
          .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .trim();
        if (textBody.length > 2000) textBody = textBody.slice(0, 2000) + '...';

        const reply: GmailMessage = {
          uid: msg.uid,
          from: fromAddr,
          to: envelope.to?.[0]?.address || user,
          subject: envelope.subject || '(no subject)',
          date: envelope.date?.toISOString() || new Date().toISOString(),
          text: textBody,
          messageId: envelope.messageId || '',
          inReplyTo: envelope.inReplyTo || undefined
        };

        seenReplyUids.add(msg.uid);
        newReplies.push(reply);
        pendingReplies.push(reply);
        console.log(`[GmailInbox] New reply from ${fromAddr}: "${reply.subject}"`);
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (e) {
    console.error('[GmailInbox] IMAP error:', (e as Error).message);
    try { await client.logout(); } catch {}
  }

  return newReplies;
}

export async function sendReplyEmail(to: string, subject: string, body: string, inReplyTo?: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const transporter = getGmailTransporter();
  if (!transporter) {
    return { success: false, error: 'Gmail not configured' };
  }

  const gmailUser = process.env.GMAIL_USER!;
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

  try {
    const info = await transporter.sendMail({
      from: `Eva <${gmailUser}>`,
      to,
      subject: replySubject,
      text: body,
      ...(inReplyTo ? { inReplyTo, references: inReplyTo } : {}),
    });

    console.log(`[Email] Sent reply to ${to} (ID: ${info.messageId})`);
    return { success: true, id: info.messageId };
  } catch (e) {
    const errMsg = (e as Error).message;
    console.log(`[Email] Reply error: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}
