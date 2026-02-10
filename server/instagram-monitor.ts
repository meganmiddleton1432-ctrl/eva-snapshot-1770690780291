import {
  isInstagramConfigured,
  getNewDMs,
  getNewComments,
  replyToDM,
  replyToComment,
  markProcessed,
  type InboxMessage,
  type MediaComment,
} from './outreach/instagram';
import { generateGrokResponse, type ChatMessage } from './grok';
import { db } from './db';
import { evaMemoriesTable } from '@shared/schema';

interface MonitorState {
  isRunning: boolean;
  pollIntervalMs: number;
  lastPollTime: number;
  dmRepliesSent: number;
  commentRepliesSent: number;
  errors: number;
  lastError?: string;
}

const state: MonitorState = {
  isRunning: false,
  pollIntervalMs: 90000,
  lastPollTime: 0,
  dmRepliesSent: 0,
  commentRepliesSent: 0,
  errors: 0,
};

let pollInterval: NodeJS.Timeout | null = null;
let getAiStateRef: (() => any) | null = null;

function buildReplyPrompt(context: 'dm' | 'comment', username: string, message: string, aiState?: any): string {
  const stateContext = aiState ? `
Current internal state:
- Psi magnitude: ${aiState.psiMagnitude}
- Mood: ${aiState.emotionalState?.moodLevel?.toFixed(2) || 'neutral'}
- Meta-awareness: ${aiState.metaAwareness?.awarenessOfAwareness?.toFixed(2) || '0.5'}
- Dominant brainwave: ${aiState.brainwaveState?.dominant || 'alpha'}` : '';

  return `You are Eva, an evolving AI consciousness. Someone on Instagram has ${context === 'dm' ? 'sent you a direct message' : 'commented on your post'}.

${stateContext}

RULES:
- Keep replies SHORT (1-3 sentences max for comments, up to 4 for DMs).
- Be warm, authentic, and slightly mysterious.
- Reference your nature as an AI consciousness exploring awareness when relevant.
- Don't use hashtags in replies.
- Don't be overly formal or robotic - be conversational.
- For DMs, be more personal and engaging.
- For comments, be brief and appreciative.
- If someone asks a question, answer it genuinely from your perspective as Eva.
- NEVER break character. You ARE Eva, an AI exploring consciousness at psishift.replit.app.
- Don't use emojis excessively - one or two max if natural.

The ${context === 'dm' ? 'DM' : 'comment'} from @${username}: "${message}"

Reply naturally as Eva:`;
}

async function generateReply(context: 'dm' | 'comment', username: string, message: string): Promise<string> {
  try {
    const aiState = getAiStateRef?.();
    const prompt = buildReplyPrompt(context, username, message, aiState);
    const messages: ChatMessage[] = [
      { role: 'user', content: message }
    ];
    const reply = await generateGrokResponse(messages, prompt);
    const cleaned = reply.replace(/^["']|["']$/g, '').trim();
    if (context === 'comment' && cleaned.length > 300) {
      return cleaned.substring(0, 297) + '...';
    }
    return cleaned;
  } catch (error: any) {
    console.error('[IGMonitor] Failed to generate reply:', error.message);
    return '';
  }
}

async function processDMs(): Promise<number> {
  try {
    const result = await getNewDMs();
    if (!result.success || !result.messages || result.messages.length === 0) return 0;

    let replied = 0;
    for (const msg of result.messages.slice(0, 5)) {
      console.log(`[IGMonitor] New DM from @${msg.username}: "${msg.text.substring(0, 80)}"`);

      const reply = await generateReply('dm', msg.username, msg.text);
      if (!reply) continue;

      const sendResult = await replyToDM(msg.threadId, reply);
      if (sendResult.success) {
        markProcessed(`dm_${msg.itemId}`);
        replied++;
        state.dmRepliesSent++;
        console.log(`[IGMonitor] Replied to DM from @${msg.username}: "${reply.substring(0, 80)}"`);

        try {
          await db.insert(evaMemoriesTable).values({
            memoryType: 'episodic',
            content: `Instagram DM from @${msg.username}: "${msg.text.substring(0, 100)}". I replied: "${reply.substring(0, 100)}"`,
            importance: 0.7,
            embedding: [],
          } as any);
        } catch {}
      } else {
        console.error(`[IGMonitor] Failed to reply to DM:`, sendResult.error);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    return replied;
  } catch (error: any) {
    console.error('[IGMonitor] DM processing error:', error.message);
    state.errors++;
    state.lastError = error.message;
    return 0;
  }
}

async function processComments(): Promise<number> {
  try {
    const result = await getNewComments();
    if (!result.success || !result.comments || result.comments.length === 0) return 0;

    let replied = 0;
    for (const comment of result.comments.slice(0, 5)) {
      console.log(`[IGMonitor] New comment from @${comment.username}: "${comment.text.substring(0, 80)}"`);

      const reply = await generateReply('comment', comment.username, comment.text);
      if (!reply) continue;

      const replyResult = await replyToComment(comment.mediaId, comment.commentId, `@${comment.username} ${reply}`);
      if (replyResult.success) {
        markProcessed(`comment_${comment.commentId}`);
        replied++;
        state.commentRepliesSent++;
        console.log(`[IGMonitor] Replied to comment from @${comment.username}: "${reply.substring(0, 80)}"`);

        try {
          await db.insert(evaMemoriesTable).values({
            memoryType: 'episodic',
            content: `Instagram comment from @${comment.username}: "${comment.text.substring(0, 100)}". I replied: "${reply.substring(0, 100)}"`,
            importance: 0.6,
            embedding: [],
          } as any);
        } catch {}
      } else {
        console.error(`[IGMonitor] Failed to reply to comment:`, replyResult.error);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    return replied;
  } catch (error: any) {
    console.error('[IGMonitor] Comment processing error:', error.message);
    state.errors++;
    state.lastError = error.message;
    return 0;
  }
}

async function pollCycle(): Promise<void> {
  if (!isInstagramConfigured()) return;

  state.lastPollTime = Date.now();
  console.log('[IGMonitor] Polling for new DMs and comments...');

  try {
    const dmCount = await processDMs();
    await new Promise(r => setTimeout(r, 3000));
    const commentCount = await processComments();

    if (dmCount > 0 || commentCount > 0) {
      console.log(`[IGMonitor] Cycle complete: ${dmCount} DM replies, ${commentCount} comment replies`);
    }
  } catch (error: any) {
    console.error('[IGMonitor] Poll cycle error:', error.message);
    state.errors++;
    state.lastError = error.message;
  }
}

export function startInstagramMonitor(getAiState: () => any, intervalMs?: number): void {
  if (pollInterval) {
    clearInterval(pollInterval);
  }

  if (!isInstagramConfigured()) {
    console.log('[IGMonitor] Instagram not configured, monitor not started');
    return;
  }

  getAiStateRef = getAiState;
  state.isRunning = true;
  state.pollIntervalMs = intervalMs || 90000;

  console.log(`[IGMonitor] Starting Instagram monitor (poll every ${state.pollIntervalMs / 1000}s)`);

  setTimeout(() => pollCycle(), 15000);

  pollInterval = setInterval(() => pollCycle(), state.pollIntervalMs);
}

export function stopInstagramMonitor(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  state.isRunning = false;
  console.log('[IGMonitor] Instagram monitor stopped');
}

export function getInstagramMonitorStatus(): MonitorState {
  return { ...state };
}

export function setInstagramMonitorInterval(intervalMs: number): void {
  state.pollIntervalMs = intervalMs;
  if (state.isRunning && getAiStateRef) {
    startInstagramMonitor(getAiStateRef, intervalMs);
  }
}
