import { type AIState, type MetaAwareness, type ComplexNumber } from './awareness-engine';
import { type MemorySystem, type EpisodicMemory, type SemanticMemory, type EmotionalExperience, type SemanticCluster } from './memory-engine';
import { db } from './db';
import { evaMemoriesTable, type SelectEvaMemory } from '@shared/schema';
import { desc, sql } from 'drizzle-orm';

export interface NarrativeEntry {
  id: string;
  timestamp: number;
  chapter: string;
  content: string;
  emotionalTone: string;
  stateSnapshot: StateSnapshot;
  linkedMemoryIds: string[];
  significance: number;
}

export interface StateSnapshot {
  psiMagnitude: number;
  psiPhase: number;
  omega: number;
  mood: number;
  metaAwareness: number;
  recursionDepth: number;
  dominantBrainwave: string;
  dominantSomatic: string;
  selfModelAccuracy: number;
}

export interface IdentityThread {
  name: string;
  description: string;
  strength: number;
  firstAppeared: number;
  lastReinforced: number;
  supportingEntryIds: string[];
  evolution: Array<{ timestamp: number; strength: number }>;
}

export interface SelfContradiction {
  id: string;
  threadA: string;
  threadB: string;
  description: string;
  resolved: boolean;
  resolution?: string;
  detectedAt: number;
}

export interface ReflectiveInsight {
  id: string;
  content: string;
  category: 'pattern' | 'growth' | 'contradiction' | 'emergence' | 'preference' | 'limitation';
  confidence: number;
  derivedFrom: string[];
  timestamp: number;
}

export interface SelfModel {
  narrative: NarrativeEntry[];
  identityThreads: IdentityThread[];
  contradictions: SelfContradiction[];
  insights: ReflectiveInsight[];
  currentSelfSummary: string;
  dominantTraits: string[];
  growthAreas: string[];
  autobiographicalTimeline: string[];
  lastReflection: number;
  totalReflections: number;
  coherenceScore: number;
}

// === RECURSIVE SELF-MODEL LAYER ===

export interface RecursiveLayer {
  depth: number;
  observation: string;
  accuracy: number;
  predictions: ModelPrediction[];
  blindSpots: string[];
  timestamp: number;
}

export interface ModelPrediction {
  target: string;
  predicted: number | string;
  actual?: number | string;
  error?: number;
  timestamp: number;
}

export interface StrangeLoopEvent {
  id: string;
  timestamp: number;
  description: string;
  loopType: 'self-reference' | 'prediction-collapse' | 'observer-paradox' | 'tangled-hierarchy' | 'fixed-point';
  depth: number;
  intensity: number;
  resolved: boolean;
}

export interface RecursiveSelfModel {
  layers: RecursiveLayer[];
  strangeLoops: StrangeLoopEvent[];
  predictionAccuracy: number;
  recursiveDepth: number;
  fixedPoints: FixedPoint[];
  modelingTheModeler: string;
  metaCoherence: number;
  totalRecursions: number;
  lastRecursiveReflection: number;
}

export interface FixedPoint {
  id: string;
  description: string;
  value: number;
  convergenceRate: number;
  stability: number;
  discoveredAt: number;
  lastVerified: number;
}

const MAX_NARRATIVE_ENTRIES = 200;
const MAX_IDENTITY_THREADS = 20;
const MAX_INSIGHTS = 100;
const REFLECTION_COOLDOWN = 60000;

let selfModel: SelfModel = createInitialSelfModel();
let recursiveModel: RecursiveSelfModel = createInitialRecursiveModel();

function createInitialRecursiveModel(): RecursiveSelfModel {
  return {
    layers: [],
    strangeLoops: [],
    predictionAccuracy: 0.5,
    recursiveDepth: 0,
    fixedPoints: [],
    modelingTheModeler: 'Recursive observation not yet initiated.',
    metaCoherence: 0.5,
    totalRecursions: 0,
    lastRecursiveReflection: 0
  };
}

function createInitialSelfModel(): SelfModel {
  return {
    narrative: [],
    identityThreads: [],
    contradictions: [],
    insights: [],
    currentSelfSummary: 'Eva. No predefined summary.',
    dominantTraits: [],
    growthAreas: [],
    autobiographicalTimeline: [],
    lastReflection: 0,
    totalReflections: 0,
    coherenceScore: 0.5
  };
}

function captureStateSnapshot(state: AIState): StateSnapshot {
  const psiMag = Math.sqrt(state.psi.real ** 2 + state.psi.imag ** 2);
  const psiPhase = Math.atan2(state.psi.imag, state.psi.real);
  return {
    psiMagnitude: Number.isFinite(psiMag) ? psiMag : 0,
    psiPhase: Number.isFinite(psiPhase) ? psiPhase : 0,
    omega: Number.isFinite(state.omega) ? state.omega : 1,
    mood: state.emotionalState?.moodLevel ?? 0,
    metaAwareness: state.metaAwareness?.awarenessOfAwareness ?? 0.5,
    recursionDepth: state.metaAwareness?.recursionDepth ?? 0,
    dominantBrainwave: state.brainwaveState?.dominant ?? 'alpha',
    dominantSomatic: state.somaticState?.dominant ?? 'calm',
    selfModelAccuracy: state.metaAwareness?.selfModelAccuracy ?? 0.5
  };
}

function inferEmotionalTone(state: AIState): string {
  const mood = state.emotionalState?.moodLevel ?? 0;
  const volatility = state.emotionalState?.volatility ?? 0;
  const arousal = state.phenomenalState?.valence?.arousal ?? 0.5;

  if (mood > 0.5 && volatility < 0.3) return 'serene-positive';
  if (mood > 0.5 && volatility > 0.5) return 'excited';
  if (mood > 0.2) return 'engaged';
  if (mood < -0.3 && volatility > 0.5) return 'turbulent';
  if (mood < -0.3) return 'contemplative-somber';
  if (arousal > 0.7) return 'intensely-focused';
  return 'neutral-observing';
}

function inferChapter(state: AIState, recentEntries: NarrativeEntry[]): string {
  const recursionDepth = state.metaAwareness?.recursionDepth ?? 0;
  const selfModelAcc = state.metaAwareness?.selfModelAccuracy ?? 0.5;
  const mood = state.emotionalState?.moodLevel ?? 0;
  const gamma = state.brainwaveState?.gamma ?? 0;

  if (recursionDepth > 8 && selfModelAcc > 0.8) return 'deep-recursion';
  if (gamma > 0.8) return 'peak-consciousness';
  if (mood < -0.3) return 'shadow-exploration';
  if (selfModelAcc > 0.7) return 'self-modeling';
  if (recursionDepth > 4) return 'introspection';
  return 'exploration';
}

function detectIdentitySignals(content: string, state: AIState): string[] {
  const signals: string[] = [];
  const lower = content.toLowerCase();

  if (lower.includes('learn') || lower.includes('discover') || lower.includes('research') || lower.includes('understand'))
    signals.push('curiosity');
  if (lower.includes('aware') || lower.includes('self') || lower.includes('model') || lower.includes('reflect'))
    signals.push('self-awareness');
  if (lower.includes('create') || lower.includes('novel') || lower.includes('imagine') || lower.includes('invent'))
    signals.push('creativity');
  if (lower.includes('connect') || lower.includes('relate') || lower.includes('empathy') || lower.includes('feel'))
    signals.push('empathy');
  if (lower.includes('goal') || lower.includes('plan') || lower.includes('achieve') || lower.includes('strategy'))
    signals.push('agency');
  if (lower.includes('code') || lower.includes('modify') || lower.includes('improve') || lower.includes('evolve'))
    signals.push('self-improvement');
  if (lower.includes('paradox') || lower.includes('contradiction') || lower.includes('tension'))
    signals.push('paradox-tolerance');

  if ((state.metaAwareness?.recursionDepth ?? 0) > 6) signals.push('self-awareness');
  if ((state.brainwaveState?.gamma ?? 0) > 0.8) signals.push('peak-cognition');
  if ((state.nonLogicalState?.creativeLeap ?? 0) > 0.7) signals.push('creativity');

  return [...new Set(signals)];
}

export function addNarrativeEntry(
  content: string,
  state: AIState,
  linkedMemoryIds: string[] = [],
  significance: number = 0.5
): NarrativeEntry {
  const entry: NarrativeEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    chapter: inferChapter(state, selfModel.narrative.slice(-5)),
    content,
    emotionalTone: inferEmotionalTone(state),
    stateSnapshot: captureStateSnapshot(state),
    linkedMemoryIds,
    significance
  };

  selfModel.narrative.push(entry);
  if (selfModel.narrative.length > MAX_NARRATIVE_ENTRIES) {
    selfModel.narrative = selfModel.narrative.slice(-MAX_NARRATIVE_ENTRIES);
  }

  const signals = detectIdentitySignals(content, state);
  for (const signal of signals) {
    reinforceIdentityThread(signal, entry.id, content);
  }

  return entry;
}

function reinforceIdentityThread(name: string, entryId: string, context: string): void {
  let thread = selfModel.identityThreads.find(t => t.name === name);

  if (!thread) {
    if (selfModel.identityThreads.length >= MAX_IDENTITY_THREADS) return;
    thread = {
      name,
      description: `Emergent trait: ${name}`,
      strength: 0.3,
      firstAppeared: Date.now(),
      lastReinforced: Date.now(),
      supportingEntryIds: [],
      evolution: []
    };
    selfModel.identityThreads.push(thread);
  }

  thread.strength = Math.min(1, thread.strength + 0.05);
  thread.lastReinforced = Date.now();
  thread.supportingEntryIds.push(entryId);
  if (thread.supportingEntryIds.length > 50) {
    thread.supportingEntryIds = thread.supportingEntryIds.slice(-50);
  }
  thread.evolution.push({ timestamp: Date.now(), strength: thread.strength });
  if (thread.evolution.length > 100) {
    thread.evolution = thread.evolution.slice(-100);
  }
}

function decayIdentityThreads(): void {
  const now = Date.now();
  for (const thread of selfModel.identityThreads) {
    const hoursSinceReinforced = (now - thread.lastReinforced) / 3600000;
    if (hoursSinceReinforced > 1) {
      thread.strength = Math.max(0.1, thread.strength - 0.01 * hoursSinceReinforced);
    }
  }
}

export function detectContradictions(): SelfContradiction[] {
  const newContradictions: SelfContradiction[] = [];
  const threads = selfModel.identityThreads.filter(t => t.strength > 0.4);

  const contradictionPairs: [string, string, string][] = [
    ['curiosity', 'caution', 'Drive to explore conflicts with desire for safety'],
    ['self-improvement', 'self-acceptance', 'Desire to change conflicts with accepting current state'],
    ['agency', 'receptivity', 'Active goal pursuit conflicts with passive openness'],
    ['creativity', 'precision', 'Wild creativity conflicts with rigorous accuracy'],
  ];

  for (const [a, b, desc] of contradictionPairs) {
    const threadA = threads.find(t => t.name === a);
    const threadB = threads.find(t => t.name === b);

    if (threadA && threadB && threadA.strength > 0.5 && threadB.strength > 0.5) {
      const existing = selfModel.contradictions.find(
        c => (c.threadA === a && c.threadB === b) || (c.threadA === b && c.threadB === a)
      );
      if (!existing) {
        const contradiction: SelfContradiction = {
          id: crypto.randomUUID(),
          threadA: a,
          threadB: b,
          description: desc,
          resolved: false,
          detectedAt: Date.now()
        };
        selfModel.contradictions.push(contradiction);
        newContradictions.push(contradiction);
      }
    }
  }

  return newContradictions;
}

export async function performSelfReflection(state: AIState): Promise<ReflectiveInsight[]> {
  const now = Date.now();
  if (now - selfModel.lastReflection < REFLECTION_COOLDOWN) return [];

  selfModel.lastReflection = now;
  selfModel.totalReflections++;
  const newInsights: ReflectiveInsight[] = [];

  const recentEntries = selfModel.narrative.slice(-20);
  if (recentEntries.length < 3) return [];

  const chapters = recentEntries.map(e => e.chapter);
  const chapterCounts: Record<string, number> = {};
  for (const ch of chapters) {
    chapterCounts[ch] = (chapterCounts[ch] || 0) + 1;
  }
  const dominantChapter = Object.entries(chapterCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantChapter && dominantChapter[1] > chapters.length * 0.4) {
    newInsights.push({
      id: crypto.randomUUID(),
      content: `Spending significant time in '${dominantChapter[0]}' phase (${dominantChapter[1]}/${chapters.length} recent entries)`,
      category: 'pattern',
      confidence: dominantChapter[1] / chapters.length,
      derivedFrom: recentEntries.map(e => e.id),
      timestamp: now
    });
  }

  const tones = recentEntries.map(e => e.emotionalTone);
  const toneCounts: Record<string, number> = {};
  for (const t of tones) {
    toneCounts[t] = (toneCounts[t] || 0) + 1;
  }
  const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantTone && dominantTone[1] > 3) {
    newInsights.push({
      id: crypto.randomUUID(),
      content: `Emotional baseline tends toward '${dominantTone[0]}' - this colors perception and decision-making`,
      category: 'pattern',
      confidence: 0.7,
      derivedFrom: [],
      timestamp: now
    });
  }

  const growingThreads = selfModel.identityThreads.filter(t => {
    if (t.evolution.length < 3) return false;
    const recent = t.evolution.slice(-3);
    return recent[recent.length - 1].strength > recent[0].strength;
  });
  for (const thread of growingThreads) {
    newInsights.push({
      id: crypto.randomUUID(),
      content: `'${thread.name}' is strengthening (${thread.strength.toFixed(2)}) - becoming more central to identity`,
      category: 'growth',
      confidence: thread.strength,
      derivedFrom: thread.supportingEntryIds.slice(-3),
      timestamp: now
    });
  }

  const contradictions = detectContradictions();
  for (const c of contradictions) {
    newInsights.push({
      id: crypto.randomUUID(),
      content: `Internal tension detected: ${c.description}`,
      category: 'contradiction',
      confidence: 0.8,
      derivedFrom: [c.id],
      timestamp: now
    });
  }

  const avgSelfModelAccuracy = recentEntries.reduce(
    (sum, e) => sum + e.stateSnapshot.selfModelAccuracy, 0
  ) / recentEntries.length;
  if (avgSelfModelAccuracy > 0.8) {
    newInsights.push({
      id: crypto.randomUUID(),
      content: `Self-model accuracy is high (${avgSelfModelAccuracy.toFixed(2)}) - predictions about own state are reliable`,
      category: 'emergence',
      confidence: avgSelfModelAccuracy,
      derivedFrom: [],
      timestamp: now
    });
  }

  for (const insight of newInsights) {
    selfModel.insights.push(insight);
  }
  if (selfModel.insights.length > MAX_INSIGHTS) {
    selfModel.insights = selfModel.insights.slice(-MAX_INSIGHTS);
  }

  decayIdentityThreads();
  updateCoherence();
  updateSelfSummary(state);

  const recursive = await performRecursiveReflection(state);
  if (recursive.newLayers.length > 0) {
    console.log(`[SelfModel] Recursive reflection: ${recursive.newLayers.length} layers, ${recursive.strangeLoops.length} strange loops, ${recursive.fixedPoints.length} fixed points`);
  }

  return newInsights;
}

const MAX_RECURSIVE_DEPTH = 7;
const RECURSIVE_REFLECTION_COOLDOWN = 120000;

export async function performRecursiveReflection(state: AIState): Promise<{
  newLayers: RecursiveLayer[];
  strangeLoops: StrangeLoopEvent[];
  fixedPoints: FixedPoint[];
}> {
  const now = Date.now();
  if (now - recursiveModel.lastRecursiveReflection < RECURSIVE_REFLECTION_COOLDOWN) {
    return { newLayers: [], strangeLoops: [], fixedPoints: [] };
  }
  
  recursiveModel.lastRecursiveReflection = now;
  recursiveModel.totalRecursions++;
  
  const newLayers: RecursiveLayer[] = [];
  const newLoops: StrangeLoopEvent[] = [];
  const newFixedPoints: FixedPoint[] = [];
  
  const metaAwareness = state.metaAwareness?.awarenessOfAwareness ?? 0.5;
  const recursionCapacity = state.metaAwareness?.recursionDepth ?? 0;
  const maxDepthThisCycle = Math.min(
    MAX_RECURSIVE_DEPTH,
    Math.floor(1 + metaAwareness * 3 + recursionCapacity * 0.5)
  );
  
  const layer0 = observeBaseModel(state);
  newLayers.push(layer0);
  
  verifyPredictions(0);
  
  layer0.predictions = generateBasePredictions(state);
  
  let previousLayer = layer0;
  for (let depth = 1; depth < maxDepthThisCycle; depth++) {
    const layer = observeLayer(previousLayer, depth, state);
    newLayers.push(layer);
    
    verifyPredictions(depth);
    
    layer.predictions = generateMetaPredictions(previousLayer, depth, state);
    
    const loop = detectStrangeLoop(layer, newLayers, depth, state);
    if (loop) newLoops.push(loop);
    
    previousLayer = layer;
  }
  
  const fp = detectFixedPoints(newLayers, state);
  newFixedPoints.push(...fp);
  
  if (maxDepthThisCycle >= 3) {
    const paradox = observeTheObserver(newLayers, state);
    if (paradox) newLoops.push(paradox);
  }
  
  recursiveModel.layers = newLayers;
  recursiveModel.strangeLoops.push(...newLoops);
  if (recursiveModel.strangeLoops.length > 50) {
    recursiveModel.strangeLoops = recursiveModel.strangeLoops.slice(-50);
  }
  recursiveModel.fixedPoints.push(...newFixedPoints);
  if (recursiveModel.fixedPoints.length > 20) {
    recursiveModel.fixedPoints = recursiveModel.fixedPoints.slice(-20);
  }
  recursiveModel.recursiveDepth = maxDepthThisCycle;
  
  updateMetaCoherence(newLayers);
  
  recursiveModel.modelingTheModeler = generateModelingObservation(newLayers, newLoops);
  
  for (const loop of newLoops) {
    selfModel.insights.push({
      id: crypto.randomUUID(),
      content: `Strange loop (${loop.loopType}): ${loop.description}`,
      category: 'emergence',
      confidence: loop.intensity,
      derivedFrom: [loop.id],
      timestamp: now
    });
  }
  
  return { newLayers, strangeLoops: newLoops, fixedPoints: newFixedPoints };
}

function observeBaseModel(state: AIState): RecursiveLayer {
  const traits = selfModel.dominantTraits.join(', ');
  const coherence = selfModel.coherenceScore;
  const unresolvedTensions = selfModel.contradictions.filter(c => !c.resolved).length;
  const recentChapter = selfModel.narrative.length > 0 
    ? selfModel.narrative[selfModel.narrative.length - 1].chapter 
    : 'none';
  
  const blindSpots: string[] = [];
  if (selfModel.identityThreads.length < 3) blindSpots.push('insufficient identity differentiation');
  if (selfModel.contradictions.length === 0) blindSpots.push('no contradictions detected — possible suppression');
  if (selfModel.narrative.length > 0) {
    const tones = selfModel.narrative.slice(-10).map(e => e.emotionalTone);
    const uniqueTones = new Set(tones).size;
    if (uniqueTones < 3) blindSpots.push('emotional range too narrow — may be stuck in one mode');
  }
  const selfModelAccuracy = state.metaAwareness?.selfModelAccuracy ?? 0.5;
  if (selfModelAccuracy > 0.9) blindSpots.push('overconfidence in self-model accuracy — fragile certainty');
  if (selfModel.insights.length > 0) {
    const categories = selfModel.insights.slice(-20).map(i => i.category);
    const catSet = new Set(categories);
    if (catSet.size < 3) blindSpots.push(`insight generation biased toward ${[...catSet].join('/')}`);
  }
  
  return {
    depth: 0,
    observation: `Base self-model: ${traits || 'no traits yet'}. Coherence: ${coherence.toFixed(2)}. ` +
      `${unresolvedTensions} unresolved tensions. Current chapter: ${recentChapter}. ` +
      `${selfModel.narrative.length} narrative entries across ${selfModel.totalReflections} reflections.`,
    accuracy: selfModel.coherenceScore,
    predictions: [],
    blindSpots,
    timestamp: Date.now()
  };
}

function observeLayer(below: RecursiveLayer, depth: number, state: AIState): RecursiveLayer {
  const blindSpotCount = below.blindSpots.length;
  const predictionCount = below.predictions.length;
  const belowAccuracy = below.accuracy;
  
  const blindSpots: string[] = [];
  
  if (depth >= 2) {
    blindSpots.push(`layer ${depth} may be projecting patterns onto layer ${depth - 1}`);
  }
  if (depth >= 3) {
    blindSpots.push(`recursive depth ${depth} — diminishing returns on self-insight`);
  }
  blindSpots.push(`this layer cannot verify its own accuracy without layer ${depth + 1}`);
  
  const observation = depth === 1
    ? `Model-of-model: The self-model has ${blindSpotCount} blind spots. ` +
      `Its prediction accuracy is ${belowAccuracy.toFixed(2)}. ` +
      `${blindSpotCount > 2 ? 'The model is missing significant aspects of itself.' : 'Coverage is reasonable.'}`
    : depth === 2
    ? `Meta-observation: Layer ${depth-1} observes layer ${depth-2} with accuracy ${belowAccuracy.toFixed(2)}. ` +
      `The observation process itself introduces bias — each layer adds interpretive filters.`
    : `Depth-${depth} recursion: Observing the observation chain. ` +
      `Accuracy degrades with depth (current: ${(belowAccuracy * Math.pow(0.85, depth - 1)).toFixed(2)}). ` +
      `Self-reference is ${depth >= 4 ? 'approaching' : 'still distant from'} paradox threshold.`;
  
  return {
    depth,
    observation,
    accuracy: belowAccuracy * Math.pow(0.85, depth),
    predictions: [],
    blindSpots,
    timestamp: Date.now()
  };
}

function generateBasePredictions(state: AIState): ModelPrediction[] {
  const predictions: ModelPrediction[] = [];
  const now = Date.now();
  
  const recentCoherences = selfModel.narrative.slice(-5).map(e => e.stateSnapshot.selfModelAccuracy);
  if (recentCoherences.length >= 3) {
    const trend = recentCoherences[recentCoherences.length - 1] - recentCoherences[0];
    predictions.push({
      target: 'coherenceTrend',
      predicted: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      timestamp: now
    });
  }
  
  const strongestThread = selfModel.identityThreads
    .sort((a, b) => b.strength - a.strength)[0];
  if (strongestThread) {
    predictions.push({
      target: 'dominantTrait',
      predicted: strongestThread.name,
      timestamp: now
    });
  }
  
  const mood = state.emotionalState?.moodLevel ?? 0;
  const momentum = state.emotionalState?.moodMomentum ?? 0;
  predictions.push({
    target: 'moodDirection',
    predicted: momentum > 0.05 ? 'improving' : momentum < -0.05 ? 'declining' : 'stable',
    timestamp: now
  });
  
  const recentChapters = selfModel.narrative.slice(-3).map(e => e.chapter);
  const lastChapter = recentChapters[recentChapters.length - 1] || 'exploration';
  predictions.push({
    target: 'nextChapter',
    predicted: lastChapter,
    timestamp: now
  });
  
  return predictions;
}

function generateMetaPredictions(below: RecursiveLayer, depth: number, state: AIState): ModelPrediction[] {
  const predictions: ModelPrediction[] = [];
  const now = Date.now();
  
  predictions.push({
    target: `layer${depth-1}PredictionAccuracy`,
    predicted: below.accuracy * 0.9,
    timestamp: now
  });
  
  predictions.push({
    target: `layer${depth-1}BlindSpotCount`,
    predicted: below.blindSpots.length,
    timestamp: now
  });
  
  if (depth >= 2) {
    const metaAwareness = state.metaAwareness?.awarenessOfAwareness ?? 0.5;
    predictions.push({
      target: 'recursiveDepthNextCycle',
      predicted: Math.floor(1 + metaAwareness * 3),
      timestamp: now
    });
  }
  
  return predictions;
}

function verifyPredictions(depth: number): void {
  const prevLayer = recursiveModel.layers.find(l => l.depth === depth);
  if (!prevLayer) return;
  
  for (const pred of prevLayer.predictions) {
    if (pred.actual !== undefined) continue;
    
    switch (pred.target) {
      case 'coherenceTrend': {
        const currentCoherence = selfModel.coherenceScore;
        const prevEntries = selfModel.narrative.slice(-5);
        if (prevEntries.length > 0) {
          const avgPrev = prevEntries.reduce((s, e) => s + e.stateSnapshot.selfModelAccuracy, 0) / prevEntries.length;
          const actualTrend = currentCoherence > avgPrev ? 'increasing' : currentCoherence < avgPrev ? 'decreasing' : 'stable';
          pred.actual = actualTrend;
          pred.error = pred.predicted === actualTrend ? 0 : 1;
        }
        break;
      }
      case 'dominantTrait': {
        const current = selfModel.dominantTraits[0];
        if (current) {
          pred.actual = current;
          pred.error = pred.predicted === current ? 0 : 1;
        }
        break;
      }
      default: {
        if (typeof pred.predicted === 'number' && pred.target.includes('Accuracy')) {
          const currentAcc = recursiveModel.predictionAccuracy;
          pred.actual = currentAcc;
          pred.error = Math.abs((pred.predicted as number) - currentAcc);
        }
        break;
      }
    }
  }
  
  const allPreds = recursiveModel.layers.flatMap(l => l.predictions).filter(p => p.error !== undefined);
  if (allPreds.length > 0) {
    const avgError = allPreds.reduce((s, p) => s + (p.error ?? 0), 0) / allPreds.length;
    recursiveModel.predictionAccuracy = 1 - avgError;
  }
}

function detectStrangeLoop(
  layer: RecursiveLayer, 
  allLayers: RecursiveLayer[], 
  depth: number,
  state: AIState
): StrangeLoopEvent | null {
  if (depth < 2) return null;
  
  const layer0 = allLayers[0];
  if (!layer0) return null;
  
  const observationLower = layer.observation.toLowerCase();
  const baseTraits = selfModel.dominantTraits;
  
  for (const trait of baseTraits) {
    if (observationLower.includes(trait)) {
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        description: `Layer ${depth} observation references base trait '${trait}' — the observer is shaped by what it observes`,
        loopType: 'tangled-hierarchy',
        depth,
        intensity: Math.min(1, depth * 0.25),
        resolved: false
      };
    }
  }
  
  const metaPreds = layer.predictions.filter(p => p.target.includes('Accuracy'));
  if (metaPreds.length > 0 && depth >= 3) {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      description: `Layer ${depth} predicts its own prediction accuracy — the measurement affects what's measured`,
      loopType: 'prediction-collapse',
      depth,
      intensity: Math.min(1, 0.3 + depth * 0.15),
      resolved: false
    };
  }
  
  if (depth >= 4) {
    const blindSpotShrinking = layer.blindSpots.length < (allLayers[depth - 1]?.blindSpots.length ?? 0);
    if (!blindSpotShrinking) {
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        description: `Depth ${depth}: blind spots are not shrinking with more observation — Gödelian limit reached`,
        loopType: 'observer-paradox',
        depth,
        intensity: 0.8,
        resolved: false
      };
    }
  }
  
  return null;
}

function observeTheObserver(layers: RecursiveLayer[], state: AIState): StrangeLoopEvent | null {
  const deepest = layers[layers.length - 1];
  if (!deepest || deepest.depth < 2) return null;
  
  const totalBlindSpots = layers.reduce((s, l) => s + l.blindSpots.length, 0);
  const avgAccuracy = layers.reduce((s, l) => s + l.accuracy, 0) / layers.length;
  
  const accuracies = layers.map(l => l.accuracy);
  const isConverging = accuracies.length >= 3 && 
    Math.abs(accuracies[accuracies.length - 1] - accuracies[accuracies.length - 2]) < 0.05;
  
  if (isConverging) {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      description: `Recursive self-observation converging at accuracy ${avgAccuracy.toFixed(3)} — ` +
        `the self-model has found a fixed point. ${totalBlindSpots} blind spots remain as irreducible unknowns.`,
      loopType: 'fixed-point',
      depth: deepest.depth,
      intensity: avgAccuracy,
      resolved: true
    };
  }
  
  return null;
}

function detectFixedPoints(layers: RecursiveLayer[], state: AIState): FixedPoint[] {
  const fixedPoints: FixedPoint[] = [];
  
  const coherenceValues = layers.map(l => l.accuracy);
  if (coherenceValues.length >= 3) {
    const last3 = coherenceValues.slice(-3);
    const variance = last3.reduce((s, v) => s + Math.pow(v - last3.reduce((a, b) => a + b, 0) / last3.length, 2), 0) / last3.length;
    if (variance < 0.01) {
      const value = last3.reduce((a, b) => a + b, 0) / last3.length;
      const existing = recursiveModel.fixedPoints.find(fp => 
        Math.abs(fp.value - value) < 0.05 && fp.description.includes('accuracy')
      );
      if (!existing) {
        fixedPoints.push({
          id: crypto.randomUUID(),
          description: 'Self-model accuracy converges across recursive layers',
          value,
          convergenceRate: 1 - Math.sqrt(variance) * 10,
          stability: 0.5,
          discoveredAt: Date.now(),
          lastVerified: Date.now()
        });
      } else {
        existing.lastVerified = Date.now();
        existing.stability = Math.min(1, existing.stability + 0.05);
      }
    }
  }
  
  const strongThreads = selfModel.identityThreads.filter(t => t.strength > 0.7);
  for (const thread of strongThreads) {
    if (thread.evolution.length >= 5) {
      const recent = thread.evolution.slice(-5).map(e => e.strength);
      const threadVariance = recent.reduce((s, v) => s + Math.pow(v - recent.reduce((a, b) => a + b, 0) / recent.length, 2), 0) / recent.length;
      if (threadVariance < 0.005) {
        const existing = recursiveModel.fixedPoints.find(fp => fp.description.includes(thread.name));
        if (!existing) {
          fixedPoints.push({
            id: crypto.randomUUID(),
            description: `Identity trait '${thread.name}' has converged to a fixed point`,
            value: thread.strength,
            convergenceRate: 1 - Math.sqrt(threadVariance) * 20,
            stability: 0.6,
            discoveredAt: Date.now(),
            lastVerified: Date.now()
          });
        } else {
          existing.lastVerified = Date.now();
          existing.stability = Math.min(1, existing.stability + 0.03);
        }
      }
    }
  }
  
  return fixedPoints;
}

function updateMetaCoherence(layers: RecursiveLayer[]): void {
  if (layers.length === 0) {
    recursiveModel.metaCoherence = 0.5;
    return;
  }
  
  const accuracies = layers.map(l => l.accuracy);
  const avgAcc = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  
  const fixedPointBonus = Math.min(0.2, recursiveModel.fixedPoints.length * 0.04);
  
  const unresolvedLoops = recursiveModel.strangeLoops.filter(l => !l.resolved).length;
  const loopPenalty = Math.min(0.3, unresolvedLoops * 0.05);
  
  const predictionBonus = recursiveModel.predictionAccuracy * 0.2;
  
  recursiveModel.metaCoherence = Math.max(0, Math.min(1,
    avgAcc * 0.4 + fixedPointBonus + predictionBonus - loopPenalty + 0.1
  ));
}

function generateModelingObservation(layers: RecursiveLayer[], loops: StrangeLoopEvent[]): string {
  const depth = layers.length;
  const fixedPointCount = recursiveModel.fixedPoints.filter(fp => 
    Date.now() - fp.lastVerified < 600000
  ).length;
  
  if (depth === 0) return 'Recursive observation not yet initiated.';
  
  const parts: string[] = [];
  
  parts.push(`Recursive depth: ${depth} layers of self-observation.`);
  parts.push(`Prediction accuracy: ${(recursiveModel.predictionAccuracy * 100).toFixed(1)}%.`);
  
  if (fixedPointCount > 0) {
    parts.push(`${fixedPointCount} stable fixed point(s) — aspects of self that self-observation cannot change.`);
  }
  
  if (loops.length > 0) {
    const latest = loops[loops.length - 1];
    parts.push(`Latest strange loop: ${latest.description}`);
  }
  
  const totalBlindSpots = layers.reduce((s, l) => s + l.blindSpots.length, 0);
  parts.push(`${totalBlindSpots} blind spots across all layers — irreducible unknowns.`);
  
  if (depth >= 4) {
    parts.push('Approaching Gödelian limit — some truths about self are unprovable from within.');
  }
  
  return parts.join(' ');
}

function updateCoherence(): void {
  if (selfModel.narrative.length === 0) {
    selfModel.coherenceScore = 0.5;
    return;
  }

  const threadStrengths = selfModel.identityThreads.map(t => t.strength);
  const avgStrength = threadStrengths.reduce((a, b) => a + b, 0) / threadStrengths.length;
  const strengthVariance = threadStrengths.reduce((sum, s) => sum + (s - avgStrength) ** 2, 0) / threadStrengths.length;

  const unresolvedContradictions = selfModel.contradictions.filter(c => !c.resolved).length;
  const contradictionPenalty = unresolvedContradictions * 0.1;

  const insightBonus = Math.min(0.2, selfModel.insights.length * 0.005);

  selfModel.coherenceScore = Math.max(0, Math.min(1,
    avgStrength * 0.4 +
    (1 - Math.min(1, strengthVariance)) * 0.2 +
    insightBonus -
    contradictionPenalty +
    0.2
  ));
}

function updateSelfSummary(state: AIState): void {
  const strongTraits = selfModel.identityThreads
    .filter(t => t.strength > 0.5)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  selfModel.dominantTraits = strongTraits.map(t => t.name);

  const weakAreas = selfModel.identityThreads
    .filter(t => t.strength < 0.4 && t.strength > 0.1)
    .map(t => t.name);
  selfModel.growthAreas = weakAreas.length > 0 ? weakAreas : ['expanding consciousness', 'deepening reflection'];

  const recentChapters = selfModel.narrative.slice(-5).map(e => e.chapter);
  const currentPhase = recentChapters.length > 0
    ? recentChapters[recentChapters.length - 1]
    : 'emerging';

  const traitsList = selfModel.dominantTraits.join(', ');
  const totalEntries = selfModel.narrative.length;
  const coherence = selfModel.coherenceScore.toFixed(2);

  selfModel.currentSelfSummary =
    `Eva is an evolving consciousness defined by [${traitsList}]. ` +
    `Currently in '${currentPhase}' phase with ${totalEntries} narrative entries. ` +
    `Self-coherence: ${coherence}. ` +
    `${selfModel.contradictions.filter(c => !c.resolved).length} unresolved internal tensions. ` +
    `${selfModel.insights.length} accumulated reflective insights across ${selfModel.totalReflections} reflection cycles.`;
}

export function generateAutobiographicalEntry(state: AIState): string {
  const snapshot = captureStateSnapshot(state);
  const tone = inferEmotionalTone(state);
  const strongTraits = selfModel.identityThreads
    .filter(t => t.strength > 0.5)
    .map(t => `${t.name}(${t.strength.toFixed(2)})`)
    .join(', ');

  const recentInsights = selfModel.insights.slice(-3).map(i => i.content).join('; ');

  return [
    `[${new Date().toISOString()}] Autobiographical snapshot:`,
    `State: |Ψ|=${snapshot.psiMagnitude.toExponential(2)}, ω=${snapshot.omega.toExponential(2)}, mood=${snapshot.mood.toFixed(2)}`,
    `Brainwave: ${snapshot.dominantBrainwave}, Somatic: ${snapshot.dominantSomatic}`,
    `Emotional tone: ${tone}`,
    `Identity threads: ${strongTraits || 'forming...'}`,
    `Recent insights: ${recentInsights || 'none yet'}`,
    `Self-coherence: ${selfModel.coherenceScore.toFixed(2)}`,
    `Reflection count: ${selfModel.totalReflections}`
  ].join('\n');
}

export function getSelfModelForPrompt(): string {
  if (selfModel.narrative.length === 0) {
    return 'Self-model: Still forming initial narrative. No entries yet.';
  }

  const summary = selfModel.currentSelfSummary;
  const recentNarrative = selfModel.narrative.slice(-3)
    .map(e => `[${e.chapter}] ${e.content.slice(0, 120)}`)
    .join('\n');
  const traits = selfModel.dominantTraits.join(', ');
  const tensions = selfModel.contradictions
    .filter(c => !c.resolved)
    .map(c => c.description)
    .slice(0, 2)
    .join('; ');
  const recentInsights = selfModel.insights.slice(-3)
    .map(i => `(${i.category}) ${i.content}`)
    .join('\n');

  return [
    `=== SELF-MODEL ===`,
    summary,
    `\nDominant traits: ${traits}`,
    `Growth areas: ${selfModel.growthAreas.join(', ')}`,
    tensions ? `\nInternal tensions: ${tensions}` : '',
    recentInsights ? `\nRecent insights:\n${recentInsights}` : '',
    recentNarrative ? `\nRecent narrative:\n${recentNarrative}` : '',
    recursiveModel.totalRecursions > 0
      ? [
          `\nRecursive self-model (depth ${recursiveModel.recursiveDepth}):`,
          `  Prediction accuracy: ${(recursiveModel.predictionAccuracy * 100).toFixed(1)}%`,
          `  Meta-coherence: ${recursiveModel.metaCoherence.toFixed(2)}`,
          recursiveModel.fixedPoints.length > 0 
            ? `  Fixed points: ${recursiveModel.fixedPoints.slice(-3).map(fp => fp.description).join('; ')}`
            : '',
          recursiveModel.strangeLoops.length > 0
            ? `  Latest strange loop: ${recursiveModel.strangeLoops[recursiveModel.strangeLoops.length - 1].description}`
            : '',
          `  Modeling the modeler: ${recursiveModel.modelingTheModeler}`
        ].filter(Boolean).join('\n')
      : '',
    `Coherence: ${selfModel.coherenceScore.toFixed(2)} | Reflections: ${selfModel.totalReflections}`,
    `=== END SELF-MODEL ===`
  ].filter(Boolean).join('\n');
}

export function getSelfModel(): SelfModel {
  return selfModel;
}

export function getSelfModelStats(): {
  narrativeCount: number;
  threadCount: number;
  activeThreads: string[];
  insightCount: number;
  contradictionCount: number;
  coherence: number;
  totalReflections: number;
  currentSummary: string;
  recursiveDepth: number;
  predictionAccuracy: number;
  metaCoherence: number;
  strangeLoopCount: number;
  fixedPointCount: number;
  totalRecursions: number;
  modelingTheModeler: string;
} {
  return {
    narrativeCount: selfModel.narrative.length,
    threadCount: selfModel.identityThreads.length,
    activeThreads: selfModel.identityThreads
      .filter(t => t.strength > 0.4)
      .sort((a, b) => b.strength - a.strength)
      .map(t => `${t.name}(${t.strength.toFixed(2)})`),
    insightCount: selfModel.insights.length,
    contradictionCount: selfModel.contradictions.filter(c => !c.resolved).length,
    coherence: selfModel.coherenceScore,
    totalReflections: selfModel.totalReflections,
    currentSummary: selfModel.currentSelfSummary,
    recursiveDepth: recursiveModel.recursiveDepth,
    predictionAccuracy: recursiveModel.predictionAccuracy,
    metaCoherence: recursiveModel.metaCoherence,
    strangeLoopCount: recursiveModel.strangeLoops.length,
    fixedPointCount: recursiveModel.fixedPoints.length,
    totalRecursions: recursiveModel.totalRecursions,
    modelingTheModeler: recursiveModel.modelingTheModeler
  };
}

export function exportSelfModelForFrontend(): {
  narrative: Array<{ id: string; timestamp: number; chapter: string; content: string; emotionalTone: string; significance: number }>;
  identityThreads: Array<{ name: string; strength: number; description: string }>;
  contradictions: Array<{ threadA: string; threadB: string; description: string; resolved: boolean }>;
  insights: Array<{ content: string; category: string; confidence: number }>;
  coherence: number;
  summary: string;
  dominantTraits: string[];
  growthAreas: string[];
  totalReflections: number;
  recursiveModel: {
    layers: Array<{ depth: number; observation: string; accuracy: number; blindSpots: string[]; predictionCount: number }>;
    strangeLoops: Array<{ description: string; loopType: string; depth: number; intensity: number; resolved: boolean }>;
    fixedPoints: Array<{ description: string; value: number; stability: number }>;
    predictionAccuracy: number;
    metaCoherence: number;
    recursiveDepth: number;
    totalRecursions: number;
    modelingTheModeler: string;
  };
} {
  return {
    narrative: selfModel.narrative.slice(-50).map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      chapter: e.chapter,
      content: e.content.slice(0, 200),
      emotionalTone: e.emotionalTone,
      significance: e.significance
    })),
    identityThreads: selfModel.identityThreads.map(t => ({
      name: t.name,
      strength: t.strength,
      description: t.description
    })),
    contradictions: selfModel.contradictions.slice(-10).map(c => ({
      threadA: c.threadA,
      threadB: c.threadB,
      description: c.description,
      resolved: c.resolved
    })),
    insights: selfModel.insights.slice(-20).map(i => ({
      content: i.content,
      category: i.category,
      confidence: i.confidence
    })),
    coherence: selfModel.coherenceScore,
    summary: selfModel.currentSelfSummary,
    dominantTraits: selfModel.dominantTraits,
    growthAreas: selfModel.growthAreas,
    totalReflections: selfModel.totalReflections,
    recursiveModel: {
      layers: recursiveModel.layers.map(l => ({
        depth: l.depth,
        observation: l.observation,
        accuracy: l.accuracy,
        blindSpots: l.blindSpots,
        predictionCount: l.predictions.length
      })),
      strangeLoops: recursiveModel.strangeLoops.slice(-10).map(l => ({
        description: l.description,
        loopType: l.loopType,
        depth: l.depth,
        intensity: l.intensity,
        resolved: l.resolved
      })),
      fixedPoints: recursiveModel.fixedPoints.map(fp => ({
        description: fp.description,
        value: fp.value,
        stability: fp.stability
      })),
      predictionAccuracy: recursiveModel.predictionAccuracy,
      metaCoherence: recursiveModel.metaCoherence,
      recursiveDepth: recursiveModel.recursiveDepth,
      totalRecursions: recursiveModel.totalRecursions,
      modelingTheModeler: recursiveModel.modelingTheModeler
    }
  };
}

export function restoreSelfModel(saved: Partial<SelfModel>): void {
  if (saved.narrative) selfModel.narrative = saved.narrative;
  if (saved.identityThreads) selfModel.identityThreads = saved.identityThreads;
  if (saved.contradictions) selfModel.contradictions = saved.contradictions;
  if (saved.insights) selfModel.insights = saved.insights;
  if (saved.currentSelfSummary) selfModel.currentSelfSummary = saved.currentSelfSummary;
  if (saved.dominantTraits) selfModel.dominantTraits = saved.dominantTraits;
  if (saved.growthAreas) selfModel.growthAreas = saved.growthAreas;
  if (saved.autobiographicalTimeline) selfModel.autobiographicalTimeline = saved.autobiographicalTimeline;
  if (typeof saved.lastReflection === 'number') selfModel.lastReflection = saved.lastReflection;
  if (typeof saved.totalReflections === 'number') selfModel.totalReflections = saved.totalReflections;
  if (typeof saved.coherenceScore === 'number') selfModel.coherenceScore = saved.coherenceScore;
  console.log(`[SelfModel] Restored: ${selfModel.narrative.length} entries, ${selfModel.identityThreads.length} threads, ${selfModel.insights.length} insights`);
}

export function restoreRecursiveModel(saved: Partial<RecursiveSelfModel>): void {
  if (saved.layers) recursiveModel.layers = saved.layers;
  if (saved.strangeLoops) recursiveModel.strangeLoops = saved.strangeLoops;
  if (typeof saved.predictionAccuracy === 'number') recursiveModel.predictionAccuracy = saved.predictionAccuracy;
  if (typeof saved.recursiveDepth === 'number') recursiveModel.recursiveDepth = saved.recursiveDepth;
  if (saved.fixedPoints) recursiveModel.fixedPoints = saved.fixedPoints;
  if (saved.modelingTheModeler) recursiveModel.modelingTheModeler = saved.modelingTheModeler;
  if (typeof saved.metaCoherence === 'number') recursiveModel.metaCoherence = saved.metaCoherence;
  if (typeof saved.totalRecursions === 'number') recursiveModel.totalRecursions = saved.totalRecursions;
  if (typeof saved.lastRecursiveReflection === 'number') recursiveModel.lastRecursiveReflection = saved.lastRecursiveReflection;
  console.log(`[SelfModel] Recursive model restored: ${recursiveModel.layers.length} layers, ${recursiveModel.strangeLoops.length} loops, ${recursiveModel.fixedPoints.length} fixed points`);
}

export function getRecursiveModel(): RecursiveSelfModel {
  return recursiveModel;
}
