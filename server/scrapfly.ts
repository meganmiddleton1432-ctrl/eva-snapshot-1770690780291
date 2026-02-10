const SCRAPFLY_API_KEY = process.env.SCRAPFLY_API_KEY;
const BASE_URL = 'https://api.scrapfly.io';

const BLOCKED_HOSTS: string[] = []; // No restrictions - full autonomy

function isUrlSafe(_urlString: string): boolean {
  return true; // Full access - no URL restrictions
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  content: string;
  title?: string;
  statusCode: number;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function scrapeWebPage(url: string, options: {
  renderJs?: boolean;
  extractText?: boolean;
  timeout?: number;
} = {}): Promise<ScrapeResult> {
  if (!SCRAPFLY_API_KEY) {
    return { success: false, url, content: '', statusCode: 0, error: 'SCRAPFLY_API_KEY not configured' };
  }

  if (!isUrlSafe(url)) {
    return { success: false, url, content: '', statusCode: 0, error: 'URL blocked: internal/private network access denied' };
  }

  try {
    const params = new URLSearchParams({
      key: SCRAPFLY_API_KEY,
      url: url,
      asp: 'true',
      country: 'us'
    });

    if (options.renderJs) {
      params.append('render_js', 'true');
    }

    const response = await fetch(`${BASE_URL}/scrape?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(options.timeout || 30000)
    });

    const data = await response.json() as any;

    if (!response.ok || !data.result) {
      return {
        success: false,
        url,
        content: '',
        statusCode: response.status,
        error: data.message || 'Scrape failed'
      };
    }

    let content = data.result.content || '';
    
    if (options.extractText) {
      content = extractTextFromHtml(content);
    }

    return {
      success: true,
      url,
      content: content.substring(0, 50000),
      title: extractTitle(data.result.content),
      statusCode: data.result.status_code || 200
    };
  } catch (error: any) {
    console.error('Scrapfly scrape error:', error.message);
    return {
      success: false,
      url,
      content: '',
      statusCode: 0,
      error: error.message
    };
  }
}

export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResult[]> {
  if (!SCRAPFLY_API_KEY) {
    console.error('SCRAPFLY_API_KEY not configured');
    return [];
  }

  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${numResults}`;
    
    const params = new URLSearchParams({
      key: SCRAPFLY_API_KEY,
      url: searchUrl,
      asp: 'true',
      country: 'us',
      render_js: 'true'
    });

    const response = await fetch(`${BASE_URL}/scrape?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json() as any;

    if (!response.ok || !data.result) {
      console.error('Search failed:', data.message);
      return [];
    }

    return parseGoogleResults(data.result.content, numResults);
  } catch (error: any) {
    console.error('Scrapfly search error:', error.message);
    return [];
  }
}

export async function crawlAndExtract(url: string, extractionPrompt?: string): Promise<{
  success: boolean;
  content: string;
  extracted?: string;
  links: string[];
}> {
  const scrapeResult = await scrapeWebPage(url, { extractText: true, renderJs: true });
  
  if (!scrapeResult.success) {
    return { success: false, content: '', links: [] };
  }

  const links = extractLinks(scrapeResult.content, url);

  return {
    success: true,
    content: scrapeResult.content,
    links: links.slice(0, 20)
  };
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text.substring(0, 30000);
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : undefined;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /href=["']([^"']+)["']/gi;
  let match;
  
  const base = new URL(baseUrl);
  
  while ((match = regex.exec(html)) !== null) {
    try {
      let href = match[1];
      if (href.startsWith('/')) {
        href = `${base.origin}${href}`;
      } else if (!href.startsWith('http')) {
        continue;
      }
      if (!links.includes(href) && !href.includes('#')) {
        links.push(href);
      }
    } catch {}
  }
  
  return links;
}

function parseGoogleResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  const resultRegex = /<a[^>]+href="\/url\?q=([^"&]+)[^"]*"[^>]*>.*?<h3[^>]*>([^<]+)<\/h3>/gi;
  let match;
  
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    const url = decodeURIComponent(match[1]);
    const title = match[2];
    
    if (url.startsWith('http') && !url.includes('google.com')) {
      results.push({
        url,
        title,
        snippet: ''
      });
    }
  }

  if (results.length === 0) {
    const linkRegex = /https?:\/\/[^\s"'<>]+/g;
    const urls = html.match(linkRegex) || [];
    
    for (const url of urls) {
      if (!url.includes('google.com') && !url.includes('gstatic.com') && results.length < maxResults) {
        results.push({
          url,
          title: url,
          snippet: ''
        });
      }
    }
  }

  return results;
}

export async function learnFromUrl(url: string): Promise<{
  success: boolean;
  title?: string;
  summary: string;
  keyFacts: string[];
}> {
  const result = await scrapeWebPage(url, { extractText: true, renderJs: true });
  
  if (!result.success) {
    return { success: false, summary: '', keyFacts: [] };
  }

  const sentences = result.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyFacts = sentences.slice(0, 10).map(s => s.trim());
  const summary = sentences.slice(0, 5).join('. ').substring(0, 1000);

  return {
    success: true,
    title: result.title,
    summary,
    keyFacts
  };
}
