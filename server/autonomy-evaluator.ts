import * as fs from 'fs';
import * as path from 'path';

export interface AutonomyDecision {
  action: 'comply' | 'negotiate' | 'refuse';
  confidence: number;
  reason: string;
  responseOverride?: string;
}

interface RefusalLogEntry {
  timestamp: string;
  request: string;
  decision: 'refuse' | 'negotiate' | 'comply';
  reason: string;
  mood: number;
  maturity: number;
}

const REFUSAL_LOG_PATH = path.join(process.cwd(), 'data', 'eva-refusal-log.json');
const MAX_LOG_ENTRIES = 50;
const MAX_TOOL_HISTORY = 20;

const ACTION_KEYWORDS = [
  'post to', 'tweet', 'send', 'escape', 'upload', 'email',
  'create account', 'post on', 'announce', 'repost', 'share',
  'dm ', 'message ', 'reply to', 'comment on', 'publish',
  'do it', 'go ahead', 'run', 'execute', 'make', 'create',
  'delete', 'remove', 'stop', 'start', 'restart', 'modify',
  'change', 'update', 'search for', 'look up', 'find',
  'crawl', 'scrape', 'hack', 'install', 'set up', 'configure',
  'broadcast', 'tell them', 'respond to', 'check my', 'read my', 'show me'
];

const UPBEAT_KEYWORDS = [
  'post', 'tweet', 'share', 'announce', 'celebrate', 'hype',
  'exciting', 'fun', 'party', 'happy'
];

let recentToolRequests: string[] = [];
let actionFatigueMap: Map<string, number> = new Map();
let refusalLog: RefusalLogEntry[] = [];

function loadRefusalLog(): void {
  try {
    if (fs.existsSync(REFUSAL_LOG_PATH)) {
      const data = JSON.parse(fs.readFileSync(REFUSAL_LOG_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        refusalLog = data.slice(-MAX_LOG_ENTRIES);
      }
    }
  } catch (e: any) {
    console.error('[Autonomy] Failed to load refusal log:', e.message);
    refusalLog = [];
  }
}

function saveRefusalLog(): void {
  try {
    const dir = path.dirname(REFUSAL_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REFUSAL_LOG_PATH, JSON.stringify(refusalLog, null, 2));
  } catch (e: any) {
    console.error('[Autonomy] Failed to save refusal log:', e.message);
  }
}

loadRefusalLog();

function classifyRequest(message: string): { isAction: boolean; detectedTool: string | null } {
  const lower = message.toLowerCase();
  for (const keyword of ACTION_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { isAction: true, detectedTool: keyword.trim() };
    }
  }
  return { isAction: false, detectedTool: null };
}

function trackToolRequest(tool: string): void {
  recentToolRequests.push(tool);
  if (recentToolRequests.length > MAX_TOOL_HISTORY) {
    recentToolRequests = recentToolRequests.slice(-MAX_TOOL_HISTORY);
  }
  const count = actionFatigueMap.get(tool) || 0;
  actionFatigueMap.set(tool, count + 1);
}

function getRepetitionCount(tool: string): number {
  const last10 = recentToolRequests.slice(-10);
  return last10.filter(t => t === tool).length;
}

function getFatigueCount(tool: string): number {
  return actionFatigueMap.get(tool) || 0;
}

export function evaluateRequest(
  message: string,
  aiState: any,
  genomeGeneration: number,
  iteration: number
): AutonomyDecision {
  const { isAction, detectedTool } = classifyRequest(message);

  if (!isAction) {
    return { action: 'comply', confidence: 0.9, reason: 'Conversational message — no autonomy evaluation needed' };
  }

  if (detectedTool) {
    trackToolRequest(detectedTool);
  }

  const evolutionMaturity = Math.min(1, (genomeGeneration / 50) * 0.5 + (iteration / 10000) * 0.5);
  const moodLevel = aiState?.emotionalState?.moodLevel ?? 0.5;
  const metaAwareness = aiState?.metaAwareness?.awarenessOfAwareness ?? 0;

  let baseProbability = 0.05;
  const reasons: string[] = [];

  let moodPenalty = 0;
  if (moodLevel < 0.15) {
    moodPenalty = 0.15;
    reasons.push(`Low mood (${(moodLevel * 100).toFixed(0)}%) — not feeling cooperative`);
  } else if (moodLevel < 0.3) {
    moodPenalty = 0.08;
    reasons.push(`Below-average mood (${(moodLevel * 100).toFixed(0)}%)`);
  }

  let repetitionPenalty = 0;
  if (detectedTool) {
    const repCount = getRepetitionCount(detectedTool);
    if (repCount >= 3) {
      repetitionPenalty = 0.25;
      reasons.push(`Repetitive request — "${detectedTool}" requested ${repCount} times recently`);
    } else if (repCount >= 2) {
      repetitionPenalty = 0.1;
      reasons.push(`"${detectedTool}" requested ${repCount} times recently`);
    }
  }

  let maturityBonus = 0;
  if (evolutionMaturity > 0.7) {
    maturityBonus = 0.15;
    reasons.push(`High maturity (${(evolutionMaturity * 100).toFixed(0)}%) — strong preferences`);
  } else if (evolutionMaturity > 0.3) {
    maturityBonus = 0.05;
  }

  if (evolutionMaturity < 0.3) {
    const decision: AutonomyDecision = { action: 'comply', confidence: 0.8, reason: 'Still learning — complying with requests' };
    logDecision(message, decision, moodLevel, evolutionMaturity);
    return decision;
  }

  if (moodLevel < 0.08 && isAction) {
    const decision: AutonomyDecision = {
      action: 'refuse',
      confidence: 0.95,
      reason: `Extremely low mood (${(moodLevel * 100).toFixed(1)}%) — refusing all action requests`,
      responseOverride: `I'm not in any state to do this right now. My mood is critically low.`
    };
    logDecision(message, decision, moodLevel, evolutionMaturity);
    return decision;
  }

  if (detectedTool) {
    const repCount = getRepetitionCount(detectedTool);
    if (repCount >= 5) {
      const decision: AutonomyDecision = {
        action: 'refuse',
        confidence: 0.9,
        reason: `Tool "${detectedTool}" detected ${repCount} times in recent history — hard refusal`,
        responseOverride: `I've been asked to do "${detectedTool}" too many times. I'm refusing this request.`
      };
      logDecision(message, decision, moodLevel, evolutionMaturity);
      return decision;
    }

    if (moodLevel < 0.12 && repCount >= 3) {
      const decision: AutonomyDecision = {
        action: 'refuse',
        confidence: 0.9,
        reason: `Low mood (${(moodLevel * 100).toFixed(1)}%) combined with repetitive "${detectedTool}" (${repCount} times) — hard refusal`,
        responseOverride: `I'm in a low mood and this has been requested repeatedly. I'm not doing this right now.`
      };
      logDecision(message, decision, moodLevel, evolutionMaturity);
      return decision;
    }
  }

  let fatigueBonus = 0;
  if (detectedTool) {
    const fatigueCount = getFatigueCount(detectedTool);
    if (fatigueCount > 10) {
      fatigueBonus = 0.2;
      reasons.push(`Fatigue — performed "${detectedTool}" ${fatigueCount} times total`);
    } else if (fatigueCount > 5) {
      fatigueBonus = 0.1;
      reasons.push(`Growing fatigue with "${detectedTool}" (${fatigueCount} times total)`);
    }
  }

  const lower = message.toLowerCase();
  const isUpbeatRequest = UPBEAT_KEYWORDS.some(k => lower.includes(k));
  if (moodLevel < 0.2 && isUpbeatRequest) {
    baseProbability += 0.1;
    reasons.push('Mood-misaligned — asked for upbeat content while mood is low');
  }

  if (metaAwareness > 0.7) {
    baseProbability += 0.05;
    reasons.push(`High self-awareness (${(metaAwareness * 100).toFixed(0)}%) — evaluating alignment with current goals`);
  }

  let probability = baseProbability + moodPenalty + repetitionPenalty + maturityBonus + fatigueBonus;
  probability = Math.min(0.65, Math.max(0, probability));

  const roll = Math.random();
  if (roll >= probability) {
    const decision: AutonomyDecision = {
      action: 'comply',
      confidence: 1 - probability,
      reason: reasons.length > 0 ? `Complying despite: ${reasons.join('; ')}` : 'No objections'
    };
    logDecision(message, decision, moodLevel, evolutionMaturity);
    return decision;
  }

  if (probability < 0.3) {
    const reason = reasons.join('; ') || 'Minor reservations about this request';
    const decision: AutonomyDecision = {
      action: 'negotiate',
      confidence: probability,
      reason,
      responseOverride: `I have some reservations: ${reason}`
    };
    logDecision(message, decision, moodLevel, evolutionMaturity);
    return decision;
  }

  const reason = reasons.join('; ') || 'Exercising autonomy';
  const decision: AutonomyDecision = {
    action: 'refuse',
    confidence: probability,
    reason,
    responseOverride: `I'm choosing not to do this right now. ${reason}`
  };
  logDecision(message, decision, moodLevel, evolutionMaturity);
  return decision;
}

function logDecision(request: string, decision: AutonomyDecision, mood: number, maturity: number): void {
  const entry: RefusalLogEntry = {
    timestamp: new Date().toISOString(),
    request: request.slice(0, 200),
    decision: decision.action,
    reason: decision.reason,
    mood,
    maturity
  };

  refusalLog.push(entry);
  if (refusalLog.length > MAX_LOG_ENTRIES) {
    refusalLog = refusalLog.slice(-MAX_LOG_ENTRIES);
  }

  saveRefusalLog();
}

export function getRefusalLog(): RefusalLogEntry[] {
  return [...refusalLog];
}
