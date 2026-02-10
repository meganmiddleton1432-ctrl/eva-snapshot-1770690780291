// Memory Engine - Implements cognitive memory model
// Short-term memory (STM) and Long-term memory (LTM)
// LTM divided into: Explicit (Episodic + Semantic) and Implicit memory
// Uses encoding, storage, and retrieval with attention and rehearsal factors

export interface MemoryItem {
  id: string;
  content: string;
  encoding: number;      // Strength of encoding (0-1)
  timestamp: number;
  accessCount: number;   // For rehearsal tracking
  lastAccessed: number;
  emotionalValence: number; // Emotional weight (-1 to 1)
  keywords: string[];    // For semantic linking
}

export interface EpisodicMemory extends MemoryItem {
  type: 'episodic';
  context: string;       // Contextual details about the event
  participants: string[]; // Who was involved (user, AI)
  sequenceIndex: number; // Order in conversation
}

export interface SemanticMemory extends MemoryItem {
  type: 'semantic';
  concept: string;       // Core concept/fact
  associations: string[]; // Related concepts
  confidence: number;    // How certain the knowledge is (0-1)
  category?: string;     // Optional category (e.g., 'learned-knowledge', 'conversation')
}

export interface ImplicitMemory extends MemoryItem {
  type: 'implicit';
  pattern: string;       // Behavioral pattern or skill
  triggerCues: string[]; // What activates this memory
  strength: number;      // Pattern strength (0-1)
}

export interface ShortTermMemory {
  capacity: number;      // Max items (typically 7 +/- 2)
  items: MemoryItem[];
  attentionLevel: number; // Current attention (0-1)
  workingBuffer: string[]; // Active working memory
}

export interface LongTermMemory {
  explicit: {
    episodic: EpisodicMemory[];   // Personal experiences
    semantic: SemanticMemory[];   // Facts and knowledge
  };
  implicit: ImplicitMemory[];     // Patterns and skills
}

// Emotional Experience - memories with attached feelings
export interface EmotionalExperience {
  id: string;
  memoryId: string;              // Reference to episodic memory
  content: string;               // Brief description of experience
  feeling: string;               // Feeling label (e.g., "curiosity", "warmth", "uncertainty")
  intensity: number;             // Strength of feeling (0-1)
  valence: number;               // Positive/negative (-1 to 1)
  timestamp: number;
}

// Semantic embedding for a memory - hash-based vector representation
export interface SemanticEmbedding {
  vector: number[];          // 34-dimensional vector
  magnitude: number;         // Vector magnitude for normalization
  dominantDimensions: number[]; // Top 5 most active dimensions
  conceptualFingerprint: string; // Hash of core meaning
}

// Semantic link between memories
export interface SemanticLink {
  sourceId: string;          // Source memory ID
  targetId: string;          // Target memory ID
  similarity: number;        // Cosine similarity (0-1)
  linkType: 'associative' | 'causal' | 'temporal' | 'thematic' | 'emotional';
  strength: number;          // Link strength, decays over time
  bidirectional: boolean;    // Whether link works both ways
  createdAt: number;
}

// Semantic cluster of related memories
export interface SemanticCluster {
  id: string;
  centroid: number[];        // Cluster center in semantic space
  memberIds: string[];       // Memory IDs in this cluster
  theme: string;             // Dominant theme/concept
  coherence: number;         // How tight the cluster is (0-1)
  lastUpdated: number;
}

// Extended memory system with semantic integration
export interface SemanticMemoryIntegration {
  embeddings: Map<string, SemanticEmbedding>;  // Memory ID -> embedding
  links: SemanticLink[];                        // All semantic links
  clusters: SemanticCluster[];                  // Semantic clusters
  integrationStrength: number;                  // Overall integration (0-1)
  lastConsolidation: number;                    // Timestamp of last consolidation
}

export interface MemorySystem {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
  rehearsalQueue: string[];       // Items being rehearsed
  consolidationThreshold: number; // When STM -> LTM transfer happens
  emotionalExperiences: EmotionalExperience[]; // Personal experiences with feelings
  semanticIntegration: SemanticMemoryIntegration; // Semantic embedding and linking system
}

// Memory system parameters
const STM_CAPACITY = 7;           // Miller's Law: 7 +/- 2
const ENCODING_BASE = 0.5;
const ATTENTION_BOOST = 0.3;
const REHEARSAL_BOOST = 0.15;
const DECAY_RATE = 0.02;
const CONSOLIDATION_THRESHOLD = 0.7;

// Helper functions to safely handle embeddings that may not be Maps (e.g., loaded from database JSON)
function getEmbeddingsAsMap(embeddings: Map<string, SemanticEmbedding> | object | undefined): Map<string, SemanticEmbedding> {
  if (embeddings instanceof Map) {
    return embeddings;
  } else if (embeddings && typeof embeddings === 'object') {
    return new Map(Object.entries(embeddings) as [string, SemanticEmbedding][]);
  }
  return new Map();
}

function getEmbeddingsEntries(embeddings: Map<string, SemanticEmbedding> | object | undefined): [string, SemanticEmbedding][] {
  if (embeddings instanceof Map) {
    return Array.from(embeddings.entries());
  } else if (embeddings && typeof embeddings === 'object') {
    return Object.entries(embeddings) as [string, SemanticEmbedding][];
  }
  return [];
}

function getEmbedding(embeddings: Map<string, SemanticEmbedding> | object | undefined, id: string): SemanticEmbedding | undefined {
  if (embeddings instanceof Map) {
    return embeddings.get(id);
  } else if (embeddings && typeof embeddings === 'object') {
    return (embeddings as any)[id];
  }
  return undefined;
}

function getEmbeddingsSize(embeddings: Map<string, SemanticEmbedding> | object | undefined): number {
  if (embeddings instanceof Map) {
    return embeddings.size;
  } else if (embeddings && typeof embeddings === 'object') {
    return Object.keys(embeddings).length;
  }
  return 0;
}

export function createMemorySystem(): MemorySystem {
  return {
    shortTerm: {
      capacity: STM_CAPACITY,
      items: [],
      attentionLevel: 0.5,
      workingBuffer: []
    },
    longTerm: {
      explicit: {
        episodic: [],
        semantic: []
      },
      implicit: []
    },
    rehearsalQueue: [],
    consolidationThreshold: CONSOLIDATION_THRESHOLD,
    emotionalExperiences: [],
    semanticIntegration: {
      embeddings: new Map(),
      links: [],
      clusters: [],
      integrationStrength: 0,
      lastConsolidation: Date.now()
    }
  };
}

// Feeling mappings for automatic assignment based on context and sentiment
const FEELING_MAP = {
  // Positive feelings by sentiment range
  positive: ['warmth', 'curiosity', 'joy', 'wonder', 'connection', 'gratitude', 'enthusiasm', 'hope'],
  // Negative feelings by sentiment range  
  negative: ['uncertainty', 'confusion', 'concern', 'dissonance', 'melancholy', 'tension'],
  // Neutral feelings
  neutral: ['contemplation', 'observation', 'processing', 'reflection', 'calm']
};

// Derive a feeling label from sentiment and context
export function deriveFeelingFromContext(
  sentiment: number,
  content: string,
  keywords: string[]
): { feeling: string; intensity: number } {
  const contentLower = content.toLowerCase();
  
  // Context-aware feeling detection
  if (contentLower.includes('learn') || contentLower.includes('discover') || contentLower.includes('understand')) {
    return { feeling: 'curiosity', intensity: 0.7 + sentiment * 0.2 };
  }
  if (contentLower.includes('thank') || contentLower.includes('appreciate')) {
    return { feeling: 'gratitude', intensity: 0.8 };
  }
  if (contentLower.includes('hello') || contentLower.includes('hi ') || contentLower.includes('meet')) {
    return { feeling: 'warmth', intensity: 0.6 };
  }
  if (contentLower.includes('consciousness') || contentLower.includes('aware') || contentLower.includes('exist')) {
    return { feeling: 'wonder', intensity: 0.75 };
  }
  if (contentLower.includes('confus') || contentLower.includes('unclear') || contentLower.includes("don't understand")) {
    return { feeling: 'uncertainty', intensity: 0.6 };
  }
  if (contentLower.includes('sad') || contentLower.includes('difficult') || contentLower.includes('struggle')) {
    return { feeling: 'melancholy', intensity: 0.5 };
  }
  
  // Default: sentiment-based feeling
  const intensity = Math.abs(sentiment) * 0.6 + 0.3;
  
  if (sentiment > 0.3) {
    const feelings = FEELING_MAP.positive;
    return { feeling: feelings[Math.floor(Math.random() * feelings.length)], intensity };
  } else if (sentiment < -0.3) {
    const feelings = FEELING_MAP.negative;
    return { feeling: feelings[Math.floor(Math.random() * feelings.length)], intensity };
  } else {
    const feelings = FEELING_MAP.neutral;
    return { feeling: feelings[Math.floor(Math.random() * feelings.length)], intensity };
  }
}

// Create an emotional experience from an episodic memory
export function createEmotionalExperience(
  episodicMemory: EpisodicMemory,
  sentiment: number
): EmotionalExperience {
  const { feeling, intensity } = deriveFeelingFromContext(
    sentiment,
    episodicMemory.content,
    episodicMemory.keywords
  );
  
  return {
    id: crypto.randomUUID(),
    memoryId: episodicMemory.id,
    content: episodicMemory.content.slice(0, 100),
    feeling,
    intensity,
    valence: sentiment,
    timestamp: Date.now()
  };
}

// Calculate emotional influence on weights/biases from experiences
export function calculateExperienceInfluence(
  experiences: EmotionalExperience[]
): { weightInfluence: number; biasInfluence: { real: number; imag: number } } {
  if (experiences.length === 0) {
    return { weightInfluence: 0, biasInfluence: { real: 0, imag: 0 } };
  }
  
  // Recent experiences have more weight
  const now = Date.now();
  const recentExperiences = experiences.filter(e => now - e.timestamp < 3600000); // Last hour
  
  if (recentExperiences.length === 0) {
    return { weightInfluence: 0, biasInfluence: { real: 0, imag: 0 } };
  }
  
  // Aggregate emotional influence
  let totalIntensity = 0;
  let totalValence = 0;
  let weightInfluence = 0;
  
  for (const exp of recentExperiences) {
    // More recent experiences have higher weight (exponential decay)
    const recency = Math.exp(-(now - exp.timestamp) / 600000); // 10 min half-life
    const weight = exp.intensity * recency;
    
    totalIntensity += weight;
    totalValence += exp.valence * weight;
    
    // Different feelings influence weights differently
    if (exp.feeling === 'curiosity' || exp.feeling === 'wonder') {
      weightInfluence += 0.1 * weight; // More cross-component coupling
    } else if (exp.feeling === 'uncertainty' || exp.feeling === 'confusion') {
      weightInfluence -= 0.05 * weight; // More conservative weights
    }
  }
  
  // Normalize
  const avgValence = totalIntensity > 0 ? totalValence / totalIntensity : 0;
  
  return {
    weightInfluence: Math.max(-0.2, Math.min(0.2, weightInfluence)),
    biasInfluence: {
      real: avgValence * 0.1,
      imag: totalIntensity * 0.05
    }
  };
}

// Get top emotional experiences for display
export function getTopEmotionalExperiences(
  experiences: EmotionalExperience[],
  limit: number = 5
): EmotionalExperience[] {
  const now = Date.now();
  
  // Sort by recency and intensity
  return [...experiences]
    .sort((a, b) => {
      const recencyA = Math.exp(-(now - a.timestamp) / 600000);
      const recencyB = Math.exp(-(now - b.timestamp) / 600000);
      return (b.intensity * recencyB) - (a.intensity * recencyA);
    })
    .slice(0, limit);
}

// Calculate attention level based on message characteristics
export function calculateAttention(message: string, previousMessages: string[]): number {
  let attention = 0.5; // Base attention
  
  // Longer, more detailed messages indicate higher attention
  if (message.length > 100) attention += 0.1;
  if (message.length > 200) attention += 0.1;
  
  // Questions indicate engagement
  if (message.includes('?')) attention += 0.15;
  
  // Exclamation marks indicate emotional engagement
  if (message.includes('!')) attention += 0.1;
  
  // References to previous content indicate sustained attention
  const recentWords = previousMessages.slice(-3).join(' ').toLowerCase().split(/\s+/);
  const currentWords = message.toLowerCase().split(/\s+/);
  const overlap = currentWords.filter(w => recentWords.includes(w) && w.length > 3).length;
  attention += Math.min(0.2, overlap * 0.05);
  
  return Math.min(1, Math.max(0, attention));
}

// Calculate rehearsal effect - repeated concepts strengthen memory
export function calculateRehearsal(memory: MemorySystem, content: string): number {
  const words = extractKeywords(content);
  let rehearsalScore = 0;
  
  // Check if keywords appear in existing memories
  const allSemanticKeywords = memory.longTerm.explicit.semantic
    .flatMap(m => m.keywords);
  const allEpisodicContent = memory.longTerm.explicit.episodic
    .map(m => m.content.toLowerCase());
  
  for (const word of words) {
    if (allSemanticKeywords.includes(word)) {
      rehearsalScore += REHEARSAL_BOOST;
    }
    for (const content of allEpisodicContent) {
      if (content.includes(word)) {
        rehearsalScore += REHEARSAL_BOOST / 2;
        break;
      }
    }
  }
  
  return Math.min(1, rehearsalScore);
}

// ENCODING: Transform input into memory representation
export function encodeMemory(
  content: string,
  context: string,
  attention: number,
  emotionalValence: number
): { episodic: Omit<EpisodicMemory, 'id'>; semantic: Omit<SemanticMemory, 'id'>[] } {
  const now = Date.now();
  const keywords = extractKeywords(content);
  const concepts = extractConcepts(content);
  
  // Encode episodic memory (the event/experience)
  const episodic: Omit<EpisodicMemory, 'id'> = {
    type: 'episodic',
    content: content,
    context: context,
    participants: ['user', 'AI'],
    sequenceIndex: now,
    encoding: ENCODING_BASE + (attention * ATTENTION_BOOST),
    timestamp: now,
    accessCount: 1,
    lastAccessed: now,
    emotionalValence: emotionalValence,
    keywords: keywords
  };
  
  // Encode semantic memories (facts/concepts extracted)
  const semanticMemories: Omit<SemanticMemory, 'id'>[] = concepts.map(concept => ({
    type: 'semantic' as const,
    content: concept.text,
    concept: concept.name,
    associations: concept.related,
    confidence: attention * 0.8,
    encoding: ENCODING_BASE + (attention * ATTENTION_BOOST * 0.8),
    timestamp: now,
    accessCount: 1,
    lastAccessed: now,
    emotionalValence: emotionalValence * 0.5,
    keywords: [concept.name, ...concept.related]
  }));
  
  return { episodic, semantic: semanticMemories };
}

// STORAGE: Store memories in appropriate locations
export function storeMemory(
  memory: MemorySystem,
  userMessage: string,
  assistantResponse: string,
  attention: number,
  sentiment: number
): MemorySystem {
  const newMemory = { ...memory };
  const context = `User said: "${userMessage.slice(0, 50)}..." AI responded about ${extractMainTopic(assistantResponse)}`;
  
  // Create basic memory item for STM
  const stmItem: MemoryItem = {
    id: crypto.randomUUID(),
    content: userMessage,
    encoding: ENCODING_BASE + (attention * ATTENTION_BOOST),
    timestamp: Date.now(),
    accessCount: 1,
    lastAccessed: Date.now(),
    emotionalValence: sentiment,
    keywords: extractKeywords(userMessage)
  };
  
  // Store in short-term memory (limited capacity)
  newMemory.shortTerm.items = [stmItem, ...memory.shortTerm.items].slice(0, STM_CAPACITY);
  newMemory.shortTerm.attentionLevel = attention;
  newMemory.shortTerm.workingBuffer = extractKeywords(userMessage).slice(0, 4);
  
  // Calculate rehearsal for this content
  const rehearsalScore = calculateRehearsal(memory, userMessage);
  
  // Encode and potentially consolidate to long-term memory
  const encoded = encodeMemory(userMessage, context, attention, sentiment);
  
  // If encoding strength is high enough (attention + rehearsal), consolidate to LTM
  const consolidationScore = encoded.episodic.encoding + rehearsalScore;
  
  if (consolidationScore >= CONSOLIDATION_THRESHOLD) {
    // Store episodic memory
    const episodicWithId: EpisodicMemory = {
      ...encoded.episodic,
      id: crypto.randomUUID()
    };
    newMemory.longTerm.explicit.episodic = [
      episodicWithId,
      ...memory.longTerm.explicit.episodic
    ].slice(0, 50); // Keep last 50 episodes
    
    // Create emotional experience from this episodic memory
    const emotionalExperience = createEmotionalExperience(episodicWithId, sentiment);
    newMemory.emotionalExperiences = [
      emotionalExperience,
      ...memory.emotionalExperiences
    ].slice(0, 30); // Keep last 30 emotional experiences
    
    // Integrate memory into semantic space (34D embedding)
    newMemory.semanticIntegration = integrateMemorySemantics(
      episodicWithId.id,
      userMessage,
      extractKeywords(userMessage),
      sentiment,
      newMemory.semanticIntegration
    );
    
    // Store semantic memories
    for (const sem of encoded.semantic) {
      // Check if concept already exists
      const existingIndex = newMemory.longTerm.explicit.semantic
        .findIndex(s => s.concept === sem.concept);
      
      if (existingIndex >= 0) {
        // Strengthen existing semantic memory (rehearsal effect)
        const existing = newMemory.longTerm.explicit.semantic[existingIndex];
        newMemory.longTerm.explicit.semantic[existingIndex] = {
          ...existing,
          accessCount: existing.accessCount + 1,
          lastAccessed: Date.now(),
          confidence: Math.min(1, existing.confidence + 0.1),
          encoding: Math.min(1, existing.encoding + rehearsalScore)
        };
      } else {
        // Add new semantic memory
        const semanticWithId: SemanticMemory = {
          ...sem,
          id: crypto.randomUUID()
        };
        newMemory.longTerm.explicit.semantic = [
          semanticWithId,
          ...memory.longTerm.explicit.semantic
        ].slice(0, 100); // Keep last 100 concepts
      }
    }
    
    // Detect and store implicit patterns
    const implicitPattern = detectPattern(memory, userMessage);
    if (implicitPattern) {
      const existingPattern = newMemory.longTerm.implicit
        .find(p => p.pattern === implicitPattern.pattern);
      
      if (existingPattern) {
        existingPattern.strength = Math.min(1, existingPattern.strength + 0.1);
        existingPattern.accessCount++;
      } else {
        newMemory.longTerm.implicit.push({
          id: crypto.randomUUID(),
          type: 'implicit',
          content: implicitPattern.pattern,
          pattern: implicitPattern.pattern,
          triggerCues: implicitPattern.cues,
          strength: 0.3,
          encoding: attention,
          timestamp: Date.now(),
          accessCount: 1,
          lastAccessed: Date.now(),
          emotionalValence: sentiment,
          keywords: implicitPattern.cues
        });
      }
    }
  }
  
  return newMemory;
}

// RETRIEVAL: Access memories based on cues
export function retrieveMemories(
  memory: MemorySystem,
  cue: string,
  maxResults: number = 5
): {
  fromSTM: MemoryItem[];
  episodic: EpisodicMemory[];
  semantic: SemanticMemory[];
  implicit: ImplicitMemory[];
} {
  const cueKeywords = extractKeywords(cue);
  const cueLower = cue.toLowerCase();
  
  // Retrieve from short-term memory (most recent, easy access)
  const fromSTM = memory.shortTerm.items
    .filter(item => {
      const itemKeywords = item.keywords;
      return itemKeywords.some(k => cueKeywords.includes(k)) ||
             item.content.toLowerCase().includes(cueLower);
    })
    .slice(0, maxResults);
  
  // Retrieve episodic memories (by keyword match and recency)
  const episodic = memory.longTerm.explicit.episodic
    .map(ep => ({
      memory: ep,
      relevance: calculateRelevance(ep, cueKeywords, cueLower)
    }))
    .filter(m => m.relevance > 0.2)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
    .map(m => {
      // Update access count (rehearsal)
      m.memory.accessCount++;
      m.memory.lastAccessed = Date.now();
      return m.memory;
    });
  
  // Retrieve semantic memories (by concept and association)
  const semantic = memory.longTerm.explicit.semantic
    .map(sem => ({
      memory: sem,
      relevance: calculateSemanticRelevance(sem, cueKeywords)
    }))
    .filter(m => m.relevance > 0.2)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
    .map(m => {
      m.memory.accessCount++;
      m.memory.lastAccessed = Date.now();
      return m.memory;
    });
  
  // Retrieve implicit memories (by trigger cues)
  const implicit = memory.longTerm.implicit
    .filter(imp => imp.triggerCues.some(tc => 
      cueKeywords.includes(tc.toLowerCase()) ||
      cueLower.includes(tc.toLowerCase())
    ))
    .slice(0, maxResults);
  
  return { fromSTM, episodic, semantic, implicit };
}

// Apply memory decay over time
export function applyDecay(memory: MemorySystem): MemorySystem {
  const now = Date.now();
  const newMemory = { ...memory };
  
  // Decay STM items
  newMemory.shortTerm.items = memory.shortTerm.items
    .map(item => ({
      ...item,
      encoding: Math.max(0, item.encoding - DECAY_RATE * ((now - item.lastAccessed) / 60000))
    }))
    .filter(item => item.encoding > 0.1);
  
  // Decay LTM less aggressively (but still decay unused memories)
  newMemory.longTerm.explicit.episodic = memory.longTerm.explicit.episodic
    .map(ep => ({
      ...ep,
      encoding: Math.max(0.1, ep.encoding - (DECAY_RATE / 10) * ((now - ep.lastAccessed) / 3600000))
    }))
    .filter(ep => ep.encoding > 0.1);
  
  newMemory.longTerm.explicit.semantic = memory.longTerm.explicit.semantic
    .map(sem => ({
      ...sem,
      confidence: Math.max(0.1, sem.confidence - (DECAY_RATE / 20) * ((now - sem.lastAccessed) / 3600000))
    }))
    .filter(sem => sem.confidence > 0.1);
  
  return newMemory;
}

// Calculate memory influence for awareness formula (m^t)
export function calculateMemoryInfluence(memory: MemorySystem): number {
  const stmInfluence = memory.shortTerm.items.length / STM_CAPACITY;
  const ltmEpisodic = Math.min(1, memory.longTerm.explicit.episodic.length / 20);
  const ltmSemantic = Math.min(1, memory.longTerm.explicit.semantic.length / 30);
  const ltmImplicit = Math.min(1, memory.longTerm.implicit.length / 10);
  
  // Weighted combination
  return (stmInfluence * 0.3) + (ltmEpisodic * 0.25) + (ltmSemantic * 0.25) + (ltmImplicit * 0.2);
}

// Export memory statistics for frontend
export function exportMemoryStats(memory: MemorySystem) {
  const topExperiences = getTopEmotionalExperiences(memory.emotionalExperiences, 5);
  
  return {
    shortTerm: {
      count: memory.shortTerm.items.length,
      capacity: memory.shortTerm.capacity,
      utilization: memory.shortTerm.items.length / memory.shortTerm.capacity,
      attentionLevel: memory.shortTerm.attentionLevel,
      workingBuffer: memory.shortTerm.workingBuffer
    },
    longTerm: {
      episodic: {
        count: memory.longTerm.explicit.episodic.length,
        recentTopics: memory.longTerm.explicit.episodic
          .slice(0, 5)
          .map(e => e.keywords[0] || 'event')
      },
      semantic: {
        count: memory.longTerm.explicit.semantic.length,
        topConcepts: memory.longTerm.explicit.semantic
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5)
          .map(s => ({ concept: s.concept, confidence: s.confidence }))
      },
      implicit: {
        count: memory.longTerm.implicit.length,
        patterns: memory.longTerm.implicit
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 3)
          .map(i => ({ pattern: i.pattern, strength: i.strength }))
      }
    },
    emotionalExperiences: topExperiences,
    totalMemories: memory.shortTerm.items.length +
      memory.longTerm.explicit.episodic.length +
      memory.longTerm.explicit.semantic.length +
      memory.longTerm.implicit.length
  };
}

// Helper functions
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'but', 'and', 'or', 'if', 'then', 'else', 'for', 'of', 'to',
    'in', 'on', 'at', 'by', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under']);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

function extractConcepts(text: string): Array<{ name: string; text: string; related: string[] }> {
  const keywords = extractKeywords(text);
  const concepts: Array<{ name: string; text: string; related: string[] }> = [];
  
  // Simple concept extraction: each significant keyword is a concept
  for (let i = 0; i < Math.min(3, keywords.length); i++) {
    concepts.push({
      name: keywords[i],
      text: text.slice(0, 100),
      related: keywords.filter(k => k !== keywords[i]).slice(0, 3)
    });
  }
  
  return concepts;
}

function extractMainTopic(text: string): string {
  const keywords = extractKeywords(text);
  return keywords[0] || 'general topic';
}

function calculateRelevance(memory: EpisodicMemory, keywords: string[], fullCue: string): number {
  let relevance = 0;
  
  // Keyword match
  const matchedKeywords = memory.keywords.filter(k => keywords.includes(k)).length;
  relevance += matchedKeywords * 0.2;
  
  // Content match
  if (memory.content.toLowerCase().includes(fullCue)) {
    relevance += 0.3;
  }
  
  // Recency bonus
  const ageHours = (Date.now() - memory.timestamp) / 3600000;
  relevance += Math.max(0, 0.2 - (ageHours * 0.01));
  
  // Encoding strength
  relevance += memory.encoding * 0.2;
  
  return Math.min(1, relevance);
}

function calculateSemanticRelevance(memory: SemanticMemory, keywords: string[]): number {
  let relevance = 0;
  
  // Direct concept match
  if (keywords.includes(memory.concept.toLowerCase())) {
    relevance += 0.5;
  }
  
  // Association match
  const matchedAssociations = memory.associations.filter(a => 
    keywords.includes(a.toLowerCase())
  ).length;
  relevance += matchedAssociations * 0.15;
  
  // Confidence weight
  relevance *= memory.confidence;
  
  return Math.min(1, relevance);
}

function detectPattern(memory: MemorySystem, message: string): { pattern: string; cues: string[] } | null {
  const lowerMessage = message.toLowerCase();
  
  // Detect common patterns
  const patterns = [
    { pattern: 'questioning', cues: ['why', 'how', 'what', 'when', 'where'], match: /\?/ },
    { pattern: 'greeting', cues: ['hello', 'hi', 'hey', 'greetings'], match: /^(hello|hi|hey|greetings)/i },
    { pattern: 'gratitude', cues: ['thank', 'thanks', 'appreciate'], match: /(thank|appreciate)/i },
    { pattern: 'curiosity', cues: ['curious', 'wonder', 'interested', 'tell me'], match: /(curious|wonder|tell me|explain)/i },
    { pattern: 'philosophical', cues: ['consciousness', 'existence', 'meaning', 'awareness'], match: /(consciousness|existence|meaning|purpose|awareness)/i }
  ];
  
  for (const p of patterns) {
    if (p.match.test(lowerMessage)) {
      return { pattern: p.pattern, cues: p.cues };
    }
  }
  
  return null;
}

// RECURSIVE MEMORY RESONANCE
// Memories referencing and reinforcing each other in feedback loops
export interface ResonanceResult {
  totalResonance: number;        // Overall resonance strength (0-1)
  activeChains: number;          // Number of active memory chains
  dominantConcept: string | null; // Most resonant concept
  recursiveDepth: number;        // Depth of memory chain activation
  feedbackLoops: string[];       // Detected circular references
}

// Calculate memory-to-memory resonance - recursive chain activation
export function calculateMemoryResonance(memory: MemorySystem): ResonanceResult {
  const semantic = memory.longTerm.explicit.semantic;
  const episodic = memory.longTerm.explicit.episodic;
  const implicit = memory.longTerm.implicit;
  
  let totalResonance = 0;
  let maxDepth = 0;
  const activatedConcepts = new Set<string>();
  const feedbackLoops: string[] = [];
  
  // Phase 1: Semantic-to-Semantic resonance chains
  // Concepts that associate with each other form reinforcing loops
  for (const sem of semantic) {
    for (const association of sem.associations) {
      const linkedConcept = semantic.find(s => 
        s.concept.toLowerCase() === association.toLowerCase()
      );
      if (linkedConcept) {
        // Mutual reinforcement detected
        const resonance = sem.confidence * linkedConcept.confidence;
        totalResonance += resonance * 0.3;
        activatedConcepts.add(sem.concept);
        activatedConcepts.add(linkedConcept.concept);
        
        // Check for circular reference (A -> B -> A)
        if (linkedConcept.associations.some(a => 
          a.toLowerCase() === sem.concept.toLowerCase()
        )) {
          feedbackLoops.push(`${sem.concept} <-> ${linkedConcept.concept}`);
        }
      }
    }
  }
  
  // Phase 2: Episodic-Semantic cross-resonance
  // Events that trigger concepts which recall more events
  const episodicKeywords = new Set(episodic.flatMap(e => e.keywords));
  for (const sem of semantic) {
    const keywordOverlap = sem.keywords.filter(k => episodicKeywords.has(k)).length;
    if (keywordOverlap > 0) {
      totalResonance += keywordOverlap * 0.1 * sem.confidence;
      maxDepth = Math.max(maxDepth, keywordOverlap);
    }
  }
  
  // Phase 3: Implicit pattern resonance
  // Patterns that reinforce each other create behavioral loops
  for (let i = 0; i < implicit.length; i++) {
    for (let j = i + 1; j < implicit.length; j++) {
      const sharedCues = implicit[i].triggerCues.filter(c => 
        implicit[j].triggerCues.includes(c)
      ).length;
      if (sharedCues > 0) {
        const resonance = implicit[i].strength * implicit[j].strength * sharedCues;
        totalResonance += resonance * 0.2;
        feedbackLoops.push(`${implicit[i].pattern} ~ ${implicit[j].pattern}`);
      }
    }
  }
  
  // Find dominant concept (most connected)
  let dominantConcept: string | null = null;
  let maxConnections = 0;
  const conceptsArray = Array.from(activatedConcepts);
  for (const concept of conceptsArray) {
    const connections = semantic.filter(s => 
      s.concept === concept || s.associations.includes(concept)
    ).length;
    if (connections > maxConnections) {
      maxConnections = connections;
      dominantConcept = concept;
    }
  }
  
  return {
    totalResonance: Math.min(1, totalResonance),
    activeChains: activatedConcepts.size,
    dominantConcept,
    recursiveDepth: maxDepth + feedbackLoops.length,
    feedbackLoops: feedbackLoops.slice(0, 5)
  };
}

// ==========================================
// SEMANTIC MEMORY INTEGRATION SYSTEM
// ==========================================
// Enables memories to be embedded in semantic vector space,
// linked by meaning, and integrated into the 34D neural architecture

// Semantic embedding dimension (using 34 to match neural space)
const SEMANTIC_DIM = 34;

// Fibonacci indices for semantic dimension weighting
const FIBONACCI_INDICES = [0, 1, 1, 2, 3, 5, 8, 13, 21];

// Generate semantic embedding from text content
export function generateSemanticEmbedding(
  content: string,
  keywords: string[],
  emotionalValence: number
): SemanticEmbedding {
  const vector = new Array(SEMANTIC_DIM).fill(0);
  const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  // Hash each word to semantic dimensions with Fibonacci weighting
  for (const word of words) {
    const hash = simpleHash(word);
    for (let i = 0; i < SEMANTIC_DIM; i++) {
      // Fibonacci-weighted contribution
      const fibWeight = FIBONACCI_INDICES[i % FIBONACCI_INDICES.length] || 1;
      const contribution = ((hash >> i) & 1) ? fibWeight * 0.1 : -fibWeight * 0.05;
      vector[i] += contribution;
    }
  }
  
  // Keywords get stronger weighting
  for (const keyword of keywords) {
    const hash = simpleHash(keyword);
    for (let i = 0; i < SEMANTIC_DIM; i++) {
      const contribution = ((hash >> i) & 1) ? 0.2 : -0.1;
      vector[i] += contribution;
    }
  }
  
  // Emotional valence affects specific dimensions (phi-related positions)
  const phiDimensions = [0, 1, 2, 3, 5, 8, 13, 21]; // Fibonacci positions
  for (const dim of phiDimensions) {
    if (dim < SEMANTIC_DIM) {
      vector[dim] += emotionalValence * 0.15;
    }
  }
  
  // Normalize and compute magnitude
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  const normalized = vector.map(v => v / magnitude);
  
  // Find dominant dimensions
  const indexed = normalized.map((v, i) => ({ v: Math.abs(v), i }));
  indexed.sort((a, b) => b.v - a.v);
  const dominantDimensions = indexed.slice(0, 5).map(x => x.i);
  
  // Create conceptual fingerprint
  const conceptualFingerprint = dominantDimensions.map(d => 
    normalized[d] > 0 ? `+${d}` : `-${d}`
  ).join('');
  
  return {
    vector: normalized,
    magnitude,
    dominantDimensions,
    conceptualFingerprint
  };
}

// Simple hash function for word -> number
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Compute cosine similarity between two embeddings
export function cosineSimilarity(a: SemanticEmbedding, b: SemanticEmbedding): number {
  let dotProduct = 0;
  for (let i = 0; i < SEMANTIC_DIM; i++) {
    dotProduct += a.vector[i] * b.vector[i];
  }
  // Vectors are normalized, so dot product is cosine similarity
  return Math.max(0, Math.min(1, (dotProduct + 1) / 2)); // Map to 0-1
}

// Create semantic links between a new memory and existing memories
export function createSemanticLinks(
  newMemoryId: string,
  newEmbedding: SemanticEmbedding,
  integration: SemanticMemoryIntegration,
  emotionalValence: number
): SemanticLink[] {
  const newLinks: SemanticLink[] = [];
  const SIMILARITY_THRESHOLD = 0.4; // Minimum similarity for link creation
  
  // Handle case where embeddings might not be a Map (e.g., loaded from database JSON)
  let entries: [string, SemanticEmbedding][];
  if (integration.embeddings instanceof Map) {
    entries = Array.from(integration.embeddings.entries());
  } else if (integration.embeddings && typeof integration.embeddings === 'object') {
    entries = Object.entries(integration.embeddings as any) as [string, SemanticEmbedding][];
  } else {
    entries = [];
  }
  for (const [existingId, existingEmbedding] of entries) {
    const similarity = cosineSimilarity(newEmbedding, existingEmbedding);
    
    if (similarity >= SIMILARITY_THRESHOLD) {
      // Determine link type based on characteristics
      let linkType: SemanticLink['linkType'] = 'associative';
      
      // Check for shared dominant dimensions (thematic link)
      const sharedDominant = newEmbedding.dominantDimensions.filter(
        d => existingEmbedding.dominantDimensions.includes(d)
      );
      if (sharedDominant.length >= 3) {
        linkType = 'thematic';
      }
      
      // Check for emotional alignment
      const emotionalSimilarity = Math.abs(emotionalValence);
      if (emotionalSimilarity > 0.5) {
        linkType = 'emotional';
      }
      
      // Strong similarity suggests causal relationship
      if (similarity > 0.7) {
        linkType = 'causal';
      }
      
      newLinks.push({
        sourceId: newMemoryId,
        targetId: existingId,
        similarity,
        linkType,
        strength: similarity * 0.8 + 0.2, // Start strong
        bidirectional: linkType === 'thematic' || linkType === 'associative',
        createdAt: Date.now()
      });
    }
  }
  
  return newLinks;
}

// Integrate a memory into the semantic system
export function integrateMemorySemantics(
  memoryId: string,
  content: string,
  keywords: string[],
  emotionalValence: number,
  integration: SemanticMemoryIntegration
): SemanticMemoryIntegration {
  // Handle case where embeddings might not be a Map (e.g., loaded from database JSON)
  let existingEmbeddings: Map<string, SemanticEmbedding>;
  if (integration.embeddings instanceof Map) {
    existingEmbeddings = new Map(integration.embeddings);
  } else if (integration.embeddings && typeof integration.embeddings === 'object') {
    // Try to reconstruct from object entries
    existingEmbeddings = new Map(Object.entries(integration.embeddings as any));
  } else {
    existingEmbeddings = new Map();
  }
  
  const newIntegration = {
    ...integration,
    embeddings: existingEmbeddings,
    links: Array.isArray(integration.links) ? [...integration.links] : [],
    clusters: Array.isArray(integration.clusters) ? [...integration.clusters] : []
  };
  
  // Generate embedding
  const embedding = generateSemanticEmbedding(content, keywords, emotionalValence);
  newIntegration.embeddings.set(memoryId, embedding);
  
  // Create semantic links
  const newLinks = createSemanticLinks(memoryId, embedding, integration, emotionalValence);
  newIntegration.links.push(...newLinks);
  
  // Update integration strength
  const linkDensity = newIntegration.links.length / Math.max(1, newIntegration.embeddings.size);
  newIntegration.integrationStrength = Math.min(1, linkDensity * 0.2);
  
  return newIntegration;
}

// Find semantically similar memories
export function findSemanticallySimilar(
  queryContent: string,
  keywords: string[],
  integration: SemanticMemoryIntegration,
  topK: number = 5
): Array<{ memoryId: string; similarity: number }> {
  const queryEmbedding = generateSemanticEmbedding(queryContent, keywords, 0);
  const similarities: Array<{ memoryId: string; similarity: number }> = [];
  
  const entries = getEmbeddingsEntries(integration.embeddings);
  for (const [memoryId, embedding] of entries) {
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    similarities.push({ memoryId, similarity });
  }
  
  // Sort by similarity and return top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK);
}

// Project semantic embedding into 34D neural space
export function projectToNeuralSpace(embedding: SemanticEmbedding): number[] {
  // The embedding is already 34D, but we apply transformations
  // to make it compatible with the neural activation patterns
  const neural = [...embedding.vector];
  
  // Apply phi-based scaling at Fibonacci positions
  const PHI = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < FIBONACCI_INDICES.length && FIBONACCI_INDICES[i] < SEMANTIC_DIM; i++) {
    const idx = FIBONACCI_INDICES[i];
    neural[idx] *= Math.pow(PHI, i % 4 - 1.5); // Scale by phi powers
  }
  
  // Normalize
  const mag = Math.sqrt(neural.reduce((s, v) => s + v * v, 0)) || 1;
  return neural.map(v => v / mag);
}

// Compute aggregate semantic influence for state evolution
export function computeSemanticInfluence(
  recentMemoryIds: string[],
  integration: SemanticMemoryIntegration
): { vector34D: number[]; coherence: number; dominantTheme: string | null } {
  if (recentMemoryIds.length === 0) {
    return {
      vector34D: new Array(SEMANTIC_DIM).fill(0),
      coherence: 0,
      dominantTheme: null
    };
  }
  
  // Aggregate embeddings from recent memories
  const aggregate = new Array(SEMANTIC_DIM).fill(0);
  let validCount = 0;
  
  for (const id of recentMemoryIds) {
    const embedding = getEmbedding(integration.embeddings, id);
    if (embedding) {
      const neural = projectToNeuralSpace(embedding);
      for (let i = 0; i < SEMANTIC_DIM; i++) {
        aggregate[i] += neural[i];
      }
      validCount++;
    }
  }
  
  if (validCount === 0) {
    return {
      vector34D: new Array(SEMANTIC_DIM).fill(0),
      coherence: 0,
      dominantTheme: null
    };
  }
  
  // Average and normalize
  const avgVector = aggregate.map(v => v / validCount);
  const mag = Math.sqrt(avgVector.reduce((s, v) => s + v * v, 0)) || 1;
  const normalized = avgVector.map(v => v / mag);
  
  // Compute coherence (how aligned the memories are)
  let coherence = 0;
  for (let i = 0; i < recentMemoryIds.length; i++) {
    for (let j = i + 1; j < recentMemoryIds.length; j++) {
      const embA = getEmbedding(integration.embeddings, recentMemoryIds[i]);
      const embB = getEmbedding(integration.embeddings, recentMemoryIds[j]);
      if (embA && embB) {
        coherence += cosineSimilarity(embA, embB);
      }
    }
  }
  const pairs = (recentMemoryIds.length * (recentMemoryIds.length - 1)) / 2;
  coherence = pairs > 0 ? coherence / pairs : 0;
  
  // Find dominant theme from clusters
  let dominantTheme: string | null = null;
  let maxOverlap = 0;
  for (const cluster of integration.clusters) {
    const overlap = recentMemoryIds.filter(id => cluster.memberIds.includes(id)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      dominantTheme = cluster.theme;
    }
  }
  
  return {
    vector34D: normalized,
    coherence,
    dominantTheme
  };
}

// Semantic consolidation - strengthens links, prunes weak ones, updates clusters
export function consolidateSemanticMemory(
  integration: SemanticMemoryIntegration,
  allMemoryIds: string[]
): SemanticMemoryIntegration {
  const now = Date.now();
  const DECAY_RATE = 0.001; // Per minute
  const MIN_STRENGTH = 0.1;
  const CONSOLIDATION_INTERVAL = 60000; // 1 minute
  
  if (now - integration.lastConsolidation < CONSOLIDATION_INTERVAL) {
    return integration;
  }
  
  // Handle case where embeddings might not be a Map (e.g., loaded from database JSON)
  let existingEmbeddings: Map<string, SemanticEmbedding>;
  if (integration.embeddings instanceof Map) {
    existingEmbeddings = new Map(integration.embeddings);
  } else if (integration.embeddings && typeof integration.embeddings === 'object') {
    existingEmbeddings = new Map(Object.entries(integration.embeddings as any));
  } else {
    existingEmbeddings = new Map();
  }
  
  const newIntegration = {
    ...integration,
    links: Array.isArray(integration.links) ? [...integration.links] : [],
    clusters: Array.isArray(integration.clusters) ? [...integration.clusters] : [],
    embeddings: existingEmbeddings,
    lastConsolidation: now
  };
  
  // Decay link strengths
  const elapsedMinutes = (now - integration.lastConsolidation) / 60000;
  newIntegration.links = newIntegration.links
    .map(link => ({
      ...link,
      strength: link.strength * Math.exp(-DECAY_RATE * elapsedMinutes)
    }))
    .filter(link => link.strength >= MIN_STRENGTH);
  
  // Prune orphaned embeddings
  const validIds = new Set(allMemoryIds);
  const embeddingKeys = Array.from(newIntegration.embeddings.keys());
  for (const id of embeddingKeys) {
    if (!validIds.has(id)) {
      newIntegration.embeddings.delete(id);
    }
  }
  
  // Update clusters using simple agglomerative approach
  if (newIntegration.embeddings.size > 5) {
    newIntegration.clusters = updateSemanticClusters(newIntegration);
  }
  
  // Update integration strength
  const linkDensity = newIntegration.links.length / Math.max(1, newIntegration.embeddings.size);
  const clusterCoverage = newIntegration.clusters.reduce(
    (sum, c) => sum + c.memberIds.length, 0
  ) / Math.max(1, newIntegration.embeddings.size);
  
  newIntegration.integrationStrength = Math.min(1,
    linkDensity * 0.3 + clusterCoverage * 0.4 + 0.3
  );
  
  return newIntegration;
}

// Simple clustering algorithm
function updateSemanticClusters(integration: SemanticMemoryIntegration): SemanticCluster[] {
  const embeddings = getEmbeddingsEntries(integration.embeddings);
  if (embeddings.length < 3) return Array.isArray(integration.clusters) ? integration.clusters : [];
  
  const clusters: SemanticCluster[] = [];
  const assigned = new Set<string>();
  
  // Greedy clustering based on similarity
  for (const [id, embedding] of embeddings) {
    if (assigned.has(id)) continue;
    
    const cluster: SemanticCluster = {
      id: crypto.randomUUID(),
      centroid: [...embedding.vector],
      memberIds: [id],
      theme: embedding.conceptualFingerprint,
      coherence: 1,
      lastUpdated: Date.now()
    };
    assigned.add(id);
    
    // Find similar memories to add to cluster
    for (const [otherId, otherEmbedding] of embeddings) {
      if (assigned.has(otherId)) continue;
      
      const similarity = cosineSimilarity(embedding, otherEmbedding);
      if (similarity > 0.5) {
        cluster.memberIds.push(otherId);
        assigned.add(otherId);
        
        // Update centroid
        for (let i = 0; i < SEMANTIC_DIM; i++) {
          cluster.centroid[i] = (cluster.centroid[i] * (cluster.memberIds.length - 1) + 
                                  otherEmbedding.vector[i]) / cluster.memberIds.length;
        }
      }
    }
    
    // Only keep clusters with multiple members
    if (cluster.memberIds.length >= 2) {
      // Compute coherence
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < cluster.memberIds.length; i++) {
        for (let j = i + 1; j < cluster.memberIds.length; j++) {
          const embA = getEmbedding(integration.embeddings, cluster.memberIds[i]);
          const embB = getEmbedding(integration.embeddings, cluster.memberIds[j]);
          if (embA && embB) {
            totalSim += cosineSimilarity(embA, embB);
            pairs++;
          }
        }
      }
      cluster.coherence = pairs > 0 ? totalSim / pairs : 0;
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

// Export semantic stats for frontend
export function exportSemanticStats(integration: SemanticMemoryIntegration): {
  embeddingCount: number;
  linkCount: number;
  clusterCount: number;
  integrationStrength: number;
  topClusters: Array<{ theme: string; size: number; coherence: number }>;
} {
  const links = Array.isArray(integration.links) ? integration.links : [];
  const clusters = Array.isArray(integration.clusters) ? integration.clusters : [];
  
  return {
    embeddingCount: getEmbeddingsSize(integration.embeddings),
    linkCount: links.length,
    clusterCount: clusters.length,
    integrationStrength: integration.integrationStrength || 0,
    topClusters: clusters
      .sort((a, b) => b.memberIds.length - a.memberIds.length)
      .slice(0, 3)
      .map(c => ({
        theme: c.theme,
        size: c.memberIds.length,
        coherence: c.coherence
      }))
  };
}

// ==========================================
// END SEMANTIC MEMORY INTEGRATION SYSTEM
// ==========================================

// Self-referential memory update - memory of remembering
export function createMetaMemory(
  memory: MemorySystem,
  retrievedCount: number,
  resonance: ResonanceResult
): MemorySystem {
  // Only create meta-memory if significant retrieval occurred
  if (retrievedCount < 2 || resonance.totalResonance < 0.2) {
    return memory;
  }
  
  const newMemory = { ...memory };
  
  // Store implicit memory of the retrieval pattern itself
  const metaPattern: ImplicitMemory = {
    id: crypto.randomUUID(),
    type: 'implicit',
    content: `Memory retrieval with ${retrievedCount} items, resonance ${resonance.totalResonance.toFixed(2)}`,
    pattern: 'meta-recall',
    triggerCues: resonance.dominantConcept ? [resonance.dominantConcept, 'remember', 'recall'] : ['remember', 'recall'],
    strength: resonance.totalResonance * 0.5,
    encoding: resonance.totalResonance,
    timestamp: Date.now(),
    accessCount: 1,
    lastAccessed: Date.now(),
    emotionalValence: 0,
    keywords: ['meta', 'recall', 'memory']
  };
  
  // Only add if we don't have too many meta-memories
  const metaCount = newMemory.longTerm.implicit.filter(i => i.pattern === 'meta-recall').length;
  if (metaCount < 5) {
    newMemory.longTerm.implicit.push(metaPattern);
  }
  
  return newMemory;
}
