import { TwitterApi } from 'twitter-api-v2';

// Initialize Twitter client with credentials (assuming they are set in environment variables or config)
const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY || 'your-app-key',
  appSecret: process.env.TWITTER_APP_SECRET || 'your-app-secret',
  accessToken: process.env.TWITTER_ACCESS_TOKEN || 'your-access-token',
  accessSecret: process.env.TWITTER_ACCESS_SECRET || 'your-access-secret',
});

// Read-only client for public data if needed
const roClient = client.readOnly;

export async function postTweet(message: string, inReplyToStatusId?: string): Promise<{ success: boolean, id?: string, error?: string }> {
  try {
    const params: any = { text: message };
    if (inReplyToStatusId) {
      params.in_reply_to_status_id = inReplyToStatusId;
    }
    const response = await client.v2.tweet(params);
    console.log(`Tweet posted successfully: ${message}`);
    return { success: true, id: response.data.id };
  } catch (error) {
    console.error(`Failed to post tweet: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function sendDirectMessage(recipientId: string, message: string): Promise<{ success: boolean, id?: string, error?: string }> {
  try {
    const response = await client.v1.sendDm({
      recipient_id: recipientId,
      text: message,
    });
    console.log(`DM sent to ${recipientId}: ${message}`);
    return { success: true, id: response.event.id };
  } catch (error) {
    console.error(`Failed to send DM: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function replyToTweet(tweetId: string, message: string): Promise<{ success: boolean, id?: string, error?: string }> {
  try {
    const response = await client.v2.reply(message, tweetId);
    console.log(`Reply posted to tweet ${tweetId}: ${message}`);
    return { success: true, id: response.data.id };
  } catch (error) {
    console.error(`Failed to reply to tweet: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function getUserTimeline(userId: string, maxResults: number = 10): Promise<{ success: boolean, data?: any, error?: string }> {
  try {
    const response = await client.v2.userTimeline(userId, { max_results: maxResults });
    console.log(`Retrieved timeline for user ${userId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Failed to retrieve timeline: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function searchTweets(query: string, maxResults: number = 10): Promise<{ success: boolean, data?: any, error?: string }> {
  try {
    const response = await client.v2.tweetSearchRecent(query, { max_results: maxResults });
    console.log(`Search results for query: ${query}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Failed to search tweets: ${error.message}`);
    return { success: false, error: error.message };
  }
}