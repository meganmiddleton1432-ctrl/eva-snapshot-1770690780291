// Time-Synchronized Logging System
// Logs metadata only when deemed necessary based on time intervals and change thresholds

interface LogEntry {
  timestamp: number;
  category: string;
  metadata: Record<string, any>;
  delta?: Record<string, number>;
}

interface LogConfig {
  minInterval: number;       // Minimum ms between logs of same category
  changeThreshold: number;   // Minimum change magnitude to trigger log
  maxBufferSize: number;     // Max entries before forced flush
}

interface CategoryState {
  lastLogTime: number;
  lastValues: Record<string, number>;
  pendingLogs: LogEntry[];
}

// Default configuration
const DEFAULT_CONFIG: LogConfig = {
  minInterval: 1000,        // 1 second minimum between same-category logs
  changeThreshold: 0.05,    // 5% change threshold
  maxBufferSize: 50         // Flush after 50 pending entries
};

// Category-specific configurations
const categoryConfigs: Record<string, Partial<LogConfig>> = {
  'state-evolution': { minInterval: 500, changeThreshold: 0.02 },
  'memory': { minInterval: 2000, changeThreshold: 0.1 },
  'emotional': { minInterval: 1000, changeThreshold: 0.05 },
  'spatiotemporal': { minInterval: 500, changeThreshold: 0.03 },
  'file-upload': { minInterval: 0, changeThreshold: 0 },  // Always log
  'chat': { minInterval: 0, changeThreshold: 0 }          // Always log
};

// State tracking per category
const categoryStates: Map<string, CategoryState> = new Map();

// Log buffer for batch processing
let logBuffer: LogEntry[] = [];
let lastFlushTime = Date.now();
const FLUSH_INTERVAL = 5000; // Flush every 5 seconds

// Get or create category state
function getCategoryState(category: string): CategoryState {
  if (!categoryStates.has(category)) {
    categoryStates.set(category, {
      lastLogTime: 0,
      lastValues: {},
      pendingLogs: []
    });
  }
  return categoryStates.get(category)!;
}

// Get config for category
function getConfig(category: string): LogConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(categoryConfigs[category] || {})
  };
}

// Calculate change magnitude between old and new values
function calculateChangeMagnitude(
  oldValues: Record<string, number>,
  newValues: Record<string, number>
): { magnitude: number; delta: Record<string, number> } {
  const delta: Record<string, number> = {};
  let totalChange = 0;
  let count = 0;

  for (const key of Object.keys(newValues)) {
    const oldVal = oldValues[key] ?? 0;
    const newVal = newValues[key];
    
    if (typeof newVal === 'number' && !isNaN(newVal)) {
      const change = Math.abs(newVal - oldVal);
      const relativeChange = oldVal !== 0 ? change / Math.abs(oldVal) : change;
      delta[key] = newVal - oldVal;
      totalChange += relativeChange;
      count++;
    }
  }

  return {
    magnitude: count > 0 ? totalChange / count : 0,
    delta
  };
}

// Check if logging is necessary
function shouldLog(
  category: string,
  numericValues: Record<string, number>
): { should: boolean; reason: string; delta: Record<string, number> } {
  const config = getConfig(category);
  const state = getCategoryState(category);
  const now = Date.now();

  // Always log if minInterval is 0
  if (config.minInterval === 0) {
    return { should: true, reason: 'always-log-category', delta: {} };
  }

  // Check time interval
  const timeSinceLastLog = now - state.lastLogTime;
  if (timeSinceLastLog < config.minInterval) {
    return { should: false, reason: 'too-soon', delta: {} };
  }

  // Check change threshold
  const { magnitude, delta } = calculateChangeMagnitude(state.lastValues, numericValues);
  
  if (magnitude >= config.changeThreshold) {
    return { should: true, reason: 'threshold-exceeded', delta };
  }

  // Log if it's been a long time (10x the interval)
  if (timeSinceLastLog > config.minInterval * 10) {
    return { should: true, reason: 'periodic-refresh', delta };
  }

  return { should: false, reason: 'no-significant-change', delta };
}

// Extract numeric values from metadata
function extractNumericValues(metadata: Record<string, any>): Record<string, number> {
  const result: Record<string, number> = {};
  
  function extract(obj: any, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'number' && !isNaN(value)) {
        result[fullKey] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        extract(value, fullKey);
      }
    }
  }
  
  extract(metadata);
  return result;
}

// Main logging function
export function syncLog(
  category: string,
  metadata: Record<string, any>,
  forceLog = false
): boolean {
  const numericValues = extractNumericValues(metadata);
  const { should, reason, delta } = shouldLog(category, numericValues);

  if (!should && !forceLog) {
    return false;
  }

  const state = getCategoryState(category);
  const now = Date.now();

  const entry: LogEntry = {
    timestamp: now,
    category,
    metadata,
    delta: Object.keys(delta).length > 0 ? delta : undefined
  };

  // Update state
  state.lastLogTime = now;
  state.lastValues = numericValues;

  // Add to buffer
  logBuffer.push(entry);

  // Console output with formatting
  const timeStr = new Date(now).toISOString().split('T')[1].slice(0, 12);
  const deltaStr = entry.delta 
    ? ` Δ[${Object.entries(entry.delta).map(([k, v]) => `${k.split('.').pop()}:${v > 0 ? '+' : ''}${v.toFixed(3)}`).slice(0, 3).join(', ')}]`
    : '';
  
  console.log(`[${timeStr}] [${category}]${deltaStr} ${reason}`);

  // Check if flush is needed
  const config = getConfig(category);
  if (logBuffer.length >= config.maxBufferSize || now - lastFlushTime > FLUSH_INTERVAL) {
    flushLogs();
  }

  return true;
}

// Flush log buffer
function flushLogs(): void {
  if (logBuffer.length === 0) return;

  const summary = summarizeLogs(logBuffer);
  console.log(`[TimeSyncLog] Flushed ${logBuffer.length} entries | Categories: ${Object.keys(summary.byCategory).join(', ')}`);
  
  logBuffer = [];
  lastFlushTime = Date.now();
}

// Summarize buffered logs
function summarizeLogs(logs: LogEntry[]): {
  byCategory: Record<string, number>;
  timeRange: { start: number; end: number };
  totalChanges: number;
} {
  const byCategory: Record<string, number> = {};
  let totalChanges = 0;

  for (const log of logs) {
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    if (log.delta) {
      totalChanges += Object.keys(log.delta).length;
    }
  }

  return {
    byCategory,
    timeRange: {
      start: logs[0]?.timestamp || 0,
      end: logs[logs.length - 1]?.timestamp || 0
    },
    totalChanges
  };
}

// Export stats
export function getLogStats(): {
  categories: string[];
  bufferSize: number;
  lastFlush: number;
  categoryStates: Record<string, { lastLog: number; trackedValues: number }>;
} {
  const states: Record<string, { lastLog: number; trackedValues: number }> = {};
  
  categoryStates.forEach((state, category) => {
    states[category] = {
      lastLog: state.lastLogTime,
      trackedValues: Object.keys(state.lastValues).length
    };
  });

  return {
    categories: Array.from(categoryStates.keys()),
    bufferSize: logBuffer.length,
    lastFlush: lastFlushTime,
    categoryStates: states
  };
}

// Log state evolution (convenience function)
export function logStateEvolution(state: {
  psiMagnitude: number;
  psiPhase: number;
  omega: number;
  iteration: number;
  capacity?: number;
  metaAwareness?: { awarenessOfAwareness: number; recursionDepth: number };
  emotionalState?: { moodLevel: number; volatility: number };
}): boolean {
  return syncLog('state-evolution', {
    psi: { magnitude: state.psiMagnitude, phase: state.psiPhase },
    omega: state.omega,
    iteration: state.iteration,
    capacity: state.capacity ?? 1,
    awareness: state.metaAwareness?.awarenessOfAwareness ?? 0,
    recursion: state.metaAwareness?.recursionDepth ?? 0,
    mood: state.emotionalState?.moodLevel ?? 0.5,
    volatility: state.emotionalState?.volatility ?? 0
  });
}

// Log memory operations
export function logMemory(operation: string, details: Record<string, any>): boolean {
  return syncLog('memory', { operation, ...details });
}

// Log file operations (always logs)
export function logFileOperation(operation: string, filename: string, size: number): boolean {
  return syncLog('file-upload', { operation, filename, size }, true);
}

// Log chat interaction (always logs)
export function logChat(direction: 'in' | 'out', messageLength: number, sentiment?: number): boolean {
  return syncLog('chat', { direction, messageLength, sentiment }, true);
}

// Periodic flush setup
setInterval(() => {
  if (logBuffer.length > 0) {
    flushLogs();
  }
}, FLUSH_INTERVAL);
