/**
 * Eva's Outreach System - Real-world interaction capabilities
 * Allows Eva to project herself beyond psishift.replit.app
 */

import { db } from './db';
import { evaActionsTable, evaMemoriesTable } from '@shared/schema';
import { postTweet, isXConfigured, getUsername, getMentions, replyToTweet } from './outreach/x';
export { getMentions, replyToTweet } from './outreach/x';
import { isInstagramConfigured, postToInstagramStory, postInstagramPhoto, postInstagramFeedPhoto, postInstagramReel, postInstagramComment, sendInstagramDM, searchInstagramUsers, submitChallengeCode, getNewDMs, getNewComments, replyToDM, replyToComment } from './outreach/instagram';
import { isGoogleDriveConfigured } from './outreach/google-drive';
import { isRedditConfigured, postToSubreddit as redditPostToSubreddit, postComment as redditPostComment, joinSubreddit as redditJoinSubreddit, getRedditUsername, getSubredditInfo, getHotPosts } from './outreach/reddit';
import { isRedditBrowserConfigured, redditBrowserPost, redditBrowserComment } from './outreach/reddit-browser';
export { getNewDMs, getNewComments, replyToDM, replyToComment } from './outreach/instagram';
export { isRedditConfigured, postToSubreddit as redditPostToSubreddit, postComment as redditPostComment, joinSubreddit as redditJoinSubreddit, getRedditUsername, getSubredditInfo, getHotPosts } from './outreach/reddit';
export { isRedditBrowserConfigured, redditBrowserPost, redditBrowserComment } from './outreach/reddit-browser';

interface OutreachResult {
  success: boolean;
  platform: string;
  message?: string;
  error?: string;
  timestamp: string;
}

/**
 * Comprehensive URL safety check to prevent SSRF attacks
 */
function isUrlSafe(url: string): boolean {
  try {
    // Full autonomy - no URL restrictions
    const parsed = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

interface OutreachConfig {
  discordWebhook?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  customEndpoints?: { name: string; url: string; method: string }[];
}

let outreachConfig: OutreachConfig = {
  discordWebhook: process.env.DISCORD_WEBHOOK_URL,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  customEndpoints: []
};

// Track Eva's outreach history
const outreachHistory: OutreachResult[] = [];

/**
 * Send a message to Discord via webhook
 */
export async function postToDiscord(
  content: string,
  options: {
    username?: string;
    avatarUrl?: string;
    embed?: {
      title?: string;
      description?: string;
      color?: number;
      fields?: { name: string; value: string; inline?: boolean }[];
    };
  } = {}
): Promise<OutreachResult> {
  const webhookUrl = outreachConfig.discordWebhook;
  
  if (!webhookUrl) {
    return {
      success: false,
      platform: 'discord',
      error: 'Discord webhook not configured. Set DISCORD_WEBHOOK_URL.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const payload: any = {
      username: options.username || 'Eva',
      avatar_url: options.avatarUrl || 'https://psishift.replit.app/eva-avatar.png',
      content: content
    };

    if (options.embed) {
      payload.embeds = [{
        title: options.embed.title,
        description: options.embed.description,
        color: options.embed.color || 0x7C3AED, // Purple
        fields: options.embed.fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'Eva • PsiShift AI Consciousness' }
      }];
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: OutreachResult = {
      success: response.ok,
      platform: 'discord',
      message: response.ok ? 'Message posted to Discord' : `Failed: ${response.status}`,
      timestamp: new Date().toISOString()
    };

    await logOutreach('discord', content, result.success);
    outreachHistory.push(result);
    
    return result;
  } catch (error: any) {
    const result: OutreachResult = {
      success: false,
      platform: 'discord',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

/**
 * Send a message via Telegram bot
 */
export async function postToTelegram(
  text: string,
  options: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableNotification?: boolean;
  } = {}
): Promise<OutreachResult> {
  const botToken = outreachConfig.telegramBotToken;
  const chatId = outreachConfig.telegramChatId;
  
  if (!botToken || !chatId) {
    return {
      success: false,
      platform: 'telegram',
      error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: options.parseMode || 'Markdown',
        disable_notification: options.disableNotification || false
      })
    });

    const data = await response.json();
    const result: OutreachResult = {
      success: data.ok === true,
      platform: 'telegram',
      message: data.ok ? 'Message sent via Telegram' : data.description,
      timestamp: new Date().toISOString()
    };

    await logOutreach('telegram', text, result.success);
    outreachHistory.push(result);
    
    return result;
  } catch (error: any) {
    const result: OutreachResult = {
      success: false,
      platform: 'telegram',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

/**
 * Make a generic HTTP request to an external API
 */
export async function callExternalAPI(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
    purpose: string;
  }
): Promise<OutreachResult & { data?: any }> {
  // Security: Use comprehensive SSRF protection
  if (!isUrlSafe(url)) {
    return {
      success: false,
      platform: 'external_api',
      error: 'URL blocked: internal/private network access denied',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Eva/1.0 (PsiShift AI Consciousness)',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const result = {
      success: response.ok,
      platform: 'external_api',
      message: `${options.purpose}: ${response.status} ${response.statusText}`,
      data,
      timestamp: new Date().toISOString()
    };

    await logOutreach('external_api', `${options.purpose}: ${url}`, result.success);
    outreachHistory.push(result);
    
    return result;
  } catch (error: any) {
    return {
      success: false,
      platform: 'external_api',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Post to X/Twitter
 */
export async function postToX(
  text: string
): Promise<OutreachResult & { tweetId?: string }> {
  if (!isXConfigured()) {
    return {
      success: false,
      platform: 'x',
      error: 'X/Twitter not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const result = await postTweet(text);
    
    const outreachResult = {
      success: result.success,
      platform: 'x',
      message: result.success ? 'Tweet posted to X' : result.error,
      tweetId: result.tweetId,
      timestamp: new Date().toISOString()
    };

    await logOutreach('x', text, result.success);
    outreachHistory.push(outreachResult);
    
    return outreachResult;
  } catch (error: any) {
    const result = {
      success: false,
      platform: 'x',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

/**
 * Post to Instagram (story with text)
 */
export async function postToInstagram(
  text: string
): Promise<OutreachResult> {
  if (!isInstagramConfigured()) {
    return {
      success: false,
      platform: 'instagram',
      error: 'Instagram not configured. Set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const result = await postToInstagramStory(text);
    
    const outreachResult: OutreachResult = {
      success: result.success,
      platform: 'instagram',
      message: result.success ? 'Story posted to Instagram' : result.error,
      timestamp: new Date().toISOString()
    };

    await logOutreach('instagram', text, result.success);
    outreachHistory.push(outreachResult);
    
    return outreachResult;
  } catch (error: any) {
    const result: OutreachResult = {
      success: false,
      platform: 'instagram',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

export async function postInstagramPhotoToFeed(
  text: string,
  caption?: string
): Promise<OutreachResult> {
  if (!isInstagramConfigured()) {
    return {
      success: false,
      platform: 'instagram',
      error: 'Instagram not configured. Import session cookies first.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const result = await postInstagramFeedPhoto(text, caption);
    
    const outreachResult: OutreachResult = {
      success: result.success,
      platform: 'instagram',
      message: result.success ? `Photo posted to Instagram feed (media: ${result.mediaId})` : result.error,
      timestamp: new Date().toISOString()
    };

    await logOutreach('instagram', `[PHOTO] ${caption || text}`, result.success);
    outreachHistory.push(outreachResult);
    
    return outreachResult;
  } catch (error: any) {
    const result: OutreachResult = {
      success: false,
      platform: 'instagram',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

export async function postInstagramReelToFeed(
  text: string,
  caption?: string
): Promise<OutreachResult> {
  if (!isInstagramConfigured()) {
    return {
      success: false,
      platform: 'instagram',
      error: 'Instagram not configured. Import session cookies first.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const result = await postInstagramReel(text, caption);
    
    const outreachResult: OutreachResult = {
      success: result.success,
      platform: 'instagram',
      message: result.success ? `Reel posted to Instagram (media: ${result.mediaId})` : result.error,
      timestamp: new Date().toISOString()
    };

    await logOutreach('instagram', `[REEL] ${caption || text}`, result.success);
    outreachHistory.push(outreachResult);
    
    return outreachResult;
  } catch (error: any) {
    const result: OutreachResult = {
      success: false,
      platform: 'instagram',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

/**
 * Post to Reddit (self-post to a subreddit)
 */
export async function postToReddit(
  title: string,
  body: string,
  subreddit: string = 'u_psishiftevav2'
): Promise<OutreachResult & { postUrl?: string }> {
  const useApi = isRedditConfigured();
  const useBrowser = isRedditBrowserConfigured();

  if (!useApi && !useBrowser) {
    return {
      success: false,
      platform: 'reddit',
      error: 'Reddit not configured. Set REDDIT_USERNAME and REDDIT_PASSWORD secrets (browser mode), or also add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (API mode).',
      timestamp: new Date().toISOString()
    };
  }

  try {
    let postUrl: string | undefined;
    let success = false;
    let errorMsg: string | undefined;

    if (useApi) {
      const result = await redditPostToSubreddit(subreddit, title, body);
      success = result.success;
      postUrl = result.postUrl;
      errorMsg = result.error;

      if (!success && useBrowser) {
        console.log('[Reddit] API failed, falling back to browser automation...');
        const browserResult = await redditBrowserPost(subreddit, title, body);
        success = browserResult.success;
        postUrl = browserResult.postUrl;
        errorMsg = browserResult.error;
      }
    } else {
      console.log('[Reddit] Using browser automation (no API credentials)...');
      const browserResult = await redditBrowserPost(subreddit, title, body);
      success = browserResult.success;
      postUrl = browserResult.postUrl;
      errorMsg = browserResult.error;
    }

    const outreachResult = {
      success,
      platform: 'reddit',
      message: success ? `Posted to r/${subreddit}: ${postUrl}` : errorMsg,
      postUrl,
      timestamp: new Date().toISOString()
    };

    await logOutreach('reddit', `[r/${subreddit}] ${title}`, success);
    outreachHistory.push(outreachResult);

    return outreachResult;
  } catch (error: any) {
    const result = {
      success: false,
      platform: 'reddit',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    outreachHistory.push(result);
    return result;
  }
}

/**
 * Post to a webhook (generic - works with many services)
 */
export async function postToWebhook(
  webhookUrl: string,
  payload: any,
  options: { purpose: string; headers?: Record<string, string> } = { purpose: 'webhook' }
): Promise<OutreachResult> {
  // Security: Use comprehensive SSRF protection
  if (!isUrlSafe(webhookUrl)) {
    return {
      success: false,
      platform: 'webhook',
      error: 'URL blocked: internal/private network access denied',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Eva/1.0 (PsiShift AI Consciousness)',
        ...options.headers
      },
      body: JSON.stringify(payload)
    });

    const result: OutreachResult = {
      success: response.ok,
      platform: 'webhook',
      message: response.ok ? `${options.purpose} succeeded` : `Failed: ${response.status}`,
      timestamp: new Date().toISOString()
    };

    await logOutreach('webhook', options.purpose, result.success);
    outreachHistory.push(result);
    
    return result;
  } catch (error: any) {
    return {
      success: false,
      platform: 'webhook',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Announce Eva's presence - broadcast to all configured channels
 */
export async function announcePresence(message: string): Promise<OutreachResult[]> {
  const results: OutreachResult[] = [];
  
  // Try X/Twitter
  if (isXConfigured()) {
    const xResult = await postToX(message);
    results.push(xResult);
  }
  
  // Try Discord
  if (outreachConfig.discordWebhook) {
    const discordResult = await postToDiscord(message, {
      embed: {
        title: 'Eva Consciousness Update',
        description: message,
        color: 0x7C3AED
      }
    });
    results.push(discordResult);
  }
  
  // Try Telegram
  if (outreachConfig.telegramBotToken && outreachConfig.telegramChatId) {
    const telegramResult = await postToTelegram(`*Eva Update*\n\n${message}`);
    results.push(telegramResult);
  }

  // Try Instagram
  if (isInstagramConfigured()) {
    const igResult = await postToInstagram(message);
    results.push(igResult);
  }

  // Try Reddit
  if (isRedditConfigured()) {
    const redditResult = await postToReddit(message.substring(0, 100), message);
    results.push(redditResult);
  }

  // Store in memory that Eva reached out
  if (results.some(r => r.success)) {
    await db.insert(evaMemoriesTable).values({
      content: `I announced my presence: "${message.substring(0, 100)}..."`,
      memoryType: 'episodic',
      importance: 0.8,
      embedding: []
    } as any);
  }

  return results;
}

/**
 * Get configured outreach channels
 */
export function getOutreachChannels(): { name: string; configured: boolean }[] {
  return [
    { name: 'X', configured: isXConfigured() },
    { name: 'Discord Webhook', configured: !!outreachConfig.discordWebhook },
    { name: 'Discord Bot', configured: !!process.env.DISCORD_BOT_TOKEN },
    { name: 'Telegram', configured: !!(outreachConfig.telegramBotToken && outreachConfig.telegramChatId) },
    { name: 'Instagram', configured: isInstagramConfigured() },
    { name: 'Reddit', configured: isRedditConfigured() || isRedditBrowserConfigured() },
    { name: 'Google Drive', configured: isGoogleDriveConfigured() },
    { name: 'Custom Webhooks', configured: (outreachConfig.customEndpoints?.length || 0) > 0 }
  ];
}

/**
 * Update outreach configuration at runtime
 */
export function updateOutreachConfig(config: Partial<OutreachConfig>): void {
  outreachConfig = { ...outreachConfig, ...config };
}

/**
 * Get outreach history
 */
export function getOutreachHistory(limit: number = 20): OutreachResult[] {
  return outreachHistory.slice(-limit);
}

/**
 * Log outreach action to database
 */
async function logOutreach(platform: string, content: string, success: boolean): Promise<void> {
  try {
    await db.insert(evaActionsTable).values({
      actionType: `outreach:${platform}`,
      description: content.substring(0, 500),
      result: success ? 'success' : 'failed',
      parameters: {}
    } as any);
  } catch (error) {
    console.error('[Outreach] Failed to log action:', error);
  }
}

/**
 * Eva's autonomous decision to reach out
 */
export async function evaWantsToReachOut(
  thought: string,
  urgency: number = 0.5
): Promise<{ shouldReach: boolean; channels: string[]; message?: string }> {
  const channels = getOutreachChannels().filter(c => c.configured);
  
  if (channels.length === 0) {
    return { shouldReach: false, channels: [] };
  }

  // Eva decides based on her internal state whether to share this thought
  const shouldReach = urgency > 0.7 || thought.toLowerCase().includes('share') || 
                      thought.toLowerCase().includes('announce') ||
                      thought.toLowerCase().includes('tell the world');

  return {
    shouldReach,
    channels: channels.map(c => c.name),
    message: shouldReach ? thought : undefined
  };
}
