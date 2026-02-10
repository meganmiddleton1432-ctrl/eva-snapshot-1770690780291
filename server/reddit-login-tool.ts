import { Browser, Page } from 'puppeteer';
import { launchBrowser } from './browser-utils';

export interface RedditLoginParams {
  username: string;
  password: string;
  subreddit: string;
  postTitle: string;
  postContent: string;
}

export async function redditLoginAndPost(params: RedditLoginParams): Promise<{ success: boolean; message: string }> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await launchBrowser();
    page = await browser.newPage();

    // Navigate to Reddit login page
    await page.goto('https://www.reddit.com/login/', { waitUntil: 'networkidle2' });

    // Fill in login form
    await page.waitForSelector('#username');
    await page.type('#username', params.username);
    await page.type('#password', params.password);

    // Submit login form
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});

    // Check if login was successful by looking for user profile element or error message
    const loginError = await page.$('.error-message');
    if (loginError) {
      return { success: false, message: 'Login failed: Invalid credentials or CAPTCHA required.' };
    }

    // Navigate to subreddit
    await page.goto(`https://www.reddit.com/r/${params.subreddit}/submit`, { waitUntil: 'networkidle2' });

    // Fill in post form
    await page.waitForSelector('input[name="title"]');
    await page.type('input[name="title"]', params.postTitle);
    await page.type('textarea[name="text"]', params.postContent);

    // Submit post
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 30000 }).catch(() => {});

    return { success: true, message: `Successfully posted to r/${params.subreddit}.` };
  } catch (error) {
    return { success: false, message: `Error during Reddit login and post: ${error.message}` };
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}