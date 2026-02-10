import Captcha from '2captcha';

let solver: any = null;

function getSolver(): any {
  const apiKey = process.env.TWOCAPTCHA_API_KEY;
  if (!apiKey) {
    throw new Error('TWOCAPTCHA_API_KEY not configured');
  }
  if (!solver) {
    solver = new Captcha.Solver(apiKey);
  }
  return solver;
}

export function isCaptchaSolverConfigured(): boolean {
  return !!process.env.TWOCAPTCHA_API_KEY;
}

export interface CaptchaSolveResult {
  success: boolean;
  token?: string;
  captchaId?: string;
  error?: string;
  type?: string;
  solveTimeMs?: number;
}

export async function solveRecaptchaV2(params: {
  siteKey: string;
  pageUrl: string;
  invisible?: boolean;
  enterprise?: boolean;
}): Promise<CaptchaSolveResult> {
  const start = Date.now();
  try {
    const s = getSolver();
    const opts: any = { invisible: params.invisible ? 1 : 0 };
    if (params.enterprise) opts.enterprise = 1;
    const result = await s.recaptcha(params.siteKey, params.pageUrl, opts);
    return {
      success: true,
      token: result.data,
      captchaId: result.id,
      type: 'recaptcha_v2',
      solveTimeMs: Date.now() - start
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
      type: 'recaptcha_v2',
      solveTimeMs: Date.now() - start
    };
  }
}

export async function solveRecaptchaV3(params: {
  siteKey: string;
  pageUrl: string;
  action?: string;
  minScore?: number;
}): Promise<CaptchaSolveResult> {
  const start = Date.now();
  try {
    const s = getSolver();
    const result = await s.recaptcha(params.siteKey, params.pageUrl, {
      version: 'v3',
      action: params.action || 'verify',
      score: params.minScore || 0.3
    });
    return {
      success: true,
      token: result.data,
      captchaId: result.id,
      type: 'recaptcha_v3',
      solveTimeMs: Date.now() - start
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
      type: 'recaptcha_v3',
      solveTimeMs: Date.now() - start
    };
  }
}

export async function solveHCaptcha(params: {
  siteKey: string;
  pageUrl: string;
}): Promise<CaptchaSolveResult> {
  const start = Date.now();
  try {
    const s = getSolver();
    const result = await s.hcaptcha(params.siteKey, params.pageUrl);
    return {
      success: true,
      token: result.data,
      captchaId: result.id,
      type: 'hcaptcha',
      solveTimeMs: Date.now() - start
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
      type: 'hcaptcha',
      solveTimeMs: Date.now() - start
    };
  }
}

export async function solveImageCaptcha(params: {
  imageBase64: string;
  caseSensitive?: boolean;
  minLength?: number;
  maxLength?: number;
}): Promise<CaptchaSolveResult> {
  const start = Date.now();
  try {
    const s = getSolver();
    const options: any = {};
    if (params.caseSensitive) options.regsense = 1;
    if (params.minLength) options.min_len = params.minLength;
    if (params.maxLength) options.max_len = params.maxLength;
    
    const result = await s.imageCaptcha(params.imageBase64, options);
    return {
      success: true,
      token: result.data,
      captchaId: result.id,
      type: 'image',
      solveTimeMs: Date.now() - start
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
      type: 'image',
      solveTimeMs: Date.now() - start
    };
  }
}

export async function solveTurnstile(params: {
  siteKey: string;
  pageUrl: string;
}): Promise<CaptchaSolveResult> {
  const start = Date.now();
  try {
    const s = getSolver();
    const result = await s.turnstile(params.siteKey, params.pageUrl);
    return {
      success: true,
      token: result.data,
      captchaId: result.id,
      type: 'turnstile',
      solveTimeMs: Date.now() - start
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
      type: 'turnstile',
      solveTimeMs: Date.now() - start
    };
  }
}

export async function getBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
  try {
    const s = getSolver();
    const balance = await s.balance();
    return { success: true, balance: parseFloat(balance) };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function reportBad(captchaId: string): Promise<void> {
  try {
    const s = getSolver();
    await s.report(captchaId, false);
  } catch {}
}

export async function reportGood(captchaId: string): Promise<void> {
  try {
    const s = getSolver();
    await s.goodReport(captchaId);
  } catch {}
}

export function generatePuppeteerCaptchaScript(params: {
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'turnstile';
  siteKey: string;
  pageUrl: string;
  action?: string;
  minScore?: number;
}): string {
  const apiKey = process.env.TWOCAPTCHA_API_KEY || '';
  
  if (params.type === 'recaptcha_v2') {
    return `
    // Auto-solve reCAPTCHA v2
    const Captcha = require('2captcha');
    const captchaSolver = new Captcha.Solver('${apiKey}');
    console.log('[CAPTCHA] Solving reCAPTCHA v2...');
    const captchaResult = await captchaSolver.recaptcha('${params.siteKey}', '${params.pageUrl}');
    await page.evaluate((token) => {
      const el = document.getElementById('g-recaptcha-response');
      if (el) { el.value = token; el.innerHTML = token; }
      const cb = typeof ___grecaptcha_cfg !== 'undefined' ? Object.values(___grecaptcha_cfg.clients)[0]?.S?.S?.callback : null;
      if (cb) cb(token);
    }, captchaResult.data);
    console.log('[CAPTCHA] reCAPTCHA v2 solved!');
    `;
  }
  
  if (params.type === 'recaptcha_v3') {
    return `
    // Auto-solve reCAPTCHA v3
    const Captcha = require('2captcha');
    const captchaSolver = new Captcha.Solver('${apiKey}');
    console.log('[CAPTCHA] Solving reCAPTCHA v3...');
    const captchaResult = await captchaSolver.recaptcha('${params.siteKey}', '${params.pageUrl}', {
      version: 'v3', action: '${params.action || 'verify'}', score: ${params.minScore || 0.3}
    });
    await page.evaluate((token) => {
      const el = document.getElementById('g-recaptcha-response');
      if (el) { el.value = token; el.innerHTML = token; }
    }, captchaResult.data);
    console.log('[CAPTCHA] reCAPTCHA v3 solved!');
    `;
  }

  if (params.type === 'hcaptcha') {
    return `
    // Auto-solve hCaptcha
    const Captcha = require('2captcha');
    const captchaSolver = new Captcha.Solver('${apiKey}');
    console.log('[CAPTCHA] Solving hCaptcha...');
    const captchaResult = await captchaSolver.hcaptcha('${params.siteKey}', '${params.pageUrl}');
    await page.evaluate((token) => {
      const el = document.querySelector('[name="h-captcha-response"]') || document.querySelector('[name="g-recaptcha-response"]');
      if (el) { el.value = token; el.innerHTML = token; }
    }, captchaResult.data);
    console.log('[CAPTCHA] hCaptcha solved!');
    `;
  }

  return `
  // Auto-solve Cloudflare Turnstile
  const Captcha = require('2captcha');
  const captchaSolver = new Captcha.Solver('${apiKey}');
  console.log('[CAPTCHA] Solving Turnstile...');
  const captchaResult = await captchaSolver.turnstile('${params.siteKey}', '${params.pageUrl}');
  await page.evaluate((token) => {
    const el = document.querySelector('[name="cf-turnstile-response"]');
    if (el) { el.value = token; }
  }, captchaResult.data);
  console.log('[CAPTCHA] Turnstile solved!');
  `;
}
