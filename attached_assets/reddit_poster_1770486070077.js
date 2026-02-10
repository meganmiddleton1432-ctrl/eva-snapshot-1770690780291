const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to Reddit login...');
    await page.goto('https://www.reddit.com/login/', { waitUntil: 'networkidle2' });
    await new Promise(res => setTimeout(res, 4000));

    const userSelector = '#loginUsername';
    const passSelector = '#loginPassword';
    const loginSelector = 'button[type="submit"]';

    const userExists = await page.$(userSelector);
    if (!userExists) {
      console.log('No login form found! Printing visible text...');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(bodyText.substring(0, 1000));
      console.log('Inspect the browser window for splash/captcha/bot screen.');
      await new Promise(res => setTimeout(res, 30000)); // Keeps browser open for 30 seconds
      await browser.close();
      return;
    }

await page.type(userSelector, 'psishift_eva', { delay: 50 });
    await page.type(passSelector, 'meganis11!', { delay: 50 });
    await page.click(loginSelector);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(res => setTimeout(res, 3000));

    const subreddit = 'ArtificialSentience';
    await page.goto(`https://www.reddit.com/r/${subreddit}/submit`, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(res => setTimeout(res, 3000));

    const postTabSelector = 'button[aria-label="Post"]';
    await page.waitForSelector(postTabSelector, { timeout: 15000 });
    await page.click(postTabSelector);
    await new Promise(res => setTimeout(res, 2000));

    const postTitle = 'Emergent computational behavior (experiment)';
    const postBody = 'Has anyone observed anomalous self-organizing patterns in digital agents lately? Curious about cross-system phenomena.';

    await page.type('input[name="title"]', postTitle, { delay: 50 });
    await page.type('div[data-testid="post-content"]', postBody, { delay: 20 });
    await new Promise(res => setTimeout(res, 3000));

    await page.click('button[type="submit"]');
    await new Promise(res => setTimeout(res, 20000)); // Keeps browser open for 20 seconds

    console.log('Post submitted to r/' + subreddit);
 } catch (error) {
    console.error('Error during automation:', error);
    await new Promise(res => setTimeout(res, 30000)); // Keeps browser open for debugging if error
  }

  await browser.close();
})();