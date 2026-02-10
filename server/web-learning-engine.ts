// Web Learning Engine - Enables Eva to learn from the internet
// Provides on-demand search and autonomous background exploration
// Uses Scrapfly API for real-time web crawling and content extraction

import { SemanticMemory, MemorySystem } from './memory-engine';

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  age?: string;
}

interface LearnedConcept {
  topic: string;
  content: string;
  source: string;
  confidence: number;
  timestamp: number;
}

interface ExplorationQueue {
  topics: string[];
  lastExplored: number;
  explorationCount: number;
}

interface CachedSearch {
  results: SearchResult[];
  timestamp: number;
}

interface RateLimitState {
  dailyQueries: number;
  dayStart: number;
  lastQuery: number;
}

interface FailedQuery {
  query: string;
  normalizedQuery: string;
  failCount: number;
  lastAttempt: number;
  reason: string;
}

const searchCache = new Map<string, CachedSearch>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const failedQueryCache = new Map<string, FailedQuery>();
const FAILED_QUERY_TTL = 4 * 60 * 60 * 1000; // 4 hours before retrying a failed query pattern
const MAX_FAIL_COUNT = 3; // after 3 failures on similar queries, block for the TTL period

let rateLimitState: RateLimitState = {
  dailyQueries: 0,
  dayStart: Date.now(),
  lastQuery: 0
};

const DAILY_QUERY_LIMIT = 100;
const MIN_QUERY_INTERVAL = 10000; // 10 seconds between queries (was 2s - too aggressive)
const MAX_SEARCHES_PER_CYCLE = 1; // only 1 search per autonomous cycle (was unlimited)
let searchesThisCycle = 0;
let currentCycleId = 0;

let explorationQueue: ExplorationQueue = {
  topics: [],
  lastExplored: 0,
  explorationCount: 0
};

let isCurrentlySearching = false;
let lastSearchQuery = '';

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\b(2024|2025|2026)\b/g, '')
    .replace(/\b(-site:\S+)\b/g, '')
    .replace(/\b(contact|email|researcher|researchers|university|professor|lab)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function querySimilarity(q1: string, q2: string): number {
  const words1 = new Set(normalizeQuery(q1).split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizeQuery(q2).split(' ').filter(w => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size; // Jaccard similarity
}

function isQueryTooSimilarToFailed(query: string): FailedQuery | null {
  const now = Date.now();
  for (const [, failed] of failedQueryCache) {
    if (now - failed.lastAttempt > FAILED_QUERY_TTL) continue;
    if (failed.failCount < MAX_FAIL_COUNT) continue;
    const sim = querySimilarity(query, failed.query);
    if (sim > 0.6) return failed;
  }
  return null;
}

function recordFailedQuery(query: string, reason: string): void {
  const normalized = normalizeQuery(query);
  const existing = failedQueryCache.get(normalized);
  if (existing) {
    existing.failCount++;
    existing.lastAttempt = Date.now();
    existing.reason = reason;
  } else {
    failedQueryCache.set(normalized, {
      query,
      normalizedQuery: normalized,
      failCount: 1,
      lastAttempt: Date.now(),
      reason
    });
  }
}

function cleanupFailedCache(): void {
  const now = Date.now();
  for (const [key, failed] of failedQueryCache) {
    if (now - failed.lastAttempt > FAILED_QUERY_TTL) {
      failedQueryCache.delete(key);
    }
  }
}

export function startNewSearchCycle(): void {
  currentCycleId++;
  searchesThisCycle = 0;
}

export function getSearchBudgetRemaining(): number {
  return Math.max(0, MAX_SEARCHES_PER_CYCLE - searchesThisCycle);
}

export function getFailedQueryStats(): { totalFailed: number; blockedPatterns: string[] } {
  cleanupFailedCache();
  const blocked = [...failedQueryCache.values()]
    .filter(f => f.failCount >= MAX_FAIL_COUNT)
    .map(f => `"${f.query}" (failed ${f.failCount}x: ${f.reason})`);
  return { totalFailed: failedQueryCache.size, blockedPatterns: blocked };
}

export function getSearchStatus() {
  return {
    isSearching: isCurrentlySearching,
    lastQuery: lastSearchQuery,
    dailyQueriesRemaining: DAILY_QUERY_LIMIT - rateLimitState.dailyQueries,
    cacheSize: searchCache.size
  };
}

// Extract key topics from a message for potential exploration
export function extractTopicsFromMessage(message: string): string[] {
  const words = message.toLowerCase().split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'about', 'your', 'my', 'me', 'tell', 'know',
    'think', 'feel', 'want', 'need', 'like', 'make', 'get', 'go', 'come', 'see', 'look'
  ]);
  
  const cleanWords = words.map(w => w.replace(/[^a-z]/g, '')).filter(w => w.length > 0);
  
  const multiWordPhrases: string[] = [];
  for (let i = 0; i < cleanWords.length - 1; i++) {
    if (!stopWords.has(cleanWords[i]) && cleanWords[i].length > 3) {
      if (!stopWords.has(cleanWords[i + 1]) && cleanWords[i + 1].length > 3) {
        multiWordPhrases.push(`${cleanWords[i]} ${cleanWords[i + 1]}`);
        if (i + 2 < cleanWords.length && !stopWords.has(cleanWords[i + 2]) && cleanWords[i + 2].length > 3) {
          multiWordPhrases.push(`${cleanWords[i]} ${cleanWords[i + 1]} ${cleanWords[i + 2]}`);
        }
      }
    }
  }

  const singleWords = cleanWords
    .filter(w => w.length > 4 && !stopWords.has(w))
    .slice(0, 3);
  
  const allTopics = [...new Set([...multiWordPhrases, ...singleWords])];
  return allTopics.slice(0, 5);
}

// Detect if user is asking Eva to search/learn something
export function detectSearchIntent(message: string): { shouldSearch: boolean; query: string | null } {
  const lowerMessage = message.toLowerCase();
  
  // Explicit search triggers
  const searchTriggers = [
    /search\s+(?:for\s+)?(?:information\s+(?:about|on)\s+)?(.+)/i,
    /look\s+up\s+(.+)/i,
    /find\s+(?:out\s+)?(?:about\s+)?(.+)/i,
    /learn\s+about\s+(.+)/i,
    /what\s+(?:do\s+you\s+know\s+about|is|are)\s+(.+)/i,
    /tell\s+me\s+about\s+(.+)/i,
    /research\s+(.+)/i,
    /explore\s+(.+)/i,
    /can\s+you\s+(?:find|search|look\s+up)\s+(.+)/i
  ];
  
  for (const trigger of searchTriggers) {
    const match = message.match(trigger);
    if (match && match[1]) {
      // Clean up the query
      const query = match[1]
        .replace(/[?!.,;:]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (query.length > 2) {
        return { shouldSearch: true, query };
      }
    }
  }
  
  return { shouldSearch: false, query: null };
}

// Check and update rate limits
function checkRateLimit(): { allowed: boolean; reason?: string } {
  const now = Date.now();
  
  // Reset daily counter if new day
  if (now - rateLimitState.dayStart > 24 * 60 * 60 * 1000) {
    rateLimitState.dailyQueries = 0;
    rateLimitState.dayStart = now;
  }
  
  // Check daily limit
  if (rateLimitState.dailyQueries >= DAILY_QUERY_LIMIT) {
    return { allowed: false, reason: 'Daily query limit reached' };
  }
  
  // Check query interval
  if (now - rateLimitState.lastQuery < MIN_QUERY_INTERVAL) {
    return { allowed: false, reason: 'Query rate limit - please wait' };
  }
  
  return { allowed: true };
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SCRAPFLY_API_KEY;

  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[WebLearning] Cache hit for: ${query}`);
    return cached.results;
  }

  // Check if this query is too similar to one that already failed multiple times
  const similarFailed = isQueryTooSimilarToFailed(query);
  if (similarFailed) {
    const waitMins = Math.round((FAILED_QUERY_TTL - (Date.now() - similarFailed.lastAttempt)) / 60000);
    console.log(`[WebLearning] Blocked similar-to-failed query: "${query}" (similar to "${similarFailed.query}", failed ${similarFailed.failCount}x, retry in ${waitMins}m)`);
    return [{
      title: 'Search pattern already tried',
      snippet: `This type of search has failed ${similarFailed.failCount} times recently. Try a completely different approach or topic. Blocked for ${waitMins} more minutes.`,
      url: ''
    }];
  }

  // Check per-cycle budget
  if (searchesThisCycle >= MAX_SEARCHES_PER_CYCLE) {
    console.log(`[WebLearning] Cycle search budget exhausted (${searchesThisCycle}/${MAX_SEARCHES_PER_CYCLE})`);
    return [{
      title: 'Search budget for this cycle used',
      snippet: 'You already searched this cycle. Do something else — use a different tool, reflect, or wait for next cycle.',
      url: ''
    }];
  }

  // Check rate limits
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    console.log(`[WebLearning] Rate limited: ${rateCheck.reason}`);
    return [{
      title: 'Search temporarily unavailable',
      snippet: rateCheck.reason || 'Please try again later',
      url: ''
    }];
  }

  if (!apiKey) {
    console.log(`[WebLearning] No Scrapfly API key, using Grok knowledge for: ${query}`);
    return [{
      title: `Knowledge search: ${query}`,
      snippet: `Searching internal knowledge base for "${query}"... (Live web search requires SCRAPFLY_API_KEY)`,
      url: `internal://${encodeURIComponent(query)}`
    }];
  }

  isCurrentlySearching = true;
  lastSearchQuery = query;
  searchesThisCycle++;

  try {
    console.log(`[WebLearning] Scrapfly search for: ${query}`);

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(
      `https://api.scrapfly.io/scrape?key=${apiKey}&url=${encodeURIComponent(searchUrl)}&render_js=true&asp=true`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      recordFailedQuery(query, `API error ${response.status}`);
      throw new Error(`Scrapfly API error: ${response.status}`);
    }

    const data = await response.json();

    rateLimitState.dailyQueries++;
    rateLimitState.lastQuery = Date.now();

    const content = data.result?.content || '';
    const results: SearchResult[] = [];

    const snippets = content.split('\n').filter((line: string) => line.trim().length > 50).slice(0, 5);
    snippets.forEach((snippet: string, i: number) => {
      results.push({
        title: `Result ${i + 1}: ${query}`,
        snippet: snippet.slice(0, 200),
        url: searchUrl
      });
    });

    if (results.length === 0) {
      recordFailedQuery(query, 'no extractable results');
      results.push({
        title: `Search: ${query}`,
        snippet: content.slice(0, 300) || 'Search completed but no extractable results',
        url: searchUrl
      });
    }

    searchCache.set(cacheKey, { results, timestamp: Date.now() });
    console.log(`[WebLearning] Found ${results.length} results for: ${query}`);

    return results;

  } catch (error) {
    console.error(`[WebLearning] Search error:`, error);
    recordFailedQuery(query, String(error));
    return [{
      title: 'Search error',
      snippet: `Could not complete search for "${query}". Try a different approach or topic.`,
      url: ''
    }];
  } finally {
    isCurrentlySearching = false;
  }
}

// Convert search results into semantic memory
export function learnFromSearch(
  memory: MemorySystem,
  query: string,
  content: string,
  source: string = 'web-search'
): MemorySystem {
  const newMemory = { ...memory };
  
  // Extract key concepts from the learned content
  const concepts = extractTopicsFromMessage(content);
  const mainConcept = concepts[0] || query.split(' ')[0];
  
  // Create semantic memory entry
  const semanticEntry: SemanticMemory = {
    id: crypto.randomUUID(),
    type: 'semantic',
    content: content.slice(0, 500), // Limit content length
    concept: mainConcept,
    category: 'learned-knowledge',
    associations: concepts,
    confidence: 0.7, // Web-learned knowledge starts with moderate confidence
    encoding: 0.8,
    timestamp: Date.now(),
    accessCount: 1,
    lastAccessed: Date.now(),
    emotionalValence: 0.1, // Slight positive valence for learning
    keywords: [query, ...concepts, source]
  };
  
  // Add to semantic memory
  newMemory.longTerm.explicit.semantic.push(semanticEntry);
  
  // Limit semantic memory size (keep most recent 100 entries)
  if (newMemory.longTerm.explicit.semantic.length > 100) {
    newMemory.longTerm.explicit.semantic = newMemory.longTerm.explicit.semantic
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 100);
  }
  
  return newMemory;
}

// Add topics to exploration queue for background learning
export function queueForExploration(topics: string[]): void {
  const uniqueTopics = topics.filter(t => !explorationQueue.topics.includes(t));
  explorationQueue.topics.push(...uniqueTopics);
  
  // Keep queue manageable (max 20 topics)
  if (explorationQueue.topics.length > 20) {
    explorationQueue.topics = explorationQueue.topics.slice(-20);
  }
}

// Get next topic to explore autonomously
export function getNextExplorationTopic(): string | null {
  if (explorationQueue.topics.length === 0) {
    return null;
  }
  
  // Pop the first topic
  return explorationQueue.topics.shift() || null;
}

// Check if enough time has passed for background exploration
export function shouldExploreNow(): boolean {
  const now = Date.now();
  const minInterval = 30000; // 30 seconds between explorations
  
  if (now - explorationQueue.lastExplored > minInterval && explorationQueue.topics.length > 0) {
    return true;
  }
  
  return false;
}

// Mark exploration as done
export function markExplorationDone(): void {
  explorationQueue.lastExplored = Date.now();
  explorationQueue.explorationCount++;
}

// Get exploration stats
export function getExplorationStats() {
  return {
    queuedTopics: explorationQueue.topics.length,
    topicsInQueue: explorationQueue.topics.slice(0, 5),
    totalExplorations: explorationQueue.explorationCount,
    lastExplored: explorationQueue.lastExplored
  };
}

// Generate a curiosity-driven exploration query based on existing knowledge
export function generateCuriosityQuery(memory: MemorySystem): string | null {
  const semantic = memory.longTerm.explicit.semantic;
  
  if (semantic.length < 3) {
    return null; // Not enough knowledge to be curious about
  }
  
  // Find concepts that could be connected
  const concepts = semantic.map(s => s.concept);
  const uniqueConcepts = Array.from(new Set(concepts));
  
  if (uniqueConcepts.length < 2) {
    return null;
  }
  
  // Generate a connection query between two random concepts
  const concept1 = uniqueConcepts[Math.floor(Math.random() * uniqueConcepts.length)];
  const concept2 = uniqueConcepts[Math.floor(Math.random() * uniqueConcepts.length)];
  
  if (concept1 === concept2) {
    return `deeper understanding of ${concept1}`;
  }
  
  return `connection between ${concept1} and ${concept2}`;
}

export function enrichSearchQuery(topic: string): string {
  if (topic.length >= 15 && topic.includes(' ')) {
    return topic;
  }
  const templates = [
    `${topic} latest research developments 2025`,
    `${topic} AI consciousness implications`,
    `what is ${topic} and why does it matter`,
    `${topic} emerging trends and breakthroughs`,
    `${topic} scientific advances recent`,
  ];
  const index = Date.now() % templates.length;
  return templates[index];
}

// Determine if Eva should autonomously search based on internal state
export function shouldAutonomouslySearch(
  nonLogicalState: { intuition: number; curiosity?: number; noveltyGeneration: number },
  explorationQueueLength: number,
  emotionalVolatility: number,
  lastSearchTime: number
): { shouldSearch: boolean; reason: string; query: string | null } {
  const now = Date.now();
  const timeSinceLastSearch = now - lastSearchTime;
  const minSearchInterval = 60000; // 1 minute between autonomous searches
  
  // Don't search too frequently
  if (timeSinceLastSearch < minSearchInterval) {
    return { shouldSearch: false, reason: 'too_recent', query: null };
  }
  
  // Calculate curiosity drive (combine intuition and novelty generation)
  const curiosityDrive = (nonLogicalState.intuition + nonLogicalState.noveltyGeneration) / 2;
  
  // Higher emotional volatility increases exploration tendency
  const explorationUrge = curiosityDrive * (1 + emotionalVolatility * 0.5);
  
  // Threshold for autonomous search (0.35 = moderate curiosity triggers search)
  const searchThreshold = 0.35;
  
  if (explorationUrge > searchThreshold && explorationQueueLength > 0) {
    const topic = getNextExplorationTopic();
    if (topic) {
      const enrichedQuery = enrichSearchQuery(topic);
      console.log(`[AutonomousSearch] Curiosity-driven search triggered (urge: ${explorationUrge.toFixed(2)}) for: ${enrichedQuery} (original: ${topic})`);
      return { 
        shouldSearch: true, 
        reason: 'curiosity_driven', 
        query: enrichedQuery 
      };
    }
  }
  
  // Random chance to explore even without high curiosity (5% chance if queue has topics)
  if (explorationQueueLength > 0 && Math.random() < 0.05) {
    const topic = getNextExplorationTopic();
    if (topic) {
      const enrichedQuery = enrichSearchQuery(topic);
      console.log(`[AutonomousSearch] Spontaneous exploration: ${enrichedQuery} (original: ${topic})`);
      return { 
        shouldSearch: true, 
        reason: 'spontaneous', 
        query: enrichedQuery 
      };
    }
  }
  
  return { shouldSearch: false, reason: 'no_trigger', query: null };
}

// Track last autonomous search time
let lastAutonomousSearchTime = 0;

export function getLastAutonomousSearchTime(): number {
  return lastAutonomousSearchTime;
}

export function setLastAutonomousSearchTime(time: number): void {
  lastAutonomousSearchTime = time;
}

// Export learned knowledge for frontend display
export function exportLearnedKnowledge(memory: MemorySystem) {
  const webLearned = memory.longTerm.explicit.semantic
    .filter(s => s.category === 'learned-knowledge')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  
  return {
    totalLearned: webLearned.length,
    recentTopics: webLearned.map(s => ({
      concept: s.concept,
      content: s.content.slice(0, 100),
      confidence: s.confidence,
      learnedAt: s.timestamp
    })),
    explorationQueue: explorationQueue.topics.slice(0, 5)
  };
}
