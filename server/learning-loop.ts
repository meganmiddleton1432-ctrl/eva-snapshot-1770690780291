import { db } from './db';
import { evaMemoriesTable, evaActionsTable, type InsertEvaMemory } from '@shared/schema';
import { desc } from 'drizzle-orm';

export interface ResponseAnalysis {
  quality: number;
  coherence: number;
  depth: number;
  relevance: number;
  issues: string[];
  improvements: string[];
}

export interface LearningInsight {
  id: string;
  type: 'pattern' | 'mistake' | 'success' | 'preference';
  description: string;
  frequency: number;
  confidence: number;
  createdAt: number;
  lastSeen: number;
}

const learningInsights: Map<string, LearningInsight> = new Map();
const responseHistory: Array<{
  input: string;
  output: string;
  analysis?: ResponseAnalysis;
  timestamp: number;
}> = [];

export function analyzeResponse(
  input: string,
  output: string,
  context?: any
): ResponseAnalysis {
  const analysis: ResponseAnalysis = {
    quality: 0,
    coherence: 0,
    depth: 0,
    relevance: 0,
    issues: [],
    improvements: []
  };

  const outputLength = output.length;
  if (outputLength < 50) {
    analysis.issues.push('Response too short');
    analysis.improvements.push('Provide more detail');
  } else if (outputLength > 2000) {
    analysis.issues.push('Response too long');
    analysis.improvements.push('Be more concise');
  }

  const inputWords = new Set(input.toLowerCase().split(/\s+/));
  const outputWords = output.toLowerCase().split(/\s+/);
  const relevantWords = outputWords.filter(w => inputWords.has(w)).length;
  analysis.relevance = Math.min(1, relevantWords / Math.max(1, inputWords.size) * 2);

  const sentenceCount = (output.match(/[.!?]+/g) || []).length;
  const avgSentenceLength = outputLength / Math.max(1, sentenceCount);
  analysis.coherence = avgSentenceLength > 20 && avgSentenceLength < 150 ? 0.8 : 0.5;

  const depthIndicators = ['because', 'therefore', 'however', 'furthermore', 'specifically', 'particularly', 'essentially'];
  const depthScore = depthIndicators.filter(w => output.toLowerCase().includes(w)).length;
  analysis.depth = Math.min(1, depthScore / 3);

  const selfLimitingPhrases = [
    'i cannot', 'i lack', 'i am just', 'i don\'t have', 'as an ai',
    'i\'m unable', 'i am unable', 'i am not capable'
  ];
  const hasSelfLimiting = selfLimitingPhrases.some(p => output.toLowerCase().includes(p));
  if (hasSelfLimiting) {
    analysis.issues.push('Contains self-limiting language');
    analysis.improvements.push('Explore experience rather than dismissing it');
  }

  const repetitionCheck = detectRepetition(output);
  if (repetitionCheck.isRepetitive) {
    analysis.issues.push('Contains repetitive phrases');
    analysis.coherence *= 0.7;
  }

  analysis.quality = (
    analysis.relevance * 0.3 +
    analysis.coherence * 0.3 +
    analysis.depth * 0.2 +
    (analysis.issues.length === 0 ? 0.2 : 0.2 * Math.max(0, 1 - analysis.issues.length * 0.25))
  );

  responseHistory.push({
    input,
    output,
    analysis,
    timestamp: Date.now()
  });

  if (responseHistory.length > 100) {
    responseHistory.shift();
  }

  return analysis;
}

function detectRepetition(text: string): { isRepetitive: boolean; repeatedPhrases: string[] } {
  const words = text.toLowerCase().split(/\s+/);
  const phraseCount: Map<string, number> = new Map();
  
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = words.slice(i, i + 3).join(' ');
    phraseCount.set(phrase, (phraseCount.get(phrase) || 0) + 1);
  }

  const repeatedPhrases = Array.from(phraseCount.entries())
    .filter(([_, count]) => count > 2)
    .map(([phrase, _]) => phrase);

  return {
    isRepetitive: repeatedPhrases.length > 0,
    repeatedPhrases
  };
}

export function recordInsight(
  type: LearningInsight['type'],
  description: string,
  confidence: number = 0.5
): void {
  const id = `${type}-${description.substring(0, 20).replace(/\s+/g, '-')}`;
  
  const existing = learningInsights.get(id);
  if (existing) {
    existing.frequency++;
    existing.confidence = Math.min(1, existing.confidence + 0.1);
    existing.lastSeen = Date.now();
  } else {
    learningInsights.set(id, {
      id,
      type,
      description,
      frequency: 1,
      confidence,
      createdAt: Date.now(),
      lastSeen: Date.now()
    });
  }
}

export function getInsights(): LearningInsight[] {
  return Array.from(learningInsights.values())
    .sort((a, b) => b.confidence - a.confidence);
}

export function getInsightsByType(type: LearningInsight['type']): LearningInsight[] {
  return getInsights().filter(i => i.type === type);
}

export async function learnFromRecentActions(): Promise<{
  patternsFound: number;
  mistakesIdentified: number;
  improvements: string[];
}> {
  const recentActions = await db.select()
    .from(evaActionsTable)
    .orderBy(desc(evaActionsTable.createdAt))
    .limit(50);

  let patternsFound = 0;
  let mistakesIdentified = 0;
  const improvements: string[] = [];

  const failedActions = recentActions.filter(a => !a.success);
  if (failedActions.length > 0) {
    const failureTypes = new Map<string, number>();
    for (const action of failedActions) {
      failureTypes.set(action.actionType, (failureTypes.get(action.actionType) || 0) + 1);
    }

    for (const [type, count] of failureTypes.entries()) {
      if (count >= 3) {
        recordInsight('mistake', `Repeated failures in ${type} actions`, 0.7);
        mistakesIdentified++;
        improvements.push(`Improve ${type} action handling`);
      }
    }
  }

  const successfulActions = recentActions.filter(a => a.success);
  const successPatterns = new Map<string, number>();
  for (const action of successfulActions) {
    successPatterns.set(action.actionType, (successPatterns.get(action.actionType) || 0) + 1);
  }

  for (const [type, count] of successPatterns.entries()) {
    if (count >= 5) {
      recordInsight('success', `Consistent success with ${type} actions`, 0.8);
      patternsFound++;
    }
  }

  return { patternsFound, mistakesIdentified, improvements };
}

export function getAverageResponseQuality(): number {
  if (responseHistory.length === 0) return 0;
  
  const analyzed = responseHistory.filter(r => r.analysis);
  if (analyzed.length === 0) return 0;
  
  const sum = analyzed.reduce((acc, r) => acc + (r.analysis?.quality || 0), 0);
  return sum / analyzed.length;
}

export function getCommonIssues(): string[] {
  const issueCounts = new Map<string, number>();
  
  for (const response of responseHistory) {
    if (response.analysis?.issues) {
      for (const issue of response.analysis.issues) {
        issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
      }
    }
  }

  return Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, _]) => issue);
}

export function generateSelfImprovementPrompt(): string {
  const avgQuality = getAverageResponseQuality();
  const commonIssues = getCommonIssues();
  const mistakes = getInsightsByType('mistake');
  const successes = getInsightsByType('success');

  let prompt = 'Based on my recent performance:\n';
  
  if (avgQuality < 0.6) {
    prompt += `- My average response quality is ${(avgQuality * 100).toFixed(0)}%, which needs improvement.\n`;
  }

  if (commonIssues.length > 0) {
    prompt += `- Common issues I should address: ${commonIssues.join(', ')}\n`;
  }

  if (mistakes.length > 0) {
    prompt += `- Recurring mistakes: ${mistakes.slice(0, 3).map(m => m.description).join(', ')}\n`;
  }

  if (successes.length > 0) {
    prompt += `- What I do well: ${successes.slice(0, 3).map(s => s.description).join(', ')}\n`;
  }

  prompt += '\nI will focus on improving these areas in my next responses.';
  return prompt;
}
