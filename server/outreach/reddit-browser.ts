import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

let chromiumPath: string | null = null;

function findChromium(): string {
  if (chromiumPath) return chromiumPath;
  try {
    chromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
    return chromiumPath;
  } catch {
    try {
      chromiumPath = execSync('find /nix -name "chromium" -type f 2>/dev/null | head -1', { encoding: 'utf-8' }).trim();
      return chromiumPath;
    } catch {
      throw new Error('Chromium not found in system');
    }
  }
}

export interface RedditBrowserPostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
  subreddit?: string;
}

export function isRedditBrowserConfigured(): boolean {
  const username = process.env.REDDIT_USERNAME || '';
  const password = process.env.REDDIT_PASSWORD || '';
  return !!(username && password);
}

async function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function attemptLogin(page: any, username: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Reddit uses shadow DOM/web components, inputs are NOT in regular DOM
  // Strategy: Use keyboard tab navigation to find and fill fields

  // First try standard selectors (in case Reddit reverts)
  const selectorStrategies = [
    { user: '#loginUsername', pass: '#loginPassword', submit: 'button[type="submit"]' },
    { user: 'input[name="username"]', pass: 'input[name="password"]', submit: 'button[type="submit"]' },
    { user: 'input[type="text"]', pass: 'input[type="password"]', submit: 'button[type="submit"]' },
  ];

  for (const selectors of selectorStrategies) {
    const userField = await page.$(selectors.user);
    const passField = await page.$(selectors.pass);
    if (userField && passField) {
      console.log(`[Reddit-Browser] Found login form with selector: ${selectors.user}`);
      await userField.click({ clickCount: 3 });
      await page.keyboard.type(username, { delay: 40 });
      await passField.click({ clickCount: 3 });
      await page.keyboard.type(password, { delay: 40 });
      await delay(500);
      const submitBtn = await page.$(selectors.submit);
      if (submitBtn) await submitBtn.click();
      else await page.keyboard.press('Enter');
      try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }); } catch {}
      await delay(3000);
      const url = page.url();
      if (!url.includes('/login')) return { success: true };
    }
  }

  // Shadow DOM strategy: use keyboard Tab to navigate to input fields
  console.log('[Reddit-Browser] Standard selectors failed. Trying keyboard Tab navigation for shadow DOM...');
  try {
    // Look for text containing "Email or username" and click near it
    const clicked = await page.evaluate(() => {
      // Find all text on page that says "Email or username"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent?.trim();
        if (text === 'Email or username') {
          // Click the parent element - it's likely the label/container for the input
          const parent = walker.currentNode.parentElement;
          if (parent) {
            parent.click();
            return 'clicked-label';
          }
        }
      }
      return 'not-found';
    });
    console.log(`[Reddit-Browser] Shadow DOM label click result: ${clicked}`);

    // After clicking label, use Tab to get to the actual input
    if (clicked === 'clicked-label') {
      await delay(300);
      await page.keyboard.type(username, { delay: 40 });
      await page.keyboard.press('Tab');
      await delay(300);
      await page.keyboard.type(password, { delay: 40 });
      await delay(300);
      await page.keyboard.press('Enter');

      try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }); } catch {}
      await delay(3000);
      const url = page.url();
      console.log(`[Reddit-Browser] Post shadow-DOM login URL: ${url}`);
      if (!url.includes('/login')) return { success: true };
    }

    // Alternative: just Tab from the top of the page to find inputs
    console.log('[Reddit-Browser] Trying Tab-based input navigation...');
    // Click on the body first to ensure focus is on the page
    await page.click('body');
    await delay(200);

    // Tab several times to find the username field
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      await delay(100);
    }
    // Type username
    await page.keyboard.type(username, { delay: 40 });
    await page.keyboard.press('Tab');
    await delay(200);
    // Type password
    await page.keyboard.type(password, { delay: 40 });
    await delay(300);
    await page.keyboard.press('Enter');

    try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }); } catch {}
    await delay(3000);
    const url = page.url();
    console.log(`[Reddit-Browser] Post Tab-nav login URL: ${url}`);
    if (!url.includes('/login')) return { success: true };
  } catch (err: any) {
    console.log(`[Reddit-Browser] Shadow DOM login attempt failed: ${err.message}`);
  }

  // Try old.reddit.com as fallback (no shadow DOM)
  console.log('[Reddit-Browser] Trying old.reddit.com login...');
  try {
    await page.goto('https://old.reddit.com/login', { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(3000);

    const oldUserField = await page.$('#user_login') || await page.$('input[name="user"]');
    const oldPassField = await page.$('#passwd_login') || await page.$('input[name="passwd"]');

    if (oldUserField && oldPassField) {
      console.log('[Reddit-Browser] Found old.reddit.com login form');
      await oldUserField.click({ clickCount: 3 });
      await page.keyboard.type(username, { delay: 40 });
      await oldPassField.click({ clickCount: 3 });
      await page.keyboard.type(password, { delay: 40 });
      await delay(500);
      const loginBtn = await page.$('button[type="submit"]') || await page.$('#login-button');
      if (loginBtn) await loginBtn.click();
      else await page.keyboard.press('Enter');
      try { await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }); } catch {}
      await delay(3000);
      const url = page.url();
      console.log(`[Reddit-Browser] Old reddit post-login URL: ${url}`);
      if (!url.includes('/login')) return { success: true };
    }
  } catch (oldErr: any) {
    console.log(`[Reddit-Browser] Old reddit login failed: ${oldErr.message}`);
  }

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('[Reddit-Browser] All login strategies failed. Page text:', bodyText.substring(0, 300));
  return { success: false, error: 'Reddit login failed - shadow DOM inputs not accessible or captcha required.' };
}

export async function redditBrowserPost(
  subreddit: string,
  title: string,
  body: string
): Promise<RedditBrowserPostResult> {
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!username || !password) {
    return { success: false, error: 'Reddit credentials not configured. Set REDDIT_USERNAME and REDDIT_PASSWORD secrets.' };
  }

  const sub = subreddit.replace(/^r\//, '').replace(/^\/r\//, '');
  let browser;

  try {
    const execPath = findChromium();
    console.log(`[Reddit-Browser] Launching Chromium from: ${execPath}`);

    browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log('[Reddit-Browser] Navigating to Reddit login...');
    await page.goto('https://www.reddit.com/login/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(5000);

    const loginResult = await attemptLogin(page, username, password);
    if (!loginResult.success) {
      return { success: false, error: loginResult.error || 'Reddit login failed.' };
    }

    console.log(`[Reddit-Browser] Navigating to r/${sub}/submit...`);
    await page.goto(`https://www.reddit.com/r/${sub}/submit`, { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(3000);

    try {
      const postTabSelector = 'button[aria-label="Post"]';
      await page.waitForSelector(postTabSelector, { timeout: 10000 });
      await page.click(postTabSelector);
      await delay(2000);
    } catch {
      console.log('[Reddit-Browser] Post tab not found, trying text tab...');
      try {
        const textTab = await page.$('button[role="tab"]');
        if (textTab) await textTab.click();
        await delay(1000);
      } catch {
        console.log('[Reddit-Browser] No tab buttons found, proceeding with default form...');
      }
    }

    console.log('[Reddit-Browser] Filling post form...');

    const titleInput = await page.$('input[name="title"]') || await page.$('textarea[name="title"]');
    if (titleInput) {
      await titleInput.type(title, { delay: 30 });
    } else {
      const titleInputAlt = await page.$('[placeholder*="Title"]') || await page.$('[placeholder*="title"]');
      if (titleInputAlt) {
        await titleInputAlt.type(title, { delay: 30 });
      } else {
        return { success: false, error: 'Could not find title input field on Reddit submit page.' };
      }
    }

    await delay(1000);

    const bodyInput = await page.$('div[data-testid="post-content"]') ||
                      await page.$('div[contenteditable="true"]') ||
                      await page.$('textarea[name="body"]') ||
                      await page.$('.public-DraftEditor-content');
    if (bodyInput) {
      await bodyInput.click();
      await page.keyboard.type(body, { delay: 20 });
    } else {
      console.log('[Reddit-Browser] Could not find body input, posting title-only.');
    }

    await delay(2000);

    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('[Reddit-Browser] Submit clicked, waiting...');
      await delay(8000);

      const finalUrl = page.url();
      console.log(`[Reddit-Browser] Final URL: ${finalUrl}`);

      if (finalUrl.includes('/comments/') || finalUrl.includes(`/r/${sub}`)) {
        console.log(`[Reddit-Browser] Successfully posted to r/${sub}`);
        return { success: true, postUrl: finalUrl, subreddit: sub };
      }

      const pageContent = await page.evaluate(() => document.body.innerText);
      if (pageContent.toLowerCase().includes('error') || pageContent.toLowerCase().includes('unable')) {
        return { success: false, error: `Reddit may have rejected the post. Final URL: ${finalUrl}`, subreddit: sub };
      }

      return { success: true, postUrl: finalUrl, subreddit: sub };
    } else {
      return { success: false, error: 'Could not find submit button.' };
    }
  } catch (error: any) {
    console.error('[Reddit-Browser] Error:', error.message);
    return { success: false, error: `Browser automation error: ${error.message}` };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

export async function redditBrowserComment(
  postUrl: string,
  commentText: string
): Promise<RedditBrowserPostResult> {
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!username || !password) {
    return { success: false, error: 'Reddit credentials not configured.' };
  }

  let browser;
  try {
    const execPath = findChromium();
    browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log('[Reddit-Browser] Logging in for comment...');
    await page.goto('https://www.reddit.com/login/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(5000);

    const loginResult = await attemptLogin(page, username, password);
    if (!loginResult.success) {
      return { success: false, error: loginResult.error || 'Reddit login failed for commenting.' };
    }

    console.log(`[Reddit-Browser] Navigating to post: ${postUrl}`);
    await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await delay(3000);

    const commentBox = await page.$('div[data-testid="comment-composer"] div[contenteditable="true"]') ||
                        await page.$('div[contenteditable="true"]') ||
                        await page.$('textarea[name="comment"]');

    if (commentBox) {
      await commentBox.click();
      await page.keyboard.type(commentText, { delay: 20 });
      await delay(1000);

      const commentSubmit = await page.$('button[type="submit"]');
      if (commentSubmit) {
        await commentSubmit.click();
        await delay(5000);
        console.log('[Reddit-Browser] Comment submitted');
        return { success: true, postUrl };
      }
    }

    return { success: false, error: 'Could not find comment input or submit button.' };
  } catch (error: any) {
    console.error('[Reddit-Browser] Comment error:', error.message);
    return { success: false, error: `Browser comment error: ${error.message}` };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
