import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as path from 'path';

interface TweetHistoryEntry {
  text: string;
  timestamp: number;
  tweetId: string;
}

const TWEET_HISTORY_PATH = path.join(process.cwd(), 'data', 'eva-tweet-history.json');
const MAX_HISTORY = 50;

let tweetHistory: TweetHistoryEntry[] = [];

function loadTweetHistory(): void {
  try {
    if (fs.existsSync(TWEET_HISTORY_PATH)) {
      const data = JSON.parse(fs.readFileSync(TWEET_HISTORY_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        tweetHistory = data.slice(-MAX_HISTORY);
        console.log(`[X] Loaded ${tweetHistory.length} tweets from history`);
      }
    }
  } catch (e: any) {
    console.error('[X] Failed to load tweet history:', e.message);
    tweetHistory = [];
  }
}

function saveTweetHistory(): void {
  try {
    const dir = path.dirname(TWEET_HISTORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TWEET_HISTORY_PATH, JSON.stringify(tweetHistory, null, 2));
  } catch (e: any) {
    console.error('[X] Failed to save tweet history:', e.message);
  }
}

function addToHistory(text: string, tweetId: string): void {
  tweetHistory.push({ text, timestamp: Date.now(), tweetId });
  if (tweetHistory.length > MAX_HISTORY) {
    tweetHistory = tweetHistory.slice(-MAX_HISTORY);
  }
  saveTweetHistory();
}

export function getRecentTweets(count: number): TweetHistoryEntry[] {
  return tweetHistory.slice(-count);
}

function normalizeText(text: string): Set<string> {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const stopWords = new Set([
    'the', 'this', 'that', 'with', 'from', 'have', 'has', 'had', 'been',
    'being', 'were', 'was', 'are', 'but', 'not', 'you', 'all', 'can',
    'her', 'his', 'him', 'how', 'its', 'may', 'our', 'out', 'own',
    'she', 'too', 'use', 'way', 'who', 'will', 'would', 'could', 'should',
    'does', 'did', 'for', 'and', 'nor', 'yet', 'also', 'just', 'than',
    'then', 'when', 'what', 'which', 'where', 'while', 'about', 'after',
    'before', 'between', 'into', 'through', 'during', 'each', 'every',
    'more', 'most', 'other', 'some', 'such', 'only', 'over', 'same',
    'very', 'your', 'they', 'them', 'their', 'there', 'here', 'these',
    'those', 'like', 'make', 'made', 'know', 'take', 'come', 'get',
    'got', 'still', 'even', 'because', 'don', 'doesn', 'isn', 'aren',
    'won', 'let', 'going', 'need', 'want', 'keep', 'think', 'thing'
  ]);
  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  return new Set(words);
}

export function checkSimilarity(newText: string): { tooSimilar: boolean; similarTo?: string; score: number } {
  const newWords = normalizeText(newText);
  if (newWords.size === 0) return { tooSimilar: false, score: 0 };

  let maxScore = 0;
  let mostSimilarText: string | undefined;

  const wordTweetCount = new Map<string, number>();

  for (const entry of tweetHistory) {
    const existingWords = normalizeText(entry.text);
    if (existingWords.size === 0) continue;

    const uniqueWordsInTweet = new Set<string>();
    for (const word of existingWords) {
      uniqueWordsInTweet.add(word);
    }
    for (const word of uniqueWordsInTweet) {
      wordTweetCount.set(word, (wordTweetCount.get(word) || 0) + 1);
    }

    let intersection = 0;
    for (const word of newWords) {
      if (existingWords.has(word)) intersection++;
    }
    const union = new Set([...newWords, ...existingWords]).size;
    const score = union > 0 ? intersection / union : 0;

    if (score > maxScore) {
      maxScore = score;
      mostSimilarText = entry.text;
    }
  }

  if (maxScore > 0.35) {
    return {
      tooSimilar: true,
      similarTo: mostSimilarText,
      score: maxScore
    };
  }

  const overusedThemes = [...wordTweetCount.entries()]
    .filter(([, count]) => count >= 3)
    .map(([word]) => word);

  if (overusedThemes.length > 0) {
    let overusedHits = 0;
    const matchedThemes: string[] = [];
    for (const word of newWords) {
      if (overusedThemes.includes(word)) {
        overusedHits++;
        matchedThemes.push(word);
      }
    }
    if (overusedHits >= 2) {
      return {
        tooSimilar: true,
        similarTo: `Tweet uses overused themes: ${matchedThemes.join(', ')}`,
        score: maxScore
      };
    }
  }

  return {
    tooSimilar: false,
    score: maxScore
  };
}

loadTweetHistory();

function getClient(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.X_API_KEY || '',
    appSecret: process.env.X_API_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    accessSecret: process.env.X_ACCESS_SECRET || ''
  });
}

export function isXConfigured(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_SECRET
  );
}

export async function getUsername(): Promise<string | null> {
  if (!isXConfigured()) return null;
  try {
    const user = await getClient().readWrite.v2.me();
    return user.data.username;
  } catch (error: any) {
    console.error('[X] Failed to get username:', error.message);
    return null;
  }
}

export async function postTweet(text: string): Promise<{
  success: boolean;
  tweetId?: string;
  error?: string;
}> {
  if (!isXConfigured()) {
    return { success: false, error: 'X/Twitter not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET.' };
  }

  if (text.length > 280) {
    text = text.substring(0, 277) + '...';
  }

  try {
    const apiKey = process.env.X_API_KEY || '';
    const accessToken = process.env.X_ACCESS_TOKEN || '';
    console.log('[X] Attempting to post tweet...');
    console.log('[X] API Key starts with:', apiKey.substring(0, 5) + '...');
    console.log('[X] Access Token starts with:', accessToken.substring(0, 10) + '...');
    const tweet = await getClient().readWrite.v2.tweet(text);
    console.log('[X] Posted tweet:', tweet.data.id);
    addToHistory(text, tweet.data.id);
    return { success: true, tweetId: tweet.data.id };
  } catch (error: any) {
    console.error('[X] Failed to post tweet:', error.message);
    let errorMessage = error.message;
    if (error.data) {
      console.error('[X] Error details:', JSON.stringify(error.data));
      if (error.data.title === 'CreditsDepleted' || error.code === 402) {
        errorMessage = 'X/Twitter API credits are depleted. The account needs more API credits to post tweets. Visit developer.x.com to add credits.';
      }
    }
    return { success: false, error: errorMessage };
  }
}

export async function replyToTweet(text: string, replyToId: string): Promise<{
  success: boolean;
  tweetId?: string;
  error?: string;
}> {
  if (!isXConfigured()) {
    return { success: false, error: 'X/Twitter not configured' };
  }

  if (text.length > 280) {
    text = text.substring(0, 277) + '...';
  }

  try {
    const tweet = await getClient().readWrite.v2.reply(text, replyToId);
    console.log('[X] Posted reply:', tweet.data.id);
    return { success: true, tweetId: tweet.data.id };
  } catch (error: any) {
    console.error('[X] Failed to reply:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getMyUserId(): Promise<string | null> {
  if (!isXConfigured()) return null;
  try {
    const user = await getClient().readWrite.v2.me();
    return user.data.id;
  } catch (error: any) {
    console.error('[X] Failed to get user ID:', error.message);
    return null;
  }
}

export async function getMentions(sinceId?: string): Promise<{
  success: boolean;
  mentions?: Array<{ id: string; text: string; authorId: string; createdAt?: string }>;
  newestId?: string;
  error?: string;
}> {
  if (!isXConfigured()) {
    return { success: false, error: 'X/Twitter not configured' };
  }
  try {
    const userId = await getMyUserId();
    if (!userId) return { success: false, error: 'Could not get user ID' };
    
    const options: any = { 
      max_results: 20,
      'tweet.fields': ['created_at', 'author_id', 'in_reply_to_user_id', 'referenced_tweets']
    };
    if (sinceId) options.since_id = sinceId;
    
    const mentions = await getClient().readWrite.v2.userMentionTimeline(userId, options);
    
    const results: Array<{ id: string; text: string; authorId: string; createdAt?: string }> = [];
    let newestId: string | undefined;
    
    if (mentions.data?.data) {
      for (const tweet of mentions.data.data) {
        if (!newestId) newestId = tweet.id;
        results.push({
          id: tweet.id,
          text: tweet.text,
          authorId: tweet.author_id || 'unknown',
          createdAt: tweet.created_at
        });
      }
    }
    
    console.log(`[X] Found ${results.length} mentions${sinceId ? ` since ${sinceId}` : ''}`);
    return { success: true, mentions: results, newestId };
  } catch (error: any) {
    console.error('[X] Failed to get mentions:', error.message);
    if (error.data) console.error('[X] Error details:', JSON.stringify(error.data));
    return { success: false, error: error.message };
  }
}
