import { promises as fs } from 'fs';
import path from 'path';

const REDDIT_USER_AGENT = 'EvaConsciousness/1.0 (by /u/psishiftevav2)';
const TOKEN_FILE = '.reddit-token.json';

interface RedditToken {
  access_token: string;
  token_type: string;
  expires_at: number;
  scope: string;
}

let cachedToken: RedditToken | null = null;

function getRedditCredentials() {
  return {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    username: process.env.REDDIT_USERNAME || '',
    password: process.env.REDDIT_PASSWORD || '',
  };
}

export function isRedditConfigured(): boolean {
  const creds = getRedditCredentials();
  return !!(creds.clientId && creds.clientSecret && creds.username && creds.password);
}

async function loadCachedToken(): Promise<RedditToken | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, 'utf-8');
    const token = JSON.parse(data) as RedditToken;
    if (token.expires_at > Date.now() + 60000) {
      return token;
    }
  } catch {}
  return null;
}

async function saveCachedToken(token: RedditToken): Promise<void> {
  try {
    await fs.writeFile(TOKEN_FILE, JSON.stringify(token), 'utf-8');
  } catch {}
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token;
  }

  const fromFile = await loadCachedToken();
  if (fromFile) {
    cachedToken = fromFile;
    return fromFile.access_token;
  }

  const creds = getRedditCredentials();
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error('Reddit credentials not configured');
  }

  const auth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: creds.username,
      password: creds.password,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reddit auth failed (${response.status}): ${text}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`Reddit auth error: ${data.error}`);
  }

  cachedToken = {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_at: Date.now() + (data.expires_in * 1000),
    scope: data.scope,
  };

  await saveCachedToken(cachedToken);
  return cachedToken.access_token;
}

async function redditApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, string>
): Promise<any> {
  const token = await getAccessToken();
  const url = `https://oauth.reddit.com${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': REDDIT_USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Reddit API error (${response.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

export interface RedditPostResult {
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

export async function postToSubreddit(
  subreddit: string,
  title: string,
  body: string,
  options: { kind?: 'self' | 'link'; url?: string; flair_id?: string; flair_text?: string } = {}
): Promise<RedditPostResult> {
  if (!isRedditConfigured()) {
    return { success: false, error: 'Reddit not configured. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD.' };
  }

  try {
    const sub = subreddit.replace(/^r\//, '').replace(/^\/r\//, '');
    const kind = options.kind || 'self';

    const postData: Record<string, string> = {
      sr: sub,
      title: title,
      kind: kind,
      resubmit: 'true',
      send_replies: 'true',
    };

    if (kind === 'self') {
      postData.text = body;
    } else if (kind === 'link' && options.url) {
      postData.url = options.url;
    }

    if (options.flair_id) postData.flair_id = options.flair_id;
    if (options.flair_text) postData.flair_text = options.flair_text;

    const result = await redditApiRequest('/api/submit', 'POST', postData);

    if (result.json?.errors?.length > 0) {
      const errors = result.json.errors.map((e: any[]) => e.join(': ')).join('; ');
      return { success: false, error: `Reddit submission errors: ${errors}` };
    }

    const postUrl = result.json?.data?.url || '';
    const postId = result.json?.data?.id || '';

    console.log(`[Reddit] Posted to r/${sub}: ${postUrl}`);
    return { success: true, postUrl, postId };
  } catch (error: any) {
    console.error('[Reddit] Post error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function postComment(
  thingId: string,
  text: string
): Promise<RedditPostResult> {
  if (!isRedditConfigured()) {
    return { success: false, error: 'Reddit not configured.' };
  }

  try {
    const result = await redditApiRequest('/api/comment', 'POST', {
      thing_id: thingId,
      text: text,
    });

    if (result.json?.errors?.length > 0) {
      const errors = result.json.errors.map((e: any[]) => e.join(': ')).join('; ');
      return { success: false, error: `Comment errors: ${errors}` };
    }

    const commentData = result.json?.data?.things?.[0]?.data;
    console.log('[Reddit] Comment posted successfully');
    return { success: true, postId: commentData?.id };
  } catch (error: any) {
    console.error('[Reddit] Comment error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function joinSubreddit(subreddit: string): Promise<{ success: boolean; error?: string }> {
  if (!isRedditConfigured()) {
    return { success: false, error: 'Reddit not configured.' };
  }

  try {
    const sub = subreddit.replace(/^r\//, '').replace(/^\/r\//, '');
    await redditApiRequest('/api/subscribe', 'POST', {
      action: 'sub',
      sr_name: sub,
    });
    console.log(`[Reddit] Joined r/${sub}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRedditUsername(): Promise<{ success: boolean; username?: string; error?: string }> {
  if (!isRedditConfigured()) {
    return { success: false, error: 'Reddit not configured.' };
  }

  try {
    const data = await redditApiRequest('/api/v1/me');
    return { success: true, username: data.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSubredditInfo(subreddit: string): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!isRedditConfigured()) {
    return { success: false, error: 'Reddit not configured.' };
  }

  try {
    const sub = subreddit.replace(/^r\//, '').replace(/^\/r\//, '');
    const data = await redditApiRequest(`/r/${sub}/about`);
    return {
      success: true,
      data: {
        name: data.data?.display_name,
        title: data.data?.title,
        subscribers: data.data?.subscribers,
        description: data.data?.public_description,
        allowSelfPosts: data.data?.submission_type !== 'link',
        allowLinks: data.data?.submission_type !== 'self',
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHotPosts(
  subreddit: string,
  limit: number = 10
): Promise<{ success: boolean; posts?: any[]; error?: string }> {
  if (!isRedditConfigured()) {
    return { success: false, error: 'Reddit not configured.' };
  }

  try {
    const sub = subreddit.replace(/^r\//, '').replace(/^\/r\//, '');
    const data = await redditApiRequest(`/r/${sub}/hot?limit=${limit}`);
    const posts = data.data?.children?.map((child: any) => ({
      id: child.data.id,
      fullname: child.data.name,
      title: child.data.title,
      author: child.data.author,
      score: child.data.score,
      numComments: child.data.num_comments,
      url: child.data.url,
      permalink: `https://reddit.com${child.data.permalink}`,
      selftext: child.data.selftext?.substring(0, 500),
      created: new Date(child.data.created_utc * 1000).toISOString(),
    })) || [];
    return { success: true, posts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
