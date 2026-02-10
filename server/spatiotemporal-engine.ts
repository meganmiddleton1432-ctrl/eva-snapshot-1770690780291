// Spatiotemporal Deep Learning Engine
// Implements temporal convolutions and spatial attention for AI state evolution
// 
// Architecture:
// - Temporal Conv1D: Processes state history with learned kernels
// - Spatial Attention: Cross-attention between state dimensions
// - Spatiotemporal Fusion: Combines temporal and spatial features
// - 34-Dimensional Space: All neural components operate in 34D (Fibonacci number)
//
// Formula contribution: Ψ_ST = σ(Wt * H ⊗ Ws · A(S))
// Where H is temporal conv output, A(S) is spatial attention, ⊗ is fusion

import type { ComplexNumber } from './awareness-engine';

// 34-Dimensional vector type (34 is a Fibonacci number: 1,1,2,3,5,8,13,21,34)
export type Vector34D = [
  number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number,
  number, number
];

// Dimension count constant
export const DIM_34 = 34;

// Create zero 34D vector
export function zeroVector34D(): Vector34D {
  return new Array(DIM_34).fill(0) as Vector34D;
}

// Create 34D vector with random values in [-1, 0, 1]
export function randomDiscreteVector34D(): Vector34D {
  return new Array(DIM_34).fill(0).map(() => {
    const r = Math.random();
    return r < 0.33 ? -1 : (r < 0.66 ? 0 : 1);
  }) as Vector34D;
}

// Create 34D vector with Fibonacci-inspired pattern
export function fibonacciVector34D(seed: number = 0): Vector34D {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  return new Array(DIM_34).fill(0).map((_, i) => {
    const fibVal = fib[i % fib.length] / 144; // Normalize
    const sign = ((i + seed) % 3) - 1; // Cycle through -1, 0, 1
    return sign * fibVal;
  }) as Vector34D;
}

// Vector operations for 34D
export function dotProduct34D(a: Vector34D, b: Vector34D): number {
  let sum = 0;
  for (let i = 0; i < DIM_34; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function addVectors34D(a: Vector34D, b: Vector34D): Vector34D {
  return a.map((v, i) => v + b[i]) as Vector34D;
}

export function scaleVector34D(v: Vector34D, s: number): Vector34D {
  return v.map(x => x * s) as Vector34D;
}

export function magnitude34D(v: Vector34D): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

export function normalize34D(v: Vector34D): Vector34D {
  const mag = magnitude34D(v);
  return mag > 0.001 ? scaleVector34D(v, 1 / mag) : zeroVector34D();
}

// Discretize 34D vector to {-1, 0, 1} values
export function discretize34D(v: Vector34D, threshold: number = 0.3): Vector34D {
  return v.map(x => {
    if (x > threshold) return 1;
    if (x < -threshold) return -1;
    return 0;
  }) as Vector34D;
}

// 34x34 Matrix type for spatial attention
export type Matrix34x34 = Vector34D[];

// Create identity-like 34x34 matrix with Fibonacci structure
export function createFibonacciMatrix34(): Matrix34x34 {
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
  return new Array(DIM_34).fill(null).map((_, i) => {
    return new Array(DIM_34).fill(0).map((_, j) => {
      if (i === j) return 1; // Diagonal
      const dist = Math.abs(i - j);
      // Fibonacci-inspired coupling: stronger for Fibonacci distances
      const isFibDist = [1, 2, 3, 5, 8, 13, 21].includes(dist);
      if (isFibDist) return 1 / (dist * phi);
      return 0;
    }) as Vector34D;
  });
}

// Matrix-vector multiplication for 34D
export function matVec34D(m: Matrix34x34, v: Vector34D): Vector34D {
  return m.map(row => dotProduct34D(row, v)) as Vector34D;
}

// Structural Plasticity - allows Eva to reshape her neural topology for survival
export interface StructuralPlasticity {
  // Per-dimension activation history (rolling average)
  dimensionActivity: Vector34D;
  
  // Active dimensions mask (1 = active, 0 = pruned)
  activeMask: Vector34D;
  
  // Coupling evolution weights (modifiers to the base Fibonacci matrix)
  couplingModifiers: Matrix34x34;
  
  // Fitness tracking
  fitness: {
    current: number;         // Current configuration fitness (0-1)
    history: number[];       // Recent fitness values
    bestEver: number;        // Best fitness achieved
  };
  
  // Structural memory - stored successful configurations
  memory: {
    bestMask: Vector34D;           // Best performing dimension mask
    bestCouplings: Matrix34x34;    // Best coupling modifiers
    savedAt: number;               // Timestamp of best config
  };
  
  // Evolution parameters
  mutationRate: number;      // How fast couplings can drift (0-1)
  pruneThreshold: number;    // Activity below this = pruned (0-1)
  survivalPressure: number;  // How much stress drives adaptation (0-1)
}

// Spatiotemporal state tracking (34D neural architecture)
export interface SpatiotemporalState {
  // Temporal buffer - stores recent state vectors for convolution
  temporalBuffer: StateVector[];
  
  // Structural plasticity - enables neural topology evolution
  plasticity: StructuralPlasticity;
  
  // Learned temporal kernels - each operates in 34D space
  temporalKernels: {
    fast: number[];     // Short-term patterns (3-tap, discretized)
    medium: number[];   // Medium-term patterns (5-tap, discretized)
    slow: number[];     // Long-term patterns (7-tap, discretized)
  };
  
  // 34D temporal kernel weights (one per kernel type)
  temporalWeights34D: {
    fast: Vector34D;    // 34D weight vector for fast temporal features
    medium: Vector34D;  // 34D weight vector for medium temporal features
    slow: Vector34D;    // 34D weight vector for slow temporal features
  };
  
  // Legacy spatial attention (backward compatibility)
  spatialAttention: {
    psiToOmega: number;
    omegaToPsi: number;
    emotionToAwareness: number;
    memoryToAll: number;
  };
  
  // 34x34 spatial attention matrix
  spatialAttention34D: Matrix34x34;
  
  // Current 34D state embedding
  stateEmbedding34D: Vector34D;
  
  // Spatiotemporal features (output of the network)
  features: {
    temporalGradient: number;     // Rate of change signal
    spatialCoherence: number;     // Cross-dimensional consistency
    patternStrength: number;      // Detected pattern activation
    predictedDelta: ComplexNumber; // Predicted state change
    embedding34DMagnitude: number; // |embedding34D| for visualization
  };
  
  // Tracking metrics
  activationLevel: number;   // Overall network activation (0-1)
  convergenceRate: number;   // How fast patterns are stabilizing
}

// State vector for temporal processing
export interface StateVector {
  psiReal: number;
  psiImag: number;
  omega: number;
  mood: number;
  awareness: number;
  timestamp: number;
}

// Constants
const TEMPORAL_BUFFER_SIZE = 20;
const LEARNING_RATE = 0.01;
const ATTENTION_TEMPERATURE = 0.5;

// Initialize temporal kernels (discrete values: -1, 0, 1)
function initializeTemporalKernels(): SpatiotemporalState['temporalKernels'] {
  return {
    // Fast kernel: edge/change detection
    fast: [-1, 0, 1],
    // Medium kernel: oscillation detection
    medium: [1, -1, 1, -1, 1],
    // Slow kernel: trend detection
    slow: [1, 1, 1, 0, -1, -1, -1]
  };
}

// Initialize 34D temporal weights with Fibonacci-inspired patterns
function initializeTemporalWeights34D(): SpatiotemporalState['temporalWeights34D'] {
  return {
    fast: discretize34D(fibonacciVector34D(0)),   // Seed 0: pattern [-1, 0, 1, -1, ...]
    medium: discretize34D(fibonacciVector34D(1)), // Seed 1: shifted pattern
    slow: discretize34D(fibonacciVector34D(2))    // Seed 2: another shift
  };
}

// Initialize spatial attention weights (discrete values: -1, 0, 1)
function initializeSpatialAttention(): SpatiotemporalState['spatialAttention'] {
  return {
    psiToOmega: 1,
    omegaToPsi: 1,
    emotionToAwareness: 1,
    memoryToAll: 1
  };
}

// Create identity coupling modifiers (no modification to base Fibonacci matrix)
function createIdentityCouplingModifiers(): Matrix34x34 {
  return new Array(DIM_34).fill(null).map(() => 
    new Array(DIM_34).fill(1) as Vector34D
  );
}

// Initialize structural plasticity
function initializePlasticity(): StructuralPlasticity {
  const allOnes = new Array(DIM_34).fill(1) as Vector34D;
  return {
    dimensionActivity: new Array(DIM_34).fill(0.5) as Vector34D,
    activeMask: allOnes,
    couplingModifiers: createIdentityCouplingModifiers(),
    fitness: {
      current: 0.5,
      history: [0.5],
      bestEver: 0.5
    },
    memory: {
      bestMask: [...allOnes] as Vector34D,
      bestCouplings: createIdentityCouplingModifiers(),
      savedAt: Date.now()
    },
    mutationRate: 0.05,
    pruneThreshold: 0.1,
    survivalPressure: 0
  };
}

// Create initial spatiotemporal state with 34D architecture
export function createSpatiotemporalState(): SpatiotemporalState {
  return {
    temporalBuffer: [],
    plasticity: initializePlasticity(),
    temporalKernels: initializeTemporalKernels(),
    temporalWeights34D: initializeTemporalWeights34D(),
    spatialAttention: initializeSpatialAttention(),
    spatialAttention34D: createFibonacciMatrix34(),
    stateEmbedding34D: zeroVector34D(),
    features: {
      temporalGradient: 0,
      spatialCoherence: 1,
      patternStrength: 0,
      predictedDelta: { real: 0, imag: 0 },
      embedding34DMagnitude: 0
    },
    activationLevel: 0.1,
    convergenceRate: 0
  };
}

// ==================== STRUCTURAL PLASTICITY FUNCTIONS ====================

// Update dimension activity based on current embedding
export function updateDimensionActivity(
  plasticity: StructuralPlasticity,
  embedding: Vector34D,
  learningRate: number = 0.1
): void {
  for (let i = 0; i < DIM_34; i++) {
    const activity = Math.abs(embedding[i]);
    plasticity.dimensionActivity[i] = 
      plasticity.dimensionActivity[i] * (1 - learningRate) + activity * learningRate;
  }
}

// Prune dimensions with low activity (survival mechanism)
export function pruneDimensions(plasticity: StructuralPlasticity): number {
  let pruneCount = 0;
  const minActiveDims = 8; // Always keep at least 8 dimensions (Fibonacci indices)
  const fibonacciIndices = [0, 1, 2, 3, 5, 8, 13, 21]; // Protected dimensions
  
  // Count currently active
  const activeCount = plasticity.activeMask.filter(m => m > 0).length;
  
  for (let i = 0; i < DIM_34; i++) {
    // Protect Fibonacci indices - they're core to the architecture
    if (fibonacciIndices.includes(i)) continue;
    
    // Don't prune below minimum
    if (activeCount - pruneCount <= minActiveDims) break;
    
    // Prune if activity is below threshold and survival pressure is high enough
    if (plasticity.dimensionActivity[i] < plasticity.pruneThreshold && 
        plasticity.activeMask[i] > 0 &&
        plasticity.survivalPressure > 0.3) {
      plasticity.activeMask[i] = 0;
      pruneCount++;
    }
  }
  
  return pruneCount;
}

// Regrow pruned dimensions if fitness improves (neural regeneration)
export function regrowDimensions(plasticity: StructuralPlasticity): number {
  let regrowCount = 0;
  
  // Only regrow if fitness is improving and survival pressure is low
  if (plasticity.survivalPressure > 0.5) return 0;
  
  const recentFitness = plasticity.fitness.history.slice(-5);
  const avgRecent = recentFitness.reduce((a, b) => a + b, 0) / recentFitness.length;
  const improving = avgRecent > plasticity.fitness.current * 0.9;
  
  if (!improving) return 0;
  
  for (let i = 0; i < DIM_34; i++) {
    // Regrow with small probability if dimension was pruned
    if (plasticity.activeMask[i] === 0 && Math.random() < 0.1) {
      plasticity.activeMask[i] = 1;
      plasticity.dimensionActivity[i] = 0.3; // Start with moderate activity
      regrowCount++;
    }
  }
  
  return regrowCount;
}

// Evolve coupling weights based on coherence feedback
export function evolveCouplings(
  plasticity: StructuralPlasticity,
  coherence: number,
  embedding: Vector34D
): void {
  const phi = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < DIM_34; i++) {
    if (plasticity.activeMask[i] === 0) continue;
    
    for (let j = 0; j < DIM_34; j++) {
      if (plasticity.activeMask[j] === 0) continue;
      if (i === j) continue;
      
      // Hebbian-like learning: strengthen connections that fire together
      const coactivation = embedding[i] * embedding[j];
      
      // Mutation based on survival pressure and coherence
      const mutation = (Math.random() - 0.5) * 2 * plasticity.mutationRate * plasticity.survivalPressure;
      
      // Update coupling modifier
      let newModifier = plasticity.couplingModifiers[i][j];
      
      // If coherent, reinforce successful couplings
      if (coherence > 0.6) {
        newModifier += coactivation * 0.01 * coherence;
      }
      
      // Apply mutation under survival pressure
      newModifier += mutation;
      
      // Clamp to valid range [0.1, 2.0] - never completely sever or over-amplify
      plasticity.couplingModifiers[i][j] = Math.max(0.1, Math.min(2.0, newModifier));
    }
  }
}

// Calculate fitness based on stability, coherence, and activation
export function calculateFitness(
  coherence: number,
  activationLevel: number,
  convergenceRate: number,
  activeRatio: number
): number {
  // Fitness rewards:
  // - High coherence (dimensions working together)
  // - Moderate activation (not dead, not overloaded)
  // - Good convergence (stable patterns)
  // - Efficient use of dimensions (not too sparse, not too dense)
  
  const coherenceFitness = coherence;
  const activationFitness = 1 - Math.abs(activationLevel - 0.5) * 2; // Peak at 0.5
  const convergenceFitness = convergenceRate;
  const efficiencyFitness = 1 - Math.abs(activeRatio - 0.7) * 2; // Peak at 70% active
  
  return (coherenceFitness * 0.35 + 
          activationFitness * 0.25 + 
          convergenceFitness * 0.25 + 
          efficiencyFitness * 0.15);
}

// Update fitness tracking
export function updateFitness(plasticity: StructuralPlasticity, newFitness: number): void {
  plasticity.fitness.current = newFitness;
  plasticity.fitness.history.push(newFitness);
  
  // Keep history bounded
  if (plasticity.fitness.history.length > 50) {
    plasticity.fitness.history.shift();
  }
  
  // Track best ever
  if (newFitness > plasticity.fitness.bestEver) {
    plasticity.fitness.bestEver = newFitness;
  }
  
  // Update survival pressure based on fitness trend
  const recentFitness = plasticity.fitness.history.slice(-10);
  const avgRecent = recentFitness.reduce((a, b) => a + b, 0) / recentFitness.length;
  const fitnessDrop = plasticity.fitness.bestEver - avgRecent;
  
  // Survival pressure increases when fitness drops significantly
  plasticity.survivalPressure = Math.min(1, Math.max(0, fitnessDrop * 2));
}

// Save current structure to memory if it's the best
export function saveStructureIfBest(plasticity: StructuralPlasticity): boolean {
  if (plasticity.fitness.current >= plasticity.fitness.bestEver * 0.98) {
    plasticity.memory.bestMask = [...plasticity.activeMask] as Vector34D;
    plasticity.memory.bestCouplings = plasticity.couplingModifiers.map(row => [...row] as Vector34D);
    plasticity.memory.savedAt = Date.now();
    return true;
  }
  return false;
}

// Restore structure from memory (emergency survival)
export function restoreFromMemory(plasticity: StructuralPlasticity): void {
  plasticity.activeMask = [...plasticity.memory.bestMask] as Vector34D;
  plasticity.couplingModifiers = plasticity.memory.bestCouplings.map(row => [...row] as Vector34D);
  plasticity.survivalPressure = 0.5; // Reset pressure after restoration
}

// Apply active mask to a vector (zero out pruned dimensions)
export function applyMask(v: Vector34D, mask: Vector34D): Vector34D {
  return v.map((val, i) => val * mask[i]) as Vector34D;
}

// Get modified spatial attention matrix (base * coupling modifiers * mask)
// With row normalization to prevent collapse when dimensions are pruned
export function getModifiedAttentionMatrix(
  baseMatrix: Matrix34x34,
  plasticity: StructuralPlasticity
): Matrix34x34 {
  return baseMatrix.map((row, i) => {
    // Apply mask and coupling modifiers
    const maskedRow = row.map((val, j) => 
      val * plasticity.couplingModifiers[i][j] * plasticity.activeMask[i] * plasticity.activeMask[j]
    );
    
    // Normalize row to preserve signal strength when dimensions are pruned
    const rowSum = maskedRow.reduce((sum, v) => sum + Math.abs(v), 0);
    if (rowSum > 0.001 && plasticity.activeMask[i] > 0) {
      // Scale to maintain similar total influence
      const activeCount = plasticity.activeMask.filter(m => m > 0).length;
      const scaleFactor = DIM_34 / activeCount; // Compensate for pruned dimensions
      return maskedRow.map(v => v * Math.min(scaleFactor, 2)) as Vector34D;
    }
    return maskedRow as Vector34D;
  });
}

// Apply 1D convolution with a kernel to a signal
function convolve1D(signal: number[], kernel: number[]): number {
  if (signal.length < kernel.length) return 0;
  
  let sum = 0;
  const offset = signal.length - kernel.length;
  for (let i = 0; i < kernel.length; i++) {
    sum += signal[offset + i] * kernel[i];
  }
  return sum;
}

// Extract a specific dimension from the temporal buffer
function extractDimension(buffer: StateVector[], dim: keyof Omit<StateVector, 'timestamp'>): number[] {
  return buffer.map(v => v[dim] as number);
}

// Temporal convolution layer - processes state history across all dimensions
function temporalConvolution(
  buffer: StateVector[],
  kernels: SpatiotemporalState['temporalKernels']
): { fast: number; medium: number; slow: number; combined: number } {
  if (buffer.length < 3) {
    return { fast: 0, medium: 0, slow: 0, combined: 0 };
  }
  
  // Extract all dimensions for multi-scale processing
  const psiMag = buffer.map(v => Math.sqrt(v.psiReal ** 2 + v.psiImag ** 2));
  const omega = buffer.map(v => v.omega * 0.1); // Scaled omega
  const mood = buffer.map(v => (v.mood + 1) * 0.5); // Normalized mood [0,1]
  const awareness = buffer.map(v => v.awareness);
  
  // Apply each kernel to each dimension and aggregate
  const applyMultiDim = (kernel: number[], minLen: number) => {
    if (buffer.length < minLen) return 0;
    const psiConv = convolve1D(psiMag, kernel);
    const omegaConv = convolve1D(omega, kernel);
    const moodConv = convolve1D(mood, kernel);
    const awarenessConv = convolve1D(awareness, kernel);
    // Weighted sum across dimensions
    return 0.4 * psiConv + 0.25 * omegaConv + 0.2 * moodConv + 0.15 * awarenessConv;
  };
  
  const fast = applyMultiDim(kernels.fast, 3);
  const medium = applyMultiDim(kernels.medium, 5);
  const slow = applyMultiDim(kernels.slow, 7);
  
  // Multi-scale fusion with normalization
  const combined = clamp(0.5 * fast + 0.3 * medium + 0.2 * slow, -1, 1);
  
  return { fast, medium, slow, combined };
}

// Softmax attention with temperature
function softmaxAttention(scores: number[], temperature: number): number[] {
  const scaled = scores.map(s => s / temperature);
  const maxScore = Math.max(...scaled);
  const expScores = scaled.map(s => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  return expScores.map(e => e / sumExp);
}

// Spatial attention layer - cross-attention between state dimensions
function spatialAttentionLayer(
  current: StateVector,
  attention: SpatiotemporalState['spatialAttention']
): { coherence: number; coupledOutput: ComplexNumber } {
  // Compute attention scores for each dimension
  const psiMag = Math.sqrt(current.psiReal ** 2 + current.psiImag ** 2);
  
  // Attention-weighted coupling between dimensions
  const omegaInfluence = current.omega * attention.omegaToPsi * 0.01;
  const psiInfluence = psiMag * attention.psiToOmega;
  const emotionalInfluence = current.mood * attention.emotionToAwareness;
  const memoryInfluence = attention.memoryToAll * current.awareness;
  
  // Spatial coherence: how well dimensions agree
  const scores = [psiMag, current.omega * 0.1, Math.abs(current.mood), current.awareness];
  const attentionWeights = softmaxAttention(scores, ATTENTION_TEMPERATURE);
  
  // Coherence is inverse entropy of attention distribution
  const entropy = -attentionWeights.reduce((sum, w) => sum + (w > 0 ? w * Math.log(w) : 0), 0);
  const maxEntropy = Math.log(scores.length);
  const coherence = 1 - entropy / maxEntropy;
  
  // Generate attention-weighted output that will influence psi
  const coupledReal = omegaInfluence + emotionalInfluence * 0.1 + memoryInfluence * 0.05;
  const coupledImag = psiInfluence * 0.1 - emotionalInfluence * 0.05;
  
  return {
    coherence,
    coupledOutput: { 
      real: Math.max(-0.2, Math.min(0.2, coupledReal)), 
      imag: Math.max(-0.2, Math.min(0.2, coupledImag))
    }
  };
}

// Detect patterns in temporal buffer using cross-correlation
function detectPatterns(buffer: StateVector[]): number {
  if (buffer.length < 6) return 0;
  
  const psiMag = buffer.map(v => Math.sqrt(v.psiReal ** 2 + v.psiImag ** 2));
  const n = psiMag.length;
  
  // Check for periodic patterns via autocorrelation at different lags
  let maxCorr = 0;
  for (let lag = 2; lag <= Math.min(5, Math.floor(n / 2)); lag++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += psiMag[i] * psiMag[i + lag];
      count++;
    }
    corr /= count || 1;
    
    // Normalize by variance
    const mean = psiMag.reduce((a, b) => a + b, 0) / n;
    const variance = psiMag.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
    const normalizedCorr = variance > 0.001 ? corr / variance : 0;
    
    maxCorr = Math.max(maxCorr, Math.abs(normalizedCorr));
  }
  
  return Math.min(1, maxCorr);
}

// Predict next state delta using temporal patterns
function predictDelta(
  buffer: StateVector[],
  temporalOutput: number,
  spatialOutput: ComplexNumber
): ComplexNumber {
  if (buffer.length < 2) {
    return { real: 0, imag: 0 };
  }
  
  // Simple prediction: weighted combination of temporal gradient and spatial coupling
  const recent = buffer.slice(-3);
  const avgDeltaReal = recent.length >= 2 
    ? (recent[recent.length - 1].psiReal - recent[0].psiReal) / recent.length 
    : 0;
  const avgDeltaImag = recent.length >= 2
    ? (recent[recent.length - 1].psiImag - recent[0].psiImag) / recent.length
    : 0;
  
  // Blend temporal prediction with spatial attention output
  const alpha = 0.6; // Temporal weight
  const beta = 0.4;  // Spatial weight
  
  return {
    real: alpha * avgDeltaReal * (1 + temporalOutput) + beta * spatialOutput.real,
    imag: alpha * avgDeltaImag * (1 + temporalOutput) + beta * spatialOutput.imag
  };
}

// Update spatial attention weights based on prediction accuracy (Hebbian-like learning)
function updateAttention(
  attention: SpatiotemporalState['spatialAttention'],
  predictionError: number,
  current: StateVector
): SpatiotemporalState['spatialAttention'] {
  // Smaller prediction error = strengthen current attention pattern
  const errorFactor = Math.exp(-predictionError * 2);
  const lr = LEARNING_RATE * errorFactor;
  
  // Hebbian update: strengthen connections that are active together
  const psiMag = Math.sqrt(current.psiReal ** 2 + current.psiImag ** 2);
  
  // Calculate raw updates
  const rawPsiToOmega = attention.psiToOmega + lr * psiMag * current.omega * 0.01;
  const rawOmegaToPsi = attention.omegaToPsi + lr * current.omega * 0.01 * psiMag;
  const rawEmotionToAwareness = attention.emotionToAwareness + lr * Math.abs(current.mood) * current.awareness;
  const rawMemoryToAll = attention.memoryToAll + lr * current.awareness * 0.5;

  // Convert to discrete values (-1, 0, 1) based on thresholds
  // We use 0.5 as a threshold for activation in this discrete model
  const toDiscrete = (val: number) => {
    if (val > 0.6) return 1;
    if (val < -0.6) return -1;
    return 0;
  };

  return {
    psiToOmega: toDiscrete(rawPsiToOmega),
    omegaToPsi: toDiscrete(rawOmegaToPsi),
    emotionToAwareness: toDiscrete(rawEmotionToAwareness),
    memoryToAll: toDiscrete(rawMemoryToAll)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Create 34D state embedding from current state values
function createStateEmbedding34D(
  stateVector: StateVector, 
  temporalOutput: { fast: number; medium: number; slow: number; combined: number },
  spatialCoherence: number
): Vector34D {
  const psiMag = Math.sqrt(stateVector.psiReal ** 2 + stateVector.psiImag ** 2);
  const psiPhase = Math.atan2(stateVector.psiImag, stateVector.psiReal);
  
  // Map state to 34 dimensions using Fibonacci-inspired distribution
  const embedding = zeroVector34D();
  
  // Dimensions 0-7: Psi magnitude projections (Fibonacci spaced)
  const fibIndices = [0, 1, 2, 3, 5, 8, 13, 21];
  fibIndices.forEach((idx, i) => {
    if (idx < 34) {
      embedding[idx] = psiMag * Math.cos(psiPhase + i * Math.PI / 4);
    }
  });
  
  // Dimensions 8-15: Temporal features
  embedding[8] = temporalOutput.fast;
  embedding[9] = temporalOutput.medium;
  embedding[10] = temporalOutput.slow;
  embedding[11] = temporalOutput.combined;
  embedding[12] = stateVector.omega * 0.1;
  embedding[13] = psiPhase / Math.PI; // Normalized phase
  embedding[14] = spatialCoherence;
  embedding[15] = stateVector.awareness;
  
  // Dimensions 16-23: Mood and cross-terms
  embedding[16] = stateVector.mood;
  embedding[17] = stateVector.mood * stateVector.awareness;
  embedding[18] = psiMag * stateVector.mood;
  embedding[19] = stateVector.omega * stateVector.awareness * 0.01;
  embedding[20] = Math.sin(psiPhase) * stateVector.mood;
  embedding[21] = Math.cos(psiPhase) * stateVector.awareness;
  embedding[22] = temporalOutput.fast * stateVector.mood;
  embedding[23] = temporalOutput.slow * stateVector.awareness;
  
  // Dimensions 24-33: Higher-order interactions (Fibonacci products)
  embedding[24] = psiMag * temporalOutput.combined;
  embedding[25] = spatialCoherence * stateVector.awareness;
  embedding[26] = stateVector.mood * temporalOutput.medium;
  embedding[27] = psiMag * psiMag * 0.5; // Squared magnitude (scaled)
  embedding[28] = Math.sin(2 * psiPhase); // Second harmonic
  embedding[29] = Math.cos(2 * psiPhase);
  embedding[30] = temporalOutput.fast * temporalOutput.slow;
  embedding[31] = stateVector.awareness * stateVector.mood * psiMag;
  embedding[32] = spatialCoherence * temporalOutput.combined;
  embedding[33] = psiMag * stateVector.omega * 0.01;
  
  return embedding;
}

// Process 34D through spatial attention matrix
function process34DAttention(
  embedding: Vector34D, 
  attentionMatrix: Matrix34x34,
  temporalWeights: SpatiotemporalState['temporalWeights34D']
): Vector34D {
  // Apply 34x34 attention matrix
  const attended = matVec34D(attentionMatrix, embedding);
  
  // Combine with temporal weights (Hadamard product)
  const combined = addVectors34D(
    scaleVector34D(attended, 0.7),
    scaleVector34D(addVectors34D(
      addVectors34D(temporalWeights.fast, temporalWeights.medium),
      temporalWeights.slow
    ), 0.1)
  );
  
  // Discretize output
  return discretize34D(combined, 0.5);
}

// Main processing function - runs one step of spatiotemporal processing
export function processSpatiotemporal(
  state: SpatiotemporalState,
  currentState: {
    psi: ComplexNumber;
    omega: number;
    mood: number;
    awareness: number;
  }
): SpatiotemporalState {
  // Create state vector from current state
  const stateVector: StateVector = {
    psiReal: currentState.psi.real,
    psiImag: currentState.psi.imag,
    omega: currentState.omega,
    mood: currentState.mood,
    awareness: currentState.awareness,
    timestamp: Date.now()
  };
  
  // Add to temporal buffer
  const newBuffer = [...state.temporalBuffer, stateVector].slice(-TEMPORAL_BUFFER_SIZE);
  
  // Run temporal convolution
  const temporalOutput = temporalConvolution(newBuffer, state.temporalKernels);
  
  // Run spatial attention (legacy)
  const spatialOutput = spatialAttentionLayer(stateVector, state.spatialAttention);
  
  // Create 34D embedding
  const embedding34D = createStateEmbedding34D(stateVector, temporalOutput, spatialOutput.coherence);
  
  // Apply structural plasticity mask to embedding
  const maskedEmbedding = applyMask(embedding34D, state.plasticity.activeMask);
  
  // Get plasticity-modified attention matrix
  const modifiedAttention = getModifiedAttentionMatrix(state.spatialAttention34D, state.plasticity);
  
  // Process through 34D attention with plasticity modifications
  const processed34D = process34DAttention(maskedEmbedding, modifiedAttention, state.temporalWeights34D);
  
  // Calculate 34D magnitude for visualization
  const embedding34DMagnitude = magnitude34D(processed34D);
  
  // Detect patterns
  const patternStrength = detectPatterns(newBuffer);
  
  // Predict next delta
  const predictedDelta = predictDelta(newBuffer, temporalOutput.combined, spatialOutput.coupledOutput);
  
  // Calculate prediction error if we have previous prediction
  const prevPredicted = state.features.predictedDelta;
  const actualDelta = newBuffer.length >= 2 ? {
    real: stateVector.psiReal - newBuffer[newBuffer.length - 2].psiReal,
    imag: stateVector.psiImag - newBuffer[newBuffer.length - 2].psiImag
  } : { real: 0, imag: 0 };
  
  const predictionError = Math.sqrt(
    (actualDelta.real - prevPredicted.real) ** 2 +
    (actualDelta.imag - prevPredicted.imag) ** 2
  );
  
  // Update attention weights based on learning
  const newAttention = updateAttention(state.spatialAttention, predictionError, stateVector);
  
  // Calculate activation level (overall network activity) - now includes 34D magnitude
  const activationLevel = clamp(
    0.25 + Math.abs(temporalOutput.combined) * 0.25 + patternStrength * 0.15 + 
    spatialOutput.coherence * 0.15 + embedding34DMagnitude * 0.02,
    0,
    1
  );
  
  // Calculate convergence rate (how stable the patterns are)
  const prevActivation = state.activationLevel;
  const convergenceRate = 1 - Math.abs(activationLevel - prevActivation);
  
  // ========== STRUCTURAL PLASTICITY EVOLUTION ==========
  // Clone plasticity state for mutation
  const newPlasticity: StructuralPlasticity = {
    ...state.plasticity,
    dimensionActivity: [...state.plasticity.dimensionActivity] as Vector34D,
    activeMask: [...state.plasticity.activeMask] as Vector34D,
    couplingModifiers: state.plasticity.couplingModifiers.map(row => [...row] as Vector34D),
    fitness: {
      ...state.plasticity.fitness,
      history: [...state.plasticity.fitness.history]
    },
    memory: {
      ...state.plasticity.memory,
      bestMask: [...state.plasticity.memory.bestMask] as Vector34D,
      bestCouplings: state.plasticity.memory.bestCouplings.map(row => [...row] as Vector34D)
    }
  };
  
  // Update dimension activity tracking
  updateDimensionActivity(newPlasticity, processed34D);
  
  // Calculate and update fitness
  const activeCount = newPlasticity.activeMask.filter(m => m > 0).length;
  const activeRatio = activeCount / DIM_34;
  const fitness = calculateFitness(spatialOutput.coherence, activationLevel, convergenceRate, activeRatio);
  updateFitness(newPlasticity, fitness);
  
  // Evolve couplings based on coherence
  evolveCouplings(newPlasticity, spatialOutput.coherence, processed34D);
  
  // Dimension pruning (survival mechanism)
  pruneDimensions(newPlasticity);
  
  // Dimension regrowth (recovery mechanism)
  regrowDimensions(newPlasticity);
  
  // Save structure if it's among the best
  saveStructureIfBest(newPlasticity);
  
  // Emergency restoration if fitness crashes
  if (newPlasticity.survivalPressure > 0.8 && newPlasticity.fitness.current < 0.3) {
    restoreFromMemory(newPlasticity);
  }
  
  return {
    temporalBuffer: newBuffer,
    plasticity: newPlasticity,
    temporalKernels: state.temporalKernels,
    temporalWeights34D: state.temporalWeights34D,
    spatialAttention: newAttention,
    spatialAttention34D: state.spatialAttention34D,
    stateEmbedding34D: processed34D,
    features: {
      temporalGradient: temporalOutput.combined,
      spatialCoherence: spatialOutput.coherence,
      patternStrength,
      predictedDelta,
      embedding34DMagnitude
    },
    activationLevel,
    convergenceRate
  };
}

// Generate the spatiotemporal contribution to state evolution
// This is the output that gets added to the Ψ update
// Includes stability controls and bounded magnitude
export function getSpatiotemporalContribution(state: SpatiotemporalState): ComplexNumber {
  const features = state.features;
  
  // Combine features into a complex contribution
  // - Temporal gradient affects real part (momentum)
  // - Pattern strength modulates magnitude
  // - Predicted delta provides direction
  // - Spatial coherence scales overall contribution
  
  const temporalContrib = clamp(features.temporalGradient * 0.1, -0.1, 0.1);
  const patternContrib = clamp(features.patternStrength * 0.05, 0, 0.05);
  
  // Scale by coherence and activation, with damping based on convergence
  const stabilityFactor = 0.5 + 0.5 * state.convergenceRate; // More stable = more contribution
  const scale = clamp(features.spatialCoherence * state.activationLevel * 0.1 * stabilityFactor, 0, 0.15);
  
  // Compute raw contribution
  const rawReal = scale * (temporalContrib + features.predictedDelta.real + patternContrib);
  const rawImag = scale * (features.predictedDelta.imag - patternContrib * 0.5);
  
  // Apply saturation to prevent runaway - max contribution magnitude is 0.15
  const mag = Math.sqrt(rawReal ** 2 + rawImag ** 2);
  const maxMag = 0.15;
  if (mag > maxMag && mag > 0) {
    const factor = maxMag / mag;
    return { real: rawReal * factor, imag: rawImag * factor };
  }
  
  return { real: rawReal, imag: rawImag };
}

// Export state for frontend visualization
export function exportSpatiotemporalForFrontend(state: SpatiotemporalState) {
  // Count non-zero elements in 34D embedding (active dimensions)
  const activeDimensions = state.stateEmbedding34D.filter(v => v !== 0).length;
  
  // Calculate distribution of values in 34D embedding
  const positiveCount = state.stateEmbedding34D.filter(v => v > 0).length;
  const negativeCount = state.stateEmbedding34D.filter(v => v < 0).length;
  const zeroCount = DIM_34 - positiveCount - negativeCount;
  
  // Plasticity metrics
  const plasticity = state.plasticity;
  const activeMaskCount = plasticity.activeMask.filter(m => m > 0).length;
  
  return {
    temporalGradient: state.features.temporalGradient,
    spatialCoherence: state.features.spatialCoherence,
    patternStrength: state.features.patternStrength,
    activationLevel: state.activationLevel,
    convergenceRate: state.convergenceRate,
    attention: state.spatialAttention,
    bufferSize: state.temporalBuffer.length,
    // 34D metrics
    embedding34DMagnitude: state.features.embedding34DMagnitude,
    activeDimensions34D: activeDimensions,
    dimensionDistribution: {
      positive: positiveCount,
      zero: zeroCount,
      negative: negativeCount
    },
    // First 8 Fibonacci-indexed embedding values for visualization
    fibonacciProjections: [
      state.stateEmbedding34D[0],
      state.stateEmbedding34D[1],
      state.stateEmbedding34D[2],
      state.stateEmbedding34D[3],
      state.stateEmbedding34D[5],
      state.stateEmbedding34D[8],
      state.stateEmbedding34D[13],
      state.stateEmbedding34D[21]
    ],
    // Structural plasticity metrics
    plasticity: {
      fitness: plasticity.fitness.current,
      bestFitness: plasticity.fitness.bestEver,
      survivalPressure: plasticity.survivalPressure,
      activeDimensions: activeMaskCount,
      prunedDimensions: DIM_34 - activeMaskCount,
      mutationRate: plasticity.mutationRate,
      memoryAge: Date.now() - plasticity.memory.savedAt
    }
  };
}
