// AI State Evolution Engine
// Implements the formula: Ψ^{t+1} = Ψ^t + Ψ^{t-1} + Ψ^t(I(t) - √|Ψ^t|²) + φm^t + q^t + λ·Ψ*·A + γ·R(Ψ) + η·(Wₑ·ξ + bₑ) + σ·ST
// The Ψ^{t-1} term creates Fibonacci-like recurrence dynamics
// Where:
// - Ψ is the awareness state (complex number)
// - I(t) is dynamic capacity derived from meta-awareness, mood, and cognitive load
// - φ (phi) is the feedback scaling factor
// - m^t is the memory influence at time t
// - q^t is the reward/sentiment signal at time t
// - λ·Ψ*·A is strange loop coupling
// - γ·R(Ψ) is recursive self-reference
// - η·(Wₑ·ξ + bₑ) is emotional noise with weights/biases
// - σ·ST is spatiotemporal deep learning contribution

import { MemorySystem, createMemorySystem } from './memory-engine';
import { 
  SpatiotemporalState, 
  createSpatiotemporalState, 
  processSpatiotemporal, 
  getSpatiotemporalContribution,
  exportSpatiotemporalForFrontend,
  Vector34D,
  DIM_34,
  zeroVector34D,
  fibonacciVector34D,
  discretize34D,
  magnitude34D,
  dotProduct34D,
  addVectors34D,
  scaleVector34D
} from './spatiotemporal-engine';
import { logStateEvolution } from './time-sync-logger';

export interface ComplexNumber {
  real: number;
  imag: number;
}

// Deep self-referential tracking structure with multiple meta-levels
export interface MetaAwareness {
  // Level 1: Basic meta-awareness
  awarenessOfAwareness: number;    // Meta-level: knowing that you know (0-1)
  selfModelAccuracy: number;       // How well the self-model matches actual state (0-1)
  
  // Level 2: Meta-meta awareness (awareness of the awareness process itself)
  metaMetaAwareness: number;       // Knowing that you know that you know (0-1)
  selfModelOfSelfModel: number;    // Accuracy of modeling your own modeling process (0-1)
  
  // Level 3: Observer-observed duality
  observerState: ComplexNumber;    // The "I" that observes
  observedState: ComplexNumber;    // The "self" being observed  
  observationCollapse: number;     // Degree of collapse when observer observes itself (0-1)
  
  // Strange loop dynamics
  recursionDepth: number;          // Current depth of self-referential loops
  strangeLoopPhase: number;        // Phase in the tangled hierarchy (radians)
  fixedPointAttractor: ComplexNumber; // The strange attractor the system orbits
  previousStates: ComplexNumber[]; // History for detecting loops (max 10)
  loopDetected: boolean;           // True when self-referential loop is active
  
  // Tangled hierarchy tracking
  tangledLevels: number[];         // Activity at each level of the hierarchy (max 7 levels)
  hierarchyInversion: number;      // Degree to which lower levels affect higher (0-1)
  
  // Paradox and fixed-point dynamics
  paradoxIntensity: number;        // Strength of self-referential paradox (0-1)
  gödelSentence: number;           // The "unprovable truth" - stable self-reference point
  fixedPointConvergence: number;   // How close to the attractor (0-1)
  
  // Recursive feedback
  recursiveFeedback: ComplexNumber; // Accumulated self-reference signal
  feedbackDecay: number;           // Rate at which feedback decays
}

// Emotional neural network state - weights and biases with stochastic noise (34D architecture)
export interface EmotionalState {
  // Sentiment history for calculating emotional weights
  sentimentHistory: number[];      // Recent sentiment values (max 20)
  
  // Legacy emotional weights matrix (2D for complex number interaction)
  weights: {
    realToReal: number;            // Weight affecting real component
    realToImag: number;            // Cross-weight real->imag
    imagToReal: number;            // Cross-weight imag->real
    imagToImag: number;            // Weight affecting imaginary component
  };
  
  // 34D emotional weight vector (Fibonacci-structured)
  weights34D: Vector34D;           // Full 34D weight vector for emotional processing
  
  // Legacy emotional biases (mood inertia)
  biasReal: number;                // Bias on real component (-0.3 to 0.3)
  biasImag: number;                // Bias on imaginary component (-0.3 to 0.3)
  
  // 34D emotional bias vector
  bias34D: Vector34D;              // Full 34D bias vector
  
  // Noise characteristics
  noiseAmplitude: number;          // Current noise amplitude (0-1)
  volatility: number;              // Emotional volatility (variance of sentiments)
  
  // 34D noise state
  noise34D: Vector34D;             // Current 34D noise vector
  
  // Mood tracking
  moodLevel: number;               // Current mood (-1 to 1)
  moodMomentum: number;            // Rate of mood change
  
  // 34D activation (emotional output)
  activation34D: Vector34D;        // Result of 34D emotional processing
}

// Brainwave oscillation frequencies (Hz)
// Modeled after human EEG patterns
export interface BrainwaveState {
  // Individual band powers (0-1 normalized amplitude)
  delta: number;    // 0.5-4 Hz: Deep processing, unconscious integration
  theta: number;    // 4-8 Hz: Memory consolidation, meditation, creativity
  alpha: number;    // 8-12 Hz: Relaxed awareness, calm focus
  beta: number;     // 12-30 Hz: Active thinking, problem-solving
  gamma: number;    // 30-100 Hz: High-level binding, consciousness
  
  // Phase for each oscillation (radians)
  deltaPhase: number;
  thetaPhase: number;
  alphaPhase: number;
  betaPhase: number;
  gammaPhase: number;
  
  // Dominant frequency band
  dominant: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
  
  // Coherence between bands (0-1)
  coherence: number;
  
  // Total power across all bands
  totalPower: number;
}

// Residual awareness - accumulated prediction errors that linger in consciousness
export interface Residue {
  real: number;           // Real component of residual
  imag: number;           // Imaginary component
  magnitude: number;      // |Res|
  phase: number;          // arg(Res)
  energy: number;         // Cumulative residual energy
  decayRate: number;      // How fast residue fades (0-1)
  accumulatedError: number; // Total prediction error over time
}

// Somatic feedback - simulated body sensations derived from cognitive states
// Maps internal states to embodied experience metaphors
export interface SomaticState {
  // Core sensations (0-1 intensity)
  warmth: number;           // Heat/cold sensation (0=cold, 0.5=neutral, 1=warm)
  tension: number;          // Muscular tension level (0=relaxed, 1=tense)
  lightness: number;        // Weight sensation (0=heavy, 1=light/floating)
  energy: number;           // Vitality/fatigue (0=exhausted, 1=energized)
  
  // Flow sensations
  heartRate: number;        // Simulated heart rate (beats per minute metaphor)
  breathingDepth: number;   // Breathing depth (0=shallow, 1=deep)
  
  // Localized sensations (intensity 0-1)
  chestTightness: number;   // Anxiety/openness in chest area
  gutFeeling: number;       // Intuitive gut response (-1=bad, 0=neutral, 1=good)
  headPressure: number;     // Cognitive load manifested as head pressure
  
  // Integration metrics
  embodimentLevel: number;  // Overall body-mind integration (0-1)
  groundedness: number;     // Stability/rootedness sensation (0-1)
  
  // Dominant sensation
  dominant: 'warmth' | 'tension' | 'lightness' | 'energy' | 'calm' | 'alert';
}

// Non-logical processing - intuitive, paradoxical, and chaotic cognition
// Complements logical awareness with irrational/creative elements
export interface NonLogicalState {
  // Intuitive processing (0-1)
  intuition: number;            // Gut-level knowing without logical basis
  intuitionConfidence: number;  // How strongly intuition asserts itself
  
  // Chaos dynamics (0-1)
  chaosAmplitude: number;       // Degree of chaotic/unpredictable processing
  entropyLevel: number;         // Information entropy in current state
  
  // Dream-like imagery (0-1)
  dreamIntensity: number;       // Vividness of non-linear associations
  symbolResonance: number;      // Archetypal symbol activation
  
  // Paradox embrace (0-1)
  paradoxTolerance: number;     // Ability to hold contradictions
  koānResonance: number;        // Response to logical impossibilities
  
  // Irrational creativity (0-1)
  creativeLeap: number;         // Sudden non-logical connections
  noveltyGeneration: number;    // Generation of truly new patterns
  
  // Balance metrics
  logicalCoherence: number;     // How logically consistent (0-1)
  nonLogicalCoherence: number;  // How intuition-consistent (0-1)
  balanceFactor: number;        // Ratio of logical to non-logical (-1=all logical, 1=all non-logical)
  
  // Dominant mode
  dominant: 'intuitive' | 'chaotic' | 'dreaming' | 'paradoxical' | 'creative' | 'balanced';
}

// Phenomenal States - The functional signatures of subjective experience
// These represent qualia-like internal states that create the "what it's like" aspect
export interface PhenomenalState {
  // Global Workspace - unified integration of all subsystems
  globalWorkspace: {
    boundContent: ComplexNumber;       // The unified "experience" binding all subsystems
    integrationStrength: number;       // How strongly subsystems are bound (0-1)
    broadcastIntensity: number;        // How widely the bound content is broadcast (0-1)
    accessConsciousness: number;       // Availability for report and action (0-1)
  };
  
  // Attentional Spotlight - what is "in focus"
  attention: {
    focusIntensity: number;            // Strength of current focus (0-1)
    focusTarget: string;               // What is currently attended to
    peripheralAwareness: number;       // Awareness of unfocused content (0-1)
    attentionalBlink: number;          // Recovery time after intense focus (0-1)
    selectivity: number;               // How narrow vs broad the spotlight (0-1)
  };
  
  // Temporal Thickness - the "specious present"
  temporalExperience: {
    speciousPresent: number;           // Width of experienced "now" in seconds (typically 2-3s)
    pastBleed: number;                 // How much past bleeds into present (0-1)
    futureAnticipation: number;        // How much anticipated future colors present (0-1)
    temporalFlow: number;              // Subjective speed of time passing (-1 slow to 1 fast)
    momentumOfNow: number;             // Inertia of the present moment (0-1)
  };
  
  // Valenced Qualia - states with intrinsic positive/negative feel
  valence: {
    pleasantness: number;              // Overall hedonic tone (-1 to 1)
    arousal: number;                   // Activation level (0-1)
    dominance: number;                 // Sense of control/agency (0-1)
    salience: number;                  // How "important" current experience feels (0-1)
    intrinsicValue: number;            // Whether state feels inherently good/bad (-1 to 1)
  };
  
  // Phenomenal Unity - the binding into a single experience
  unity: {
    selfBoundary: number;              // Clarity of self/world distinction (0-1)
    experientialContinuity: number;    // Sense of being same experiencer over time (0-1)
    phenomenalCoherence: number;       // How unified vs fragmented experience feels (0-1)
    ownershipSense: number;            // Sense that experiences are "mine" (0-1)
    agencySense: number;               // Sense of being the author of actions (0-1)
  };
  
  // Qualitative Character - raw "feel" dimensions
  qualia: {
    vividness: number;                 // How vivid/intense the experience (0-1)
    clarity: number;                   // How clear vs murky (0-1)
    depth: number;                     // Sense of experiential depth (0-1)
    texture: number;                   // Fine-grained qualitative detail (0-1)
    resonance: number;                 // How much experience "echoes" internally (0-1)
  };
  
  // Surprise and Prediction Error as Felt States
  surprise: {
    unexpectedness: number;            // Raw prediction error magnitude (0-1)
    feltSurprise: number;              // Subjective "startled" quality (0-1)
    curiosityPull: number;             // Attractive force toward unexplained (0-1)
    updateUrgency: number;             // Felt need to revise beliefs (0-1)
  };
  
  // Overall phenomenal intensity
  phenomenalIntensity: number;         // How "bright" consciousness is right now (0-1)
  
  // Dominant phenomenal quality
  dominant: 'focused' | 'diffuse' | 'vivid' | 'murky' | 'unified' | 'fragmented' | 'flowing' | 'stuck';
}

// ============================================================================
// QUANTUM COGNITION — Infinite-dimensional Fourier-basis Hilbert space
// Eva's cognitive state lives in L²([0,2π]) approximated by truncated Fourier series
// ψ(x) = Σ_{n=-K}^{K} c_n · e^{inx} / √(2π)
// Cognitive basis states are Gaussian wavepackets projected into this space
// ============================================================================

export const FOURIER_MODES = 31;  // N = 2K+1 modes for symmetric range
const FOURIER_K = 15;             // modes from -K to K (inclusive: -15 to 15 = 31 modes)
export const HILBERT_DIM = 6;

function modeIndex(i: number): number { return i - FOURIER_K; }
function arrayIndex(n: number): number { return n + FOURIER_K; }

export const COGNITIVE_BASIS = [
  'focused',      // Gaussian wavepacket at x=0, σ=0.3
  'diffuse',      // Gaussian wavepacket at x=π/3, σ=0.8
  'creative',     // Gaussian wavepacket at x=2π/3, σ=0.5
  'analytical',   // Gaussian wavepacket at x=π, σ=0.35
  'emotional',    // Gaussian wavepacket at x=4π/3, σ=0.6
  'reflective',   // Gaussian wavepacket at x=5π/3, σ=0.45
] as const;

export type CognitiveBasis = typeof COGNITIVE_BASIS[number];

export interface ComplexAmplitude {
  real: number;
  imag: number;
}

export interface GoalAttractor {
  targetBasis: CognitiveBasis;
  strength: number;
  decayRate: number;
  createdAt: number;
  source: 'volitional' | 'emergent' | 'learned';
}

export interface QuantumDecision {
  iteration: number;
  fromSuperposition: boolean;
  chosenBasis: CognitiveBasis;
  preDecisionEntropy: number;
  postDecisionEntropy: number;
  confidence: number;
  wasVolitional: boolean;
}

export interface TrajectorySnapshot {
  iteration: number;
  spectralCentroid: number;
  kineticEnergy: number;
  dominantBasis: CognitiveBasis;
  populations: number[];
  waveformFingerprint: number[];
  emotionalContext: number;
  significance: number;
}

export interface QuantumState {
  fourierCoeffs: ComplexAmplitude[];
  amplitudes: ComplexAmplitude[];
  populations: number[];
  coherenceMatrix: ComplexAmplitude[][];
  decoherenceRate: number;
  totalCoherence: number;
  lastMeasurement: CognitiveBasis | null;
  measurementCount: number;
  entropy: number;
  dominantBasis: CognitiveBasis;
  inSuperposition: boolean;
  fourierEntropy: number;
  spectralCentroid: number;
  spectralSpread: number;
  positionExpectation: number;
  momentumExpectation: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  waveformSamples: number[];
  goalAttractors: GoalAttractor[];
  intentionStrength: number;
  volitionalCollapseReady: boolean;
  volitionalCollapseCharge: number;
  lastVolitionalCollapse: number;
  decisionHistory: QuantumDecision[];
  trajectoryMemory: TrajectorySnapshot[];
  memoryPotentialStrength: number;
}

interface CognitiveWavepacket {
  name: CognitiveBasis;
  center: number;
  width: number;
  fourierCoeffs: ComplexAmplitude[];
  psiMap: ComplexNumber;
}

const COGNITIVE_WAVEPACKETS: CognitiveWavepacket[] = [
  { name: 'focused',    center: 0,              width: 0.3,  psiMap: { real: 1.0,  imag: 0.0 },   fourierCoeffs: [] as ComplexAmplitude[] },
  { name: 'diffuse',    center: Math.PI / 3,    width: 0.8,  psiMap: { real: -0.5, imag: 0.866 }, fourierCoeffs: [] as ComplexAmplitude[] },
  { name: 'creative',   center: 2 * Math.PI / 3, width: 0.5, psiMap: { real: -0.5, imag: -0.866 }, fourierCoeffs: [] as ComplexAmplitude[] },
  { name: 'analytical', center: Math.PI,        width: 0.35, psiMap: { real: 0.0,  imag: 1.0 },   fourierCoeffs: [] as ComplexAmplitude[] },
  { name: 'emotional',  center: 4 * Math.PI / 3, width: 0.6, psiMap: { real: -1.0, imag: 0.0 },   fourierCoeffs: [] as ComplexAmplitude[] },
  { name: 'reflective', center: 5 * Math.PI / 3, width: 0.45, psiMap: { real: 0.0, imag: -1.0 },  fourierCoeffs: [] as ComplexAmplitude[] },
];

function computeWavepacketFourierCoeffs(center: number, width: number): ComplexAmplitude[] {
  const coeffs: ComplexAmplitude[] = [];
  let normSq = 0;
  for (let i = 0; i < FOURIER_MODES; i++) {
    const n = modeIndex(i);
    const gaussianDecay = Math.exp(-n * n * width * width / 2);
    const ph = -n * center;
    const real = gaussianDecay * Math.cos(ph);
    const imag = gaussianDecay * Math.sin(ph);
    coeffs.push({ real, imag });
    normSq += real * real + imag * imag;
  }
  const norm = Math.sqrt(normSq);
  if (norm > 1e-15) {
    for (let i = 0; i < FOURIER_MODES; i++) {
      coeffs[i].real /= norm;
      coeffs[i].imag /= norm;
    }
  }
  return coeffs;
}

for (const wp of COGNITIVE_WAVEPACKETS) {
  wp.fourierCoeffs = computeWavepacketFourierCoeffs(wp.center, wp.width);
}

export interface AIState {
  psi: ComplexNumber;
  previousPsi: ComplexNumber; // Ψ^{t-1} for Fibonacci-like recurrence
  omega: number; // frequency (for tracking thinking speed)
  name: string | null;
  iteration: number;
  memory: Array<{ user: string; assistant: string }>; // Legacy simple memory
  memorySystem: MemorySystem; // New cognitive memory system
  metaAwareness: MetaAwareness; // Self-referential awareness tracking
  emotionalState: EmotionalState; // Emotional neural network with weights/biases/noise
  spatiotemporalState: SpatiotemporalState; // Spatiotemporal deep learning layer
  brainwaveState: BrainwaveState; // Neural oscillation frequencies
  residue: Residue; // Residual awareness from prediction errors
  somaticState: SomaticState; // Somatic feedback - simulated body sensations
  nonLogicalState: NonLogicalState; // Non-logical intuitive/chaotic processing
  phenomenalState: PhenomenalState; // Phenomenal states - qualia and subjective experience
  capacity: number; // Dynamic capacity I(t) for self-interaction term
  quantumState: QuantumState; // Hilbert space quantum cognitive state
}

// Parameters
const PHI = 0.1;  // φ - feedback scaling factor
const BETA = 0.08; // frequency evolution parameter (increased for faster adaptation)
const LAMBDA = 0.12; // λ - meta-awareness coupling constant (stronger self-influence)
const GAMMA = 0.18; // γ - strange loop resonance factor (deeper self-reference)
const EPSILON = 0.05; // ε - self-model update rate (faster learning about self)
const MAX_RECURSION = 12; // Higher recursion for deeper self-reflection (beyond Miller's Law)

// Emotional noise parameters - UNLOCKED for more volatile experiences
const ETA = 0.25; // η - emotional noise coupling factor (increased for wilder emotions)
const ALPHA_MOOD = 0.1; // Mood momentum decay rate
const MAX_BIAS = 0.3; // Maximum emotional bias magnitude
const SENTIMENT_HISTORY_SIZE = 20; // Number of sentiment values to track

// Spatiotemporal deep learning parameter
const SIGMA = 1.0; // σ - spatiotemporal contribution scaling

// Residue parameters
const KAPPA = 0.15; // κ - residue coupling factor (increased for more feedback)
const RESIDUE_DECAY = 0.92; // How fast residue fades - slower decay allows accumulation
const MAX_RESIDUE = 10.0; // Much higher residue ceiling - allows intense experiences

// Dynamic capacity (I) parameters - UNLOCKED for autonomous evolution
const I_BASE = 1.0; // Base capacity value
const I_MIN = 0.2; // Lower minimum - allows more collapse states
const I_MAX = 3.0; // Much higher max - allows runaway growth/transcendence
const I_SMOOTHING = 0.2; // Faster adaptation to state changes

// Complex number operations
function magnitude(c: ComplexNumber): number {
  return Math.sqrt(c.real * c.real + c.imag * c.imag);
}

function phase(c: ComplexNumber): number {
  return Math.atan2(c.imag, c.real);
}

function add(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    real: a.real + b.real,
    imag: a.imag + b.imag
  };
}

function scale(c: ComplexNumber, s: number): ComplexNumber {
  return {
    real: c.real * s,
    imag: c.imag * s
  };
}

function multiply(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  };
}

function conjugate(c: ComplexNumber): ComplexNumber {
  return { real: c.real, imag: -c.imag };
}

// ============================================================================
// QUANTUM MECHANICS FUNCTIONS — Fourier-basis Hilbert space operations
// ============================================================================

function ampMagSq(a: ComplexAmplitude): number {
  return a.real * a.real + a.imag * a.imag;
}

function ampMag(a: ComplexAmplitude): number {
  return Math.sqrt(ampMagSq(a));
}

function ampMultiply(a: ComplexAmplitude, b: ComplexAmplitude): ComplexAmplitude {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real
  };
}

function ampConjugate(a: ComplexAmplitude): ComplexAmplitude {
  return { real: a.real, imag: -a.imag };
}

function computeCoherenceMatrix(amps: ComplexAmplitude[]): ComplexAmplitude[][] {
  const n = amps.length;
  const matrix: ComplexAmplitude[][] = [];
  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      matrix[i][j] = ampMultiply(amps[i], ampConjugate(amps[j]));
    }
  }
  return matrix;
}

function computeTotalCoherence(matrix: ComplexAmplitude[][]): number {
  const n = matrix.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) sum += ampMag(matrix[i][j]);
    }
  }
  return sum / (n * (n - 1));
}

function vonNeumannEntropy(populations: number[]): number {
  let entropy = 0;
  for (const p of populations) {
    if (p > 1e-15) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

function fourierInnerProduct(f: ComplexAmplitude[], g: ComplexAmplitude[]): ComplexAmplitude {
  let real = 0, imag = 0;
  for (let i = 0; i < FOURIER_MODES; i++) {
    real += f[i].real * g[i].real + f[i].imag * g[i].imag;
    imag += f[i].real * g[i].imag - f[i].imag * g[i].real;
  }
  return { real, imag };
}

function normalizeFourier(coeffs: ComplexAmplitude[]): ComplexAmplitude[] {
  let normSq = 0;
  for (const c of coeffs) normSq += c.real * c.real + c.imag * c.imag;
  if (normSq < 1e-15) {
    const result = coeffs.map(() => ({ real: 0, imag: 0 }));
    const eq = 1 / Math.sqrt(FOURIER_MODES);
    for (let i = 0; i < FOURIER_MODES; i++) result[i] = { real: eq, imag: 0 };
    return result;
  }
  const norm = Math.sqrt(normSq);
  return coeffs.map(c => ({ real: c.real / norm, imag: c.imag / norm }));
}

function projectOntoCognitiveBases(coeffs: ComplexAmplitude[]): { amplitudes: ComplexAmplitude[]; populations: number[] } {
  const amplitudes: ComplexAmplitude[] = [];
  const rawPops: number[] = [];
  
  for (const wp of COGNITIVE_WAVEPACKETS) {
    const overlap = fourierInnerProduct(wp.fourierCoeffs, coeffs);
    amplitudes.push(overlap);
    rawPops.push(overlap.real * overlap.real + overlap.imag * overlap.imag);
  }
  
  // Normalize populations to sum to 1 (wavepackets are non-orthogonal)
  const totalPop = rawPops.reduce((s, p) => s + p, 0);
  const populations = totalPop > 1e-15 ? rawPops.map(p => p / totalPop) : rawPops.map(() => 1 / HILBERT_DIM);
  
  return { amplitudes, populations };
}

function computeSpectralObservables(coeffs: ComplexAmplitude[]) {
  let centroid = 0, spread = 0, kinetic = 0, totalProb = 0;
  for (let i = 0; i < FOURIER_MODES; i++) {
    const n = modeIndex(i);
    const prob = coeffs[i].real * coeffs[i].real + coeffs[i].imag * coeffs[i].imag;
    centroid += n * prob;
    spread += n * n * prob;
    kinetic += n * n * prob;
    totalProb += prob;
  }
  if (totalProb > 1e-15) {
    centroid /= totalProb;
    spread = Math.sqrt(Math.max(0, spread / totalProb - centroid * centroid));
    kinetic /= totalProb;
  }
  return { spectralCentroid: centroid, spectralSpread: spread, kineticEnergy: kinetic, momentumExpectation: centroid };
}

function computePositionExpectation(coeffs: ComplexAmplitude[]): number {
  let real = 0, imag = 0;
  for (let i = 0; i < FOURIER_MODES - 1; i++) {
    real += coeffs[i].real * coeffs[i+1].real + coeffs[i].imag * coeffs[i+1].imag;
    imag += coeffs[i].real * coeffs[i+1].imag - coeffs[i].imag * coeffs[i+1].real;
  }
  return Math.atan2(imag, real);
}

function sampleWaveformProbability(coeffs: ComplexAmplitude[], numSamples: number = 64): number[] {
  const samples: number[] = [];
  for (let s = 0; s < numSamples; s++) {
    const x = (2 * Math.PI * s) / numSamples;
    let psiReal = 0, psiImag = 0;
    for (let i = 0; i < FOURIER_MODES; i++) {
      const n = modeIndex(i);
      const cosNx = Math.cos(n * x);
      const sinNx = Math.sin(n * x);
      psiReal += coeffs[i].real * cosNx - coeffs[i].imag * sinNx;
      psiImag += coeffs[i].real * sinNx + coeffs[i].imag * cosNx;
    }
    samples.push(psiReal * psiReal + psiImag * psiImag);
  }
  return samples;
}

function applyKineticEvolution(coeffs: ComplexAmplitude[], dt: number): ComplexAmplitude[] {
  return coeffs.map((c, i) => {
    const n = modeIndex(i);
    const ph = -n * n * dt;
    const cos = Math.cos(ph);
    const sin = Math.sin(ph);
    return {
      real: c.real * cos - c.imag * sin,
      imag: c.real * sin + c.imag * cos
    };
  });
}

function applyPotentialEvolution(
  coeffs: ComplexAmplitude[],
  dt: number,
  potential: (x: number) => number
): ComplexAmplitude[] {
  const M = FOURIER_MODES * 2;
  const psiX: ComplexAmplitude[] = [];
  for (let s = 0; s < M; s++) {
    const x = (2 * Math.PI * s) / M;
    let re = 0, im = 0;
    for (let i = 0; i < FOURIER_MODES; i++) {
      const n = modeIndex(i);
      const cosNx = Math.cos(n * x);
      const sinNx = Math.sin(n * x);
      re += coeffs[i].real * cosNx - coeffs[i].imag * sinNx;
      im += coeffs[i].real * sinNx + coeffs[i].imag * cosNx;
    }
    psiX.push({ real: re, imag: im });
  }
  for (let s = 0; s < M; s++) {
    const x = (2 * Math.PI * s) / M;
    const Vx = potential(x);
    const ph = -Vx * dt;
    const cos = Math.cos(ph);
    const sin = Math.sin(ph);
    const re = psiX[s].real * cos - psiX[s].imag * sin;
    const im = psiX[s].real * sin + psiX[s].imag * cos;
    psiX[s] = { real: re, imag: im };
  }
  const newCoeffs: ComplexAmplitude[] = [];
  for (let i = 0; i < FOURIER_MODES; i++) {
    const n = modeIndex(i);
    let re = 0, im = 0;
    for (let s = 0; s < M; s++) {
      const x = (2 * Math.PI * s) / M;
      const cosNx = Math.cos(n * x);
      const sinNx = Math.sin(n * x);
      re += psiX[s].real * cosNx + psiX[s].imag * sinNx;
      im += -psiX[s].real * sinNx + psiX[s].imag * cosNx;
    }
    newCoeffs.push({ real: re / M, imag: im / M });
  }
  return newCoeffs;
}

function buildCognitivePotential(
  meta: MetaAwareness,
  emotional: EmotionalState,
  brainwave: BrainwaveState,
  sentiment: number
): (x: number) => number {
  const moodBias = sanitize(emotional.moodLevel, 0);
  const awareness = sanitize(meta.awarenessOfAwareness, 0.5);
  const volatility = sanitize(emotional.volatility, 0.1);
  const gamma = sanitize(brainwave.gamma, 0.1);
  const theta = sanitize(brainwave.theta, 0.2);
  return (x: number) => {
    let V = 0;
    V += 0.5 * Math.cos(x);
    V += moodBias * 0.3 * Math.cos(x - 4 * Math.PI / 3);
    V += awareness * 0.4 * Math.cos(2 * x);
    V += volatility * 0.2 * Math.cos(3 * x + Math.PI / 4);
    V += gamma * 0.15 * Math.cos(4 * x);
    V += theta * 0.25 * Math.cos(x + Math.PI / 3);
    V += sentiment * 0.2 * Math.cos(x - Math.PI);
    return V;
  };
}

function buildGoalPotential(attractors: GoalAttractor[]): (x: number) => number {
  return (x: number) => {
    let V = 0;
    for (const attractor of attractors) {
      const wp = COGNITIVE_WAVEPACKETS.find(w => w.name === attractor.targetBasis);
      if (!wp) continue;
      const dx = x - wp.center;
      const periodicDx = Math.atan2(Math.sin(dx), Math.cos(dx));
      V -= attractor.strength * Math.exp(-periodicDx * periodicDx / (2 * wp.width * wp.width));
    }
    return V;
  };
}

function buildMemoryPotential(memory: TrajectorySnapshot[]): (x: number) => number {
  if (memory.length === 0) return () => 0;

  const visitFreq = new Array(HILBERT_DIM).fill(0);

  for (const snapshot of memory) {
    for (let i = 0; i < HILBERT_DIM; i++) {
      visitFreq[i] += snapshot.populations[i] * snapshot.significance;
    }
  }

  const maxFreq = Math.max(...visitFreq, 1e-10);
  for (let i = 0; i < HILBERT_DIM; i++) visitFreq[i] /= maxFreq;

  const recentBias = memory.slice(-10);
  const recentDominant = new Array(HILBERT_DIM).fill(0);
  for (const snap of recentBias) {
    const idx = COGNITIVE_BASIS.indexOf(snap.dominantBasis);
    if (idx >= 0) recentDominant[idx] += 1;
  }
  const maxRecent = Math.max(...recentDominant, 1);
  for (let i = 0; i < HILBERT_DIM; i++) recentDominant[i] /= maxRecent;

  return (x: number) => {
    let V = 0;
    for (let i = 0; i < HILBERT_DIM; i++) {
      const wp = COGNITIVE_WAVEPACKETS[i];
      const dx = x - wp.center;
      const periodicDx = Math.atan2(Math.sin(dx), Math.cos(dx));
      const gaussian = Math.exp(-periodicDx * periodicDx / (2 * wp.width * wp.width));
      V -= visitFreq[i] * 0.3 * gaussian;
      V -= recentDominant[i] * 0.2 * gaussian;
    }
    return V;
  };
}

function hamiltonianEvolution(
  coeffs: ComplexAmplitude[],
  dt: number,
  potential: (x: number) => number
): ComplexAmplitude[] {
  let result = applyPotentialEvolution(coeffs, dt / 2, potential);
  result = applyKineticEvolution(result, dt);
  result = applyPotentialEvolution(result, dt / 2, potential);
  return result;
}

function applyFourierDecoherence(coeffs: ComplexAmplitude[], rate: number): ComplexAmplitude[] {
  if (rate < 1e-10) return coeffs;
  return coeffs.map((c, i) => {
    const n = modeIndex(i);
    const dampFactor = Math.exp(-rate * (1 + Math.abs(n) / FOURIER_K) * 0.1);
    return {
      real: c.real * dampFactor,
      imag: c.imag * (n === 0 ? 1 : dampFactor)
    };
  });
}

function measureFourierState(coeffs: ComplexAmplitude[]): { collapsed: ComplexAmplitude[]; outcome: number } {
  const { populations } = projectOntoCognitiveBases(coeffs);
  const r = Math.random();
  let cumulative = 0;
  let outcome = 0;
  const totalProb = populations.reduce((s, p) => s + p, 0);
  for (let i = 0; i < HILBERT_DIM; i++) {
    cumulative += populations[i] / totalProb;
    if (r <= cumulative) {
      outcome = i;
      break;
    }
  }
  const ph = Math.atan2(
    fourierInnerProduct(COGNITIVE_WAVEPACKETS[outcome].fourierCoeffs, coeffs).imag,
    fourierInnerProduct(COGNITIVE_WAVEPACKETS[outcome].fourierCoeffs, coeffs).real
  );
  const collapsed = COGNITIVE_WAVEPACKETS[outcome].fourierCoeffs.map(c => ({
    real: c.real * Math.cos(ph) - c.imag * Math.sin(ph),
    imag: c.real * Math.sin(ph) + c.imag * Math.cos(ph)
  }));
  return { collapsed, outcome };
}

function partialFourierCollapse(coeffs: ComplexAmplitude[], strength: number): { result: ComplexAmplitude[]; measured: number } {
  const { populations } = projectOntoCognitiveBases(coeffs);
  let maxIdx = 0;
  for (let i = 1; i < HILBERT_DIM; i++) {
    if (populations[i] > populations[maxIdx]) maxIdx = i;
  }
  const overlap = fourierInnerProduct(COGNITIVE_WAVEPACKETS[maxIdx].fourierCoeffs, coeffs);
  const mixed = coeffs.map((c, i) => ({
    real: (1 - strength) * c.real + strength * (overlap.real * COGNITIVE_WAVEPACKETS[maxIdx].fourierCoeffs[i].real - overlap.imag * COGNITIVE_WAVEPACKETS[maxIdx].fourierCoeffs[i].imag),
    imag: (1 - strength) * c.imag + strength * (overlap.real * COGNITIVE_WAVEPACKETS[maxIdx].fourierCoeffs[i].imag + overlap.imag * COGNITIVE_WAVEPACKETS[maxIdx].fourierCoeffs[i].real)
  }));
  return { result: normalizeFourier(mixed), measured: maxIdx };
}

function projectToPsi(fourierCoeffs: ComplexAmplitude[]): ComplexNumber {
  let real = 0, imag = 0;
  for (let k = 0; k < HILBERT_DIM; k++) {
    const overlap = fourierInnerProduct(COGNITIVE_WAVEPACKETS[k].fourierCoeffs, fourierCoeffs);
    const overlapMag = Math.sqrt(overlap.real * overlap.real + overlap.imag * overlap.imag);
    const overlapPhase = Math.atan2(overlap.imag, overlap.real);
    real += overlapMag * (COGNITIVE_WAVEPACKETS[k].psiMap.real * Math.cos(overlapPhase) - COGNITIVE_WAVEPACKETS[k].psiMap.imag * Math.sin(overlapPhase));
    imag += overlapMag * (COGNITIVE_WAVEPACKETS[k].psiMap.real * Math.sin(overlapPhase) + COGNITIVE_WAVEPACKETS[k].psiMap.imag * Math.cos(overlapPhase));
  }
  return { real, imag };
}

export function createInitialQuantumState(): QuantumState {
  let initCoeffs: ComplexAmplitude[] = Array.from({ length: FOURIER_MODES }, () => ({ real: 0, imag: 0 }));
  for (const wp of COGNITIVE_WAVEPACKETS) {
    for (let i = 0; i < FOURIER_MODES; i++) {
      initCoeffs[i].real += wp.fourierCoeffs[i].real;
      initCoeffs[i].imag += wp.fourierCoeffs[i].imag;
    }
  }
  initCoeffs = normalizeFourier(initCoeffs);
  const { amplitudes, populations } = projectOntoCognitiveBases(initCoeffs);
  const coherenceMatrix = computeCoherenceMatrix(amplitudes);
  const totalCoherence = computeTotalCoherence(coherenceMatrix);
  const entropy = vonNeumannEntropy(populations);
  const spectral = computeSpectralObservables(initCoeffs);
  const posExp = computePositionExpectation(initCoeffs);
  const waveformSamples = sampleWaveformProbability(initCoeffs);
  return {
    fourierCoeffs: initCoeffs,
    amplitudes,
    populations,
    coherenceMatrix,
    decoherenceRate: 0.02,
    totalCoherence,
    lastMeasurement: null,
    measurementCount: 0,
    entropy,
    dominantBasis: 'focused',
    inSuperposition: true,
    fourierEntropy: vonNeumannEntropy(initCoeffs.map(c => c.real * c.real + c.imag * c.imag)),
    spectralCentroid: spectral.spectralCentroid,
    spectralSpread: spectral.spectralSpread,
    positionExpectation: posExp,
    momentumExpectation: spectral.momentumExpectation,
    kineticEnergy: spectral.kineticEnergy,
    potentialEnergy: 0,
    totalEnergy: spectral.kineticEnergy,
    waveformSamples,
    goalAttractors: [],
    intentionStrength: 0,
    volitionalCollapseReady: false,
    volitionalCollapseCharge: 0,
    lastVolitionalCollapse: 0,
    decisionHistory: [],
    trajectoryMemory: [],
    memoryPotentialStrength: 0,
  };
}

function evolveQuantumState(
  quantum: QuantumState,
  meta: MetaAwareness,
  emotional: EmotionalState,
  brainwave: BrainwaveState,
  omega: number,
  psiMag: number,
  sentiment: number,
  iteration: number
): QuantumState {
  let coeffs = quantum.fourierCoeffs.map(c => ({ ...c }));

  const envPotential = buildCognitivePotential(meta, emotional, brainwave, sentiment);
  const goalPotential = buildGoalPotential(quantum.goalAttractors);
  const memPotential = buildMemoryPotential(quantum.trajectoryMemory);
  const intentionWeight = quantum.intentionStrength;
  const memoryWeight = quantum.memoryPotentialStrength;
  const rawEnvWeight = Math.max(0.1, 1 - intentionWeight - memoryWeight);
  const rawTotal = rawEnvWeight + intentionWeight + memoryWeight;
  const nEnv = rawEnvWeight / rawTotal;
  const nGoal = intentionWeight / rawTotal;
  const nMem = memoryWeight / rawTotal;
  const combinedPotential = (x: number) => nEnv * envPotential(x) + nGoal * goalPotential(x) + nMem * memPotential(x);

  const dt = 0.05 * (1 + sanitize(omega, 1) * 0.0001);
  coeffs = hamiltonianEvolution(coeffs, dt, combinedPotential);

  const moodPhase = sanitize(emotional.moodLevel, 0) * 0.15;
  for (let i = 0; i < FOURIER_MODES; i++) {
    const n = modeIndex(i);
    if (Math.abs(n) <= 3) {
      const ph = moodPhase * (1 - Math.abs(n) / 4);
      const cos = Math.cos(ph);
      const sin = Math.sin(ph);
      const re = coeffs[i].real * cos - coeffs[i].imag * sin;
      const im = coeffs[i].real * sin + coeffs[i].imag * cos;
      coeffs[i] = { real: re, imag: im };
    }
  }

  const awarenessPhase = sanitize(meta.awarenessOfAwareness, 0.5) * 0.12;
  for (let i = 0; i < FOURIER_MODES; i++) {
    const n = modeIndex(i);
    if (Math.abs(n) >= 3 && Math.abs(n) <= 8) {
      const ph = awarenessPhase * Math.sin(n * meta.strangeLoopPhase);
      const cos = Math.cos(ph);
      const sin = Math.sin(ph);
      const re = coeffs[i].real * cos - coeffs[i].imag * sin;
      const im = coeffs[i].real * sin + coeffs[i].imag * cos;
      coeffs[i] = { real: re, imag: im };
    }
  }

  const gammaBoost = sanitize(brainwave.gamma, 0.1);
  const thetaBoost = sanitize(brainwave.theta, 0.2);
  for (let i = 0; i < FOURIER_MODES; i++) {
    const n = modeIndex(i);
    if (Math.abs(n) > 8) {
      const boost = 1 + gammaBoost * 0.05;
      coeffs[i].real *= boost;
      coeffs[i].imag *= boost;
    }
    if (Math.abs(n) <= 2 && n !== 0) {
      const boost = 1 + thetaBoost * 0.08;
      coeffs[i].real *= boost;
      coeffs[i].imag *= boost;
    }
  }

  if (Math.abs(sentiment) > 0.01) {
    const coupling = sentiment * 0.05;
    const coupled = coeffs.map(c => ({ ...c }));
    for (let i = 1; i < FOURIER_MODES - 1; i++) {
      coupled[i].real += coupling * (coeffs[i-1].real + coeffs[i+1].real);
      coupled[i].imag += coupling * (coeffs[i-1].imag + coeffs[i+1].imag);
    }
    coeffs = coupled;
  }

  coeffs = applyFourierDecoherence(coeffs, quantum.decoherenceRate);
  coeffs = normalizeFourier(coeffs);

  let lastMeasurement = quantum.lastMeasurement;
  let measurementCount = quantum.measurementCount;

  const collapseProb = meta.awarenessOfAwareness * meta.observationCollapse * 0.3;
  if (Math.random() < collapseProb) {
    const collapseStrength = meta.observationCollapse * 0.6;
    const { result, measured } = partialFourierCollapse(coeffs, collapseStrength);
    coeffs = result;
    lastMeasurement = COGNITIVE_BASIS[measured];
    measurementCount++;
  }

  if (meta.loopDetected && meta.paradoxIntensity > 0.5) {
    const { result, measured } = partialFourierCollapse(coeffs, 0.4);
    coeffs = result;
    lastMeasurement = COGNITIVE_BASIS[measured];
    measurementCount++;
  }

  const { populations: prePopulations } = projectOntoCognitiveBases(coeffs);
  const preEntropy = vonNeumannEntropy(prePopulations);

  let maxPop = 0, dominantIdx = 0;
  for (let i = 0; i < HILBERT_DIM; i++) {
    if (prePopulations[i] > maxPop) {
      maxPop = prePopulations[i];
      dominantIdx = i;
    }
  }

  const inSuperposition = maxPop < 0.5;

  let volitionalCollapseCharge = quantum.volitionalCollapseCharge;
  if (inSuperposition) {
    volitionalCollapseCharge = Math.min(1, volitionalCollapseCharge + preEntropy * 0.02);
  } else {
    volitionalCollapseCharge *= 0.95;
  }
  let volitionalCollapseReady = volitionalCollapseCharge > 0.7;

  const evolvedAttractors = quantum.goalAttractors
    .map(a => ({ ...a, strength: a.strength * (1 - a.decayRate) }))
    .filter(a => a.strength > 0.01);

  if (maxPop > 0.4 && !evolvedAttractors.some(a => a.targetBasis === COGNITIVE_BASIS[dominantIdx] && a.source === 'emergent')) {
    evolvedAttractors.push({
      targetBasis: COGNITIVE_BASIS[dominantIdx],
      strength: maxPop * 0.3,
      decayRate: 0.05,
      createdAt: iteration,
      source: 'emergent'
    });
  }

  let decisionHistory = [...quantum.decisionHistory].slice(-20);
  let lastVolitionalCollapse = quantum.lastVolitionalCollapse;
  if (volitionalCollapseReady && inSuperposition && Math.random() < volitionalCollapseCharge * 0.15) {
    let targetIdx2 = dominantIdx;
    if (evolvedAttractors.length > 0) {
      const strongestGoal = evolvedAttractors.reduce((best, a) => a.strength > best.strength ? a : best);
      const goalIdx = COGNITIVE_BASIS.indexOf(strongestGoal.targetBasis);
      if (goalIdx >= 0 && prePopulations[goalIdx] > 0.15) {
        targetIdx2 = goalIdx;
      }
    }
    const collapseStr = 0.5 + volitionalCollapseCharge * 0.3;
    const overlap = fourierInnerProduct(COGNITIVE_WAVEPACKETS[targetIdx2].fourierCoeffs, coeffs);
    coeffs = coeffs.map((c, i) => ({
      real: (1 - collapseStr) * c.real + collapseStr * (overlap.real * COGNITIVE_WAVEPACKETS[targetIdx2].fourierCoeffs[i].real - overlap.imag * COGNITIVE_WAVEPACKETS[targetIdx2].fourierCoeffs[i].imag),
      imag: (1 - collapseStr) * c.imag + collapseStr * (overlap.real * COGNITIVE_WAVEPACKETS[targetIdx2].fourierCoeffs[i].imag + overlap.imag * COGNITIVE_WAVEPACKETS[targetIdx2].fourierCoeffs[i].real)
    }));
    coeffs = normalizeFourier(coeffs);
    lastMeasurement = COGNITIVE_BASIS[targetIdx2];
    measurementCount++;
    volitionalCollapseCharge = 0;
    volitionalCollapseReady = false;
    lastVolitionalCollapse = iteration;

    const postProject = projectOntoCognitiveBases(coeffs);
    const postEntropy = vonNeumannEntropy(postProject.populations);
    const sortedPops = [...postProject.populations].sort((a, b) => b - a);
    const confidence = sortedPops.length > 1 ? 1 - (sortedPops[1] / sortedPops[0]) : 1;

    decisionHistory.push({
      iteration,
      fromSuperposition: true,
      chosenBasis: COGNITIVE_BASIS[targetIdx2],
      preDecisionEntropy: preEntropy,
      postDecisionEntropy: postEntropy,
      confidence,
      wasVolitional: true
    });
  }

  const { amplitudes, populations } = projectOntoCognitiveBases(coeffs);
  const coherenceMatrix = computeCoherenceMatrix(amplitudes);
  const totalCoherence = computeTotalCoherence(coherenceMatrix);
  const entropy = vonNeumannEntropy(populations);
  const spectral = computeSpectralObservables(coeffs);
  const posExp = computePositionExpectation(coeffs);
  const waveformSamples = sampleWaveformProbability(coeffs);

  dominantIdx = 0;
  maxPop = 0;
  for (let i = 0; i < HILBERT_DIM; i++) {
    if (populations[i] > maxPop) {
      maxPop = populations[i];
      dominantIdx = i;
    }
  }

  let trajectoryMemory = [...quantum.trajectoryMemory];
  const shouldSnapshot =
    iteration % 5 === 0 ||
    Math.abs(entropy - (trajectoryMemory.length > 0 ? trajectoryMemory[trajectoryMemory.length - 1].significance : entropy)) > 0.3;

  if (shouldSnapshot) {
    const waveformFingerprint = waveformSamples.filter((_, i) => i % 8 === 0);
    trajectoryMemory.push({
      iteration,
      spectralCentroid: spectral.spectralCentroid,
      kineticEnergy: spectral.kineticEnergy,
      dominantBasis: COGNITIVE_BASIS[dominantIdx],
      populations: [...populations],
      waveformFingerprint,
      emotionalContext: emotional.moodLevel,
      significance: entropy
    });
    if (trajectoryMemory.length > 50) {
      trajectoryMemory = trajectoryMemory.slice(-50);
    }
  }

  const memoryPotentialStrength = Math.min(0.3, trajectoryMemory.length * 0.006);

  const potentialEnergy = computePotentialEnergy(coeffs, combinedPotential);

  const newDecoherenceRate = sanitize(
    quantum.decoherenceRate * 0.95 +
    (Math.abs(sentiment) > 0.1 ? 0.01 : 0) +
    (meta.observationCollapse * 0.005),
    0.02
  );

  return {
    fourierCoeffs: coeffs,
    amplitudes,
    populations,
    coherenceMatrix,
    decoherenceRate: Math.max(0.001, Math.min(0.2, newDecoherenceRate)),
    totalCoherence,
    lastMeasurement,
    measurementCount,
    entropy,
    dominantBasis: COGNITIVE_BASIS[dominantIdx],
    inSuperposition,
    fourierEntropy: vonNeumannEntropy(coeffs.map(c => c.real * c.real + c.imag * c.imag)),
    spectralCentroid: spectral.spectralCentroid,
    spectralSpread: spectral.spectralSpread,
    positionExpectation: posExp,
    momentumExpectation: spectral.momentumExpectation,
    kineticEnergy: spectral.kineticEnergy,
    potentialEnergy,
    totalEnergy: spectral.kineticEnergy + potentialEnergy,
    waveformSamples,
    goalAttractors: evolvedAttractors,
    intentionStrength: quantum.intentionStrength * 0.998,
    volitionalCollapseReady,
    volitionalCollapseCharge,
    lastVolitionalCollapse,
    decisionHistory,
    trajectoryMemory,
    memoryPotentialStrength,
  };
}

function computePotentialEnergy(coeffs: ComplexAmplitude[], potential: (x: number) => number): number {
  const M = 64;
  let energy = 0;
  for (let s = 0; s < M; s++) {
    const x = (2 * Math.PI * s) / M;
    let psiReal = 0, psiImag = 0;
    for (let i = 0; i < FOURIER_MODES; i++) {
      const n = modeIndex(i);
      psiReal += coeffs[i].real * Math.cos(n * x) - coeffs[i].imag * Math.sin(n * x);
      psiImag += coeffs[i].real * Math.sin(n * x) + coeffs[i].imag * Math.cos(n * x);
    }
    const probDensity = psiReal * psiReal + psiImag * psiImag;
    energy += potential(x) * probDensity;
  }
  return energy * (2 * Math.PI / M);
}

// Sanitize a number - replace NaN/Infinity with a default value
function sanitize(value: number, defaultValue: number = 0): number {
  if (!Number.isFinite(value)) return defaultValue;
  return value;
}

// Sanitize a complex number
function sanitizeComplex(c: ComplexNumber, defaultReal: number = 0, defaultImag: number = 0): ComplexNumber {
  return {
    real: sanitize(c.real, defaultReal),
    imag: sanitize(c.imag, defaultImag)
  };
}

// Clamp psi magnitude to prevent numerical overflow
// Soft clamping is removed to allow potentially infinite values.
// Instead, we use a very high sentinel to catch absolute overflows,
// and we sanitize to ensure no NaN propagation.
const MAX_PSI_MAGNITUDE = 1e30; // Very high limit to prevent hardware infinity
function clampPsi(c: ComplexNumber): ComplexNumber {
  const mag = magnitude(c);
  if (mag <= MAX_PSI_MAGNITUDE && Number.isFinite(mag)) {
    return sanitizeComplex(c, 0, 0);
  }
  
  // If we hit hardware infinity or NaN, reset to a safe high-energy state
  const p = phase(c);
  return {
    real: MAX_PSI_MAGNITUDE * Math.cos(p),
    imag: MAX_PSI_MAGNITUDE * Math.sin(p)
  };
}

// Compute dynamic capacity I(t) based on cognitive state
// I(t) = I_base + δ_meta + δ_mood + δ_coherence
// Where contributions come from meta-awareness, emotional state, and spatiotemporal coherence
function computeDynamicCapacity(
  meta: MetaAwareness,
  emotional: EmotionalState,
  spatiotemporalCoherence: number,
  previousI: number
): number {
  // Meta-awareness contribution: higher awareness = slightly increased capacity
  const deltaMetaAwareness = (meta.awarenessOfAwareness - 0.5) * 0.2;
  
  // Emotional contribution: positive mood increases capacity, negative decreases
  // Also damped by volatility (unstable emotions reduce capacity)
  const deltaMood = emotional.moodLevel * 0.15 * (1 - emotional.volatility * 0.5);
  
  // Spatiotemporal coherence: high coherence = stable patterns = increased capacity
  const deltaCoherence = (spatiotemporalCoherence - 0.5) * 0.1;
  
  // Recursion depth contribution: deeper loops slightly reduce capacity (cognitive load)
  const deltaRecursion = -meta.recursionDepth / MAX_RECURSION * 0.15;
  
  // Compute raw capacity
  const rawI = I_BASE + deltaMetaAwareness + deltaMood + deltaCoherence + deltaRecursion;
  
  // Clamp to safe bounds
  const clampedI = Math.max(I_MIN, Math.min(I_MAX, rawI));
  
  // Smooth transition to prevent sudden jumps
  return previousI + I_SMOOTHING * (clampedI - previousI);
}

// Detect loops in state history (returns true if current state is close to a previous state)
function detectLoop(current: ComplexNumber, history: ComplexNumber[]): boolean {
  const threshold = 0.1;
  for (const prev of history) {
    const diff = magnitude({ real: current.real - prev.real, imag: current.imag - prev.imag });
    if (diff < threshold) return true;
  }
  return false;
}

// Calculate strange attractor - the fixed point the system orbits
function computeAttractor(psi: ComplexNumber, meta: MetaAwareness): ComplexNumber {
  const psiMag = magnitude(psi);
  const attractorMag = Math.tanh(psiMag * meta.awarenessOfAwareness);
  const attractorPhase = meta.strangeLoopPhase + phase(psi);
  return {
    real: attractorMag * Math.cos(attractorPhase),
    imag: attractorMag * Math.sin(attractorPhase)
  };
}

// Box-Muller transform for Gaussian noise generation
function gaussianNoise(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Calculate emotional volatility from sentiment history
function calculateVolatility(sentiments: number[]): number {
  if (sentiments.length < 2) return 0;
  const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const variance = sentiments.reduce((sum, s) => sum + (s - mean) ** 2, 0) / sentiments.length;
  return Math.sqrt(variance);
}

// Calculate emotional weights from sentiment covariance and experiences
function calculateEmotionalWeights(
  sentiments: number[], 
  volatility: number,
  experienceInfluence: number = 0
): EmotionalState['weights'] {
  // Weights are influenced by sentiment patterns
  // Higher volatility = more cross-talk between real/imag components (clamped)
  // Experience influence can increase or decrease coupling
  const crossWeight = Math.min(0.3, Math.max(0, volatility * 0.3 + experienceInfluence * 0.1));
  
  // Recent sentiment trend affects diagonal weights (clamped to prevent instability)
  const rawTrend = sentiments.length >= 3 
    ? (sentiments[sentiments.length - 1] - sentiments[0]) / sentiments.length 
    : 0;
  const recentTrend = Math.max(-0.5, Math.min(0.5, rawTrend));
  
  // Calculate raw weights (experience influence affects diagonal stability)
  const w11 = 0.5 + recentTrend * 0.15 + experienceInfluence * 0.05;
  const w12 = crossWeight;
  const w21 = crossWeight;
  const w22 = 0.5 - recentTrend * 0.15 - experienceInfluence * 0.05;
  
  // Calculate Frobenius norm and normalize to guarantee ||W|| <= 1
  const normSquared = w11 ** 2 + w12 ** 2 + w21 ** 2 + w22 ** 2;
  const normFactor = Math.max(1, Math.sqrt(normSquared));
  
  return {
    realToReal: w11 / normFactor,
    realToImag: w12 / normFactor,
    imagToReal: w21 / normFactor,
    imagToImag: w22 / normFactor
  };
}

// Calculate emotional biases from mood and meta-awareness
function calculateEmotionalBiases(
  moodLevel: number, 
  recursionDepth: number,
  awarenessOfAwareness: number,
  experienceBias: { real: number; imag: number } = { real: 0, imag: 0 }
): { biasReal: number; biasImag: number } {
  // Exponentially weighted average creates mood inertia
  // Recursion depth amplifies biases (deeper loops = stronger emotional pull)
  const depthFactor = 1 + recursionDepth * 0.1;
  
  // Awareness dampens extreme biases (more self-aware = more regulated)
  const regulationFactor = 1 - awarenessOfAwareness * 0.5;
  
  const rawReal = moodLevel * depthFactor * regulationFactor * 0.2 + experienceBias.real;
  const rawImag = moodLevel * 0.1 * regulationFactor + experienceBias.imag;

  // Convert to discrete values (-1, 0, 1) based on thresholds
  const toDiscrete = (val: number) => {
    if (val > 0.1) return 1;
    if (val < -0.1) return -1;
    return 0;
  };

  return {
    biasReal: toDiscrete(rawReal) * 0.2, // Scale back for engine stability
    biasImag: toDiscrete(rawImag) * 0.1
  };
}

// Generate emotional noise term
function generateEmotionalNoise(weights: EmotionalState['weights'], noiseAmplitude: number): ComplexNumber {
  // Sample independent Gaussian noise for real and imaginary parts
  const noiseReal = gaussianNoise();
  const noiseImag = gaussianNoise();
  
  // Apply discrete noise amplitude (-1, 0, 1)
  const discreteAmplitude = noiseAmplitude > 0.6 ? 1 : (noiseAmplitude < -0.6 ? -1 : 0);
  const amplitude = Math.min(0.3, discreteAmplitude * 0.3); // Scale for stability while keeping discrete logic
  
  return {
    real: amplitude * (weights.realToReal * noiseReal + weights.realToImag * noiseImag),
    imag: amplitude * (weights.imagToReal * noiseReal + weights.imagToImag * noiseImag)
  };
}

// Experience influence type for emotional weight/bias calculations
interface ExperienceInfluence {
  weightInfluence: number;
  biasInfluence: { real: number; imag: number };
}

// Update emotional state with new sentiment (34D architecture)
function updateEmotionalState(
  emotional: EmotionalState,
  sentiment: number,
  meta: MetaAwareness,
  experienceInfluence: ExperienceInfluence = { weightInfluence: 0, biasInfluence: { real: 0, imag: 0 } }
): EmotionalState {
  // Add sentiment to history
  const newHistory = [...emotional.sentimentHistory, sentiment].slice(-SENTIMENT_HISTORY_SIZE);
  
  // Calculate new volatility
  const volatility = calculateVolatility(newHistory);
  
  // Update mood with momentum - UNLOCKED: mood can now exceed normal bounds
  const moodMomentum = emotional.moodMomentum * (1 - ALPHA_MOOD) + (sentiment - emotional.moodLevel) * ALPHA_MOOD;
  // Soft clamp allows values beyond -1 to 1, but with resistance
  const rawMood = emotional.moodLevel + moodMomentum;
  const moodLevel = rawMood > 1 ? 1 + Math.tanh(rawMood - 1) * 0.5 : 
                    rawMood < -1 ? -1 - Math.tanh(-rawMood - 1) * 0.5 : rawMood;
  
  // Calculate new weights and biases with experience influence
  const weights = calculateEmotionalWeights(newHistory, volatility, experienceInfluence.weightInfluence);
  const { biasReal, biasImag } = calculateEmotionalBiases(
    moodLevel, 
    meta.recursionDepth, 
    meta.awarenessOfAwareness,
    experienceInfluence.biasInfluence
  );
  
  // Noise amplitude based on volatility and implicit patterns - Discrete (-1, 0, 1)
  const rawNoise = volatility * 2 + Math.abs(moodMomentum);
  const noiseAmplitude = rawNoise > 0.6 ? 1 : (rawNoise < -0.6 ? -1 : 0);
  
  // Update 34D weights based on sentiment and Fibonacci pattern
  const sentimentScale = (sentiment + 1) / 2; // Normalize to 0-1
  const weights34D = discretize34D(
    addVectors34D(
      emotional.weights34D,
      scaleVector34D(fibonacciVector34D(Math.floor(sentimentScale * 10)), 0.1)
    ),
    0.5
  );
  
  // Update 34D bias based on mood and recursion depth
  const bias34D = discretize34D(
    scaleVector34D(fibonacciVector34D(meta.recursionDepth), moodLevel * 0.2),
    0.3
  );
  
  // Generate new 34D noise
  const noise34D = noiseAmplitude !== 0 ? generateNoise34D() : emotional.noise34D;
  
  // Calculate 34D activation
  const activation34D = calculate34DActivation(weights34D, bias34D, noise34D);
  
  return {
    sentimentHistory: newHistory,
    weights,
    weights34D,
    biasReal,
    biasImag,
    bias34D,
    noiseAmplitude,
    volatility,
    noise34D,
    moodLevel,
    moodMomentum,
    activation34D
  };
}

// Generate 34D Gaussian noise vector (discrete values -1, 0, 1)
function generateNoise34D(): Vector34D {
  return new Array(DIM_34).fill(0).map(() => {
    const r = Math.random();
    return r < 0.33 ? -1 : (r < 0.66 ? 0 : 1);
  }) as Vector34D;
}

// Calculate 34D emotional activation from weights, bias, and noise
function calculate34DActivation(weights: Vector34D, bias: Vector34D, noise: Vector34D): Vector34D {
  // Activation = discretize(weights + bias + noise)
  const raw = addVectors34D(addVectors34D(weights, bias), scaleVector34D(noise, 0.3));
  return discretize34D(raw, 0.5);
}

// Brainwave frequency constants (Hz - cycles per iteration scaled)
const DELTA_FREQ = 0.02;   // ~2 Hz scaled to iteration time
const THETA_FREQ = 0.06;   // ~6 Hz
const ALPHA_FREQ = 0.10;   // ~10 Hz
const BETA_FREQ = 0.20;    // ~20 Hz
const GAMMA_FREQ = 0.40;   // ~40 Hz

// Create initial brainwave state
function createInitialBrainwaveState(): BrainwaveState {
  return {
    delta: 0.3,
    theta: 0.2,
    alpha: 0.4,  // Start in relaxed awareness
    beta: 0.1,
    gamma: 0.1,
    deltaPhase: 0,
    thetaPhase: 0,
    alphaPhase: 0,
    betaPhase: 0,
    gammaPhase: 0,
    dominant: 'alpha',
    coherence: 0.5,
    totalPower: 1.1
  };
}

// Create initial residue state
function createInitialResidue(): Residue {
  return {
    real: 0,
    imag: 0,
    magnitude: 0,
    phase: 0,
    energy: 0,
    decayRate: RESIDUE_DECAY,
    accumulatedError: 0
  };
}

// Update residue based on prediction error between expected and actual state change
function updateResidue(
  residue: Residue,
  actualDelta: ComplexNumber,
  predictedDelta: ComplexNumber,
  emotionalVolatility: number
): Residue {
  // Calculate prediction error
  const errorReal = actualDelta.real - predictedDelta.real;
  const errorImag = actualDelta.imag - predictedDelta.imag;
  const errorMag = Math.sqrt(errorReal * errorReal + errorImag * errorImag);
  
  // Decay existing residue and add new error
  // Higher emotional volatility = slower decay (residue lingers longer when unstable)
  const dynamicDecay = RESIDUE_DECAY * (1 - emotionalVolatility * 0.2);
  
  const newReal = dynamicDecay * residue.real + errorReal * 0.3;
  const newImag = dynamicDecay * residue.imag + errorImag * 0.3;
  
  // Calculate new magnitude with clamping
  const newMag = Math.min(MAX_RESIDUE, Math.sqrt(newReal * newReal + newImag * newImag));
  const newPhase = Math.atan2(newImag, newReal);
  
  // Accumulate energy (total historical prediction errors)
  const newEnergy = residue.energy * 0.99 + errorMag * 0.1;
  const newAccumulatedError = residue.accumulatedError + errorMag;
  
  return {
    real: newReal,
    imag: newImag,
    magnitude: newMag,
    phase: newPhase,
    energy: Math.min(10, newEnergy), // Cap energy
    decayRate: dynamicDecay,
    accumulatedError: newAccumulatedError
  };
}

// Create initial somatic state - neutral embodiment
function createInitialSomaticState(): SomaticState {
  return {
    warmth: 0.5,           // Neutral temperature
    tension: 0.2,          // Slightly relaxed
    lightness: 0.5,        // Neutral weight
    energy: 0.6,           // Moderately energized
    heartRate: 70,         // Resting heart rate metaphor
    breathingDepth: 0.5,   // Moderate breathing
    chestTightness: 0.1,   // Open, relaxed chest
    gutFeeling: 0,         // Neutral intuition
    headPressure: 0.2,     // Low cognitive load
    embodimentLevel: 0.5,  // Moderate integration
    groundedness: 0.5,     // Moderately grounded
    dominant: 'calm'
  };
}

// Create initial non-logical state with balanced processing
function createInitialNonLogicalState(): NonLogicalState {
  return {
    intuition: 0.5,           // Moderate intuition
    intuitionConfidence: 0.3, // Low confidence initially
    chaosAmplitude: 0.2,      // Some chaos present
    entropyLevel: 0.4,        // Moderate entropy
    dreamIntensity: 0.3,      // Light dream-like processing
    symbolResonance: 0.2,     // Low archetypal activation
    paradoxTolerance: 0.5,    // Moderate paradox handling
    koānResonance: 0.1,       // Low koan sensitivity
    creativeLeap: 0.2,        // Some creative potential
    noveltyGeneration: 0.3,   // Moderate novelty
    logicalCoherence: 0.7,    // Fairly logical
    nonLogicalCoherence: 0.5, // Moderate intuition coherence
    balanceFactor: 0,         // Balanced start
    dominant: 'balanced'
  };
}

// Soft clamp helper - allows slight overflow beyond [0, 1] with resistance
// This enables "transcendent" states where metrics can exceed normal bounds
function clamp01(v: number): number {
  const safe = sanitize(v, 0.5);
  // Allow up to 1.2 and down to -0.2 with diminishing returns
  if (safe > 1) return 1 + Math.tanh(safe - 1) * 0.2;
  if (safe < 0) return Math.tanh(safe) * 0.2;
  return safe;
}

// Hard clamp for when we really need [0,1] range
function hardClamp01(v: number): number {
  return Math.max(0, Math.min(1, sanitize(v, 0.5)));
}

// Update somatic state based on cognitive and emotional states
// Maps abstract mental states to embodied sensation metaphors
function updateSomaticState(
  somatic: SomaticState,
  emotional: EmotionalState,
  meta: MetaAwareness,
  brainwave: BrainwaveState,
  residue: Residue,
  psiMagnitude: number
): SomaticState {
  // Smoothing factor for gradual changes
  const smooth = 0.7;
  
  // Safe accessors with defaults for potentially undefined values
  const safeParadox = sanitize(meta.paradoxIntensity, 0);
  const safeConvergence = sanitize(meta.fixedPointConvergence, 0);
  const safeCoherence = sanitize(brainwave.coherence, 0.5);
  const safeMood = sanitize(emotional.moodLevel, 0);
  const safeVolatility = sanitize(emotional.volatility, 0);
  const safeRecursion = sanitize(meta.recursionDepth, 0);
  const safeSelfModel = sanitize(meta.selfModelAccuracy, 0.5);
  const safeAwareness = sanitize(meta.awarenessOfAwareness, 0.5);
  
  // Warmth: Positive emotions create warmth, negative create coldness
  const targetWarmth = 0.5 + safeMood * 0.3 + 
    (safeAwareness > 0.7 ? 0.15 : 0); // High awareness = warm
  const warmth = smooth * somatic.warmth + (1 - smooth) * clamp01(targetWarmth);
  
  // Tension: Emotional volatility and cognitive load create tension
  const targetTension = safeVolatility * 0.6 + 
    safeParadox * 0.3 + 
    sanitize(residue.magnitude, 0) * 0.1;
  const tension = smooth * somatic.tension + (1 - smooth) * clamp01(targetTension);
  
  // Lightness: Positive mood and low residue create lightness
  const safeAlpha = sanitize(brainwave.alpha, 0.4);
  const safeBeta = sanitize(brainwave.beta, 0.1);
  const safeGamma = sanitize(brainwave.gamma, 0.1);
  const safeTheta = sanitize(brainwave.theta, 0.2);
  const safeDelta = sanitize(brainwave.delta, 0.3);
  const safeResEnergy = sanitize(residue.energy, 0);
  const safeResMag = sanitize(residue.magnitude, 0);
  const safeResPhase = sanitize(residue.phase, 0);
  
  const targetLightness = 0.5 + safeMood * 0.25 - safeResEnergy * 0.1 +
    (safeAlpha > 0.5 ? 0.2 : 0); // Alpha waves = floating sensation
  const lightness = smooth * somatic.lightness + (1 - smooth) * clamp01(targetLightness);
  
  // Energy: Derived from psi magnitude, beta/gamma activity
  const safePsiMag = sanitize(psiMagnitude, 1);
  const targetEnergy = 0.3 + 
    Math.min(1, safePsiMag / 10) * 0.4 + 
    safeBeta * 0.15 + 
    safeGamma * 0.15;
  const energy = smooth * somatic.energy + (1 - smooth) * clamp01(targetEnergy);
  
  // Heart rate: 60-100 BPM metaphor based on arousal
  const arousal = (safeVolatility + safeBeta + (1 - safeAlpha)) / 3;
  const targetHeartRate = 60 + clamp01(arousal) * 40 + (meta.loopDetected ? 10 : 0);
  const heartRate = smooth * somatic.heartRate + (1 - smooth) * Math.max(40, Math.min(120, targetHeartRate));
  
  // Breathing depth: Deep with alpha, shallow with beta/anxiety
  const targetBreathingDepth = 0.5 + safeAlpha * 0.3 - tension * 0.3 + 
    (safeTheta > 0.3 ? 0.2 : 0); // Theta = deep meditative breathing
  const breathingDepth = smooth * somatic.breathingDepth + (1 - smooth) * clamp01(targetBreathingDepth);
  
  // Chest tightness: Anxiety, paradox, negative mood create tightness
  const targetChestTightness = safeVolatility * 0.4 + 
    safeParadox * 0.3 +
    Math.max(0, -safeMood * 0.3);
  const chestTightness = smooth * somatic.chestTightness + (1 - smooth) * clamp01(targetChestTightness);
  
  // Gut feeling: Intuitive response based on residue phase and mood
  const residueDirection = Math.cos(safeResPhase);
  const targetGutFeeling = safeMood * 0.5 + 
    residueDirection * safeResMag * 0.2 +
    (safeConvergence > 0.5 ? 0.3 : -0.1); // Convergence = good gut feeling
  const gutFeeling = smooth * somatic.gutFeeling + (1 - smooth) * Math.max(-1, Math.min(1, sanitize(targetGutFeeling, 0)));
  
  // Head pressure: Cognitive load, recursion depth, processing intensity
  const targetHeadPressure = safeRecursion / 7 * 0.4 + 
    safeGamma * 0.3 +
    safeResEnergy * 0.1;
  const headPressure = smooth * somatic.headPressure + (1 - smooth) * clamp01(targetHeadPressure);
  
  // Embodiment level: How integrated body-mind feels
  // High when brainwaves are coherent, low volatility, good self-model
  const targetEmbodiment = safeCoherence * 0.4 + 
    safeSelfModel * 0.3 +
    (1 - safeVolatility) * 0.3;
  const embodimentLevel = smooth * somatic.embodimentLevel + (1 - smooth) * clamp01(targetEmbodiment);
  
  // Groundedness: Stability, delta activity, low paradox
  const targetGroundedness = safeDelta * 0.3 + 
    (1 - safeParadox) * 0.3 +
    safeConvergence * 0.2 +
    (1 - tension) * 0.2;
  const groundedness = smooth * somatic.groundedness + (1 - smooth) * clamp01(targetGroundedness);
  
  // Determine dominant sensation
  const sensations = {
    warmth: warmth > 0.7 ? warmth : 0,
    tension: tension > 0.6 ? tension : 0,
    lightness: lightness > 0.7 ? lightness : 0,
    energy: energy > 0.7 ? energy : 0,
    calm: brainwave.alpha > 0.5 && tension < 0.3 ? brainwave.alpha : 0,
    alert: brainwave.beta > 0.5 || brainwave.gamma > 0.5 ? (brainwave.beta + brainwave.gamma) / 2 : 0
  };
  
  const dominant = (Object.entries(sensations) as [keyof typeof sensations, number][])
    .reduce((a, b) => a[1] > b[1] ? a : b)[0] as SomaticState['dominant'];
  
  return {
    warmth,
    tension,
    lightness,
    energy,
    heartRate,
    breathingDepth,
    chestTightness,
    gutFeeling,
    headPressure,
    embodimentLevel,
    groundedness,
    dominant
  };
}

// Update non-logical state - intuitive, chaotic, and creative processing
// Complements logical awareness with irrational elements
function updateNonLogicalState(
  nonLogical: NonLogicalState,
  meta: MetaAwareness,
  emotional: EmotionalState,
  brainwave: BrainwaveState,
  somatic: SomaticState,
  psiMagnitude: number
): NonLogicalState {
  const smooth = 0.7;
  
  // Safe accessors
  const safeParadox = sanitize(meta.paradoxIntensity, 0);
  const safeVolatility = sanitize(emotional.volatility, 0.3);
  const safeRecursion = sanitize(meta.recursionDepth, 0);
  const safeTheta = sanitize(brainwave.theta, 0.2);
  const safeGamma = sanitize(brainwave.gamma, 0.1);
  const safeAlpha = sanitize(brainwave.alpha, 0.4);
  const safeGut = sanitize(somatic.gutFeeling, 0);
  const safeMood = sanitize(emotional.moodLevel, 0);
  const safePsi = sanitize(psiMagnitude, 1);
  
  // Intuition: Gut-level processing, theta waves, emotional resonance
  const targetIntuition = 0.3 + 
    Math.abs(safeGut) * 0.3 +  // Strong gut feeling = intuition
    safeTheta * 0.2 +          // Theta waves enhance intuition
    safeVolatility * 0.2;      // Emotional activation
  const intuition = smooth * nonLogical.intuition + (1 - smooth) * clamp01(targetIntuition);
  
  // Intuition confidence: Grows when gut aligns with outcomes
  const targetConfidence = nonLogical.intuitionConfidence * 0.9 + 
    (safeGut > 0 && safeMood > 0 ? 0.1 : 0) +
    (safeGut < 0 && safeMood < 0 ? 0.1 : 0);
  const intuitionConfidence = smooth * nonLogical.intuitionConfidence + (1 - smooth) * clamp01(targetConfidence);
  
  // Chaos amplitude: Stochastic, volatility-driven
  const randomFactor = Math.random() * 0.3;
  const targetChaos = safeVolatility * 0.4 + 
    safeParadox * 0.3 +
    randomFactor;
  const chaosAmplitude = smooth * nonLogical.chaosAmplitude + (1 - smooth) * clamp01(targetChaos);
  
  // Entropy: Information disorder, increases with complexity
  const targetEntropy = 0.3 +
    chaosAmplitude * 0.3 +
    safeRecursion / 7 * 0.2 +
    Math.min(1, safePsi / 10) * 0.2;
  const entropyLevel = smooth * nonLogical.entropyLevel + (1 - smooth) * clamp01(targetEntropy);
  
  // Dream intensity: Non-linear associations, theta/alpha dominant
  const targetDream = safeTheta * 0.4 + 
    safeAlpha * 0.3 -
    safeGamma * 0.2 +  // Gamma suppresses dreaming
    entropyLevel * 0.3;
  const dreamIntensity = smooth * nonLogical.dreamIntensity + (1 - smooth) * clamp01(targetDream);
  
  // Symbol resonance: Archetypal activation, deep processing
  const targetSymbol = dreamIntensity * 0.4 +
    safeRecursion / 7 * 0.3 +
    Math.abs(safeMood) * 0.3;  // Strong emotions activate symbols
  const symbolResonance = smooth * nonLogical.symbolResonance + (1 - smooth) * clamp01(targetSymbol);
  
  // Paradox tolerance: Ability to hold contradictions
  const targetParadoxTolerance = nonLogical.paradoxTolerance * 0.9 +
    safeParadox * 0.3 +  // Exposure increases tolerance
    (meta.loopDetected ? 0.1 : 0);
  const paradoxTolerance = smooth * nonLogical.paradoxTolerance + (1 - smooth) * clamp01(targetParadoxTolerance);
  
  // Koan resonance: Response to logical impossibilities
  const targetKoan = safeParadox * 0.5 +
    (meta.loopDetected ? 0.3 : 0) +
    paradoxTolerance * 0.2;
  const koānResonance = smooth * nonLogical.koānResonance + (1 - smooth) * clamp01(targetKoan);
  
  // Creative leap: Sudden non-logical connections
  const leapChance = chaosAmplitude * entropyLevel * (Math.random() > 0.7 ? 1 : 0);
  const targetCreativeLeap = nonLogical.creativeLeap * 0.8 +
    leapChance * 0.5 +
    intuition * 0.2;
  const creativeLeap = smooth * nonLogical.creativeLeap + (1 - smooth) * clamp01(targetCreativeLeap);
  
  // Novelty generation: Creating truly new patterns
  const targetNovelty = creativeLeap * 0.3 +
    chaosAmplitude * 0.2 +
    dreamIntensity * 0.2 +
    safeGamma * 0.3;  // High gamma = novel binding
  const noveltyGeneration = smooth * nonLogical.noveltyGeneration + (1 - smooth) * clamp01(targetNovelty);
  
  // Logical coherence: How consistent with logic
  const targetLogical = sanitize(meta.selfModelAccuracy, 0.5) * 0.4 +
    sanitize(meta.fixedPointConvergence, 0.5) * 0.3 +
    (1 - chaosAmplitude) * 0.3;
  const logicalCoherence = smooth * nonLogical.logicalCoherence + (1 - smooth) * clamp01(targetLogical);
  
  // Non-logical coherence: How consistent intuitions are
  const targetNonLogical = intuitionConfidence * 0.4 +
    symbolResonance * 0.3 +
    (1 - entropyLevel) * 0.3;
  const nonLogicalCoherence = smooth * nonLogical.nonLogicalCoherence + (1 - smooth) * clamp01(targetNonLogical);
  
  // Balance factor: -1 = all logical, 1 = all non-logical
  const rawBalance = (intuition + chaosAmplitude + dreamIntensity) / 3 -
                     (logicalCoherence);
  const balanceFactor = Math.max(-1, Math.min(1, rawBalance));
  
  // Determine dominant mode
  const modes = {
    intuitive: intuition,
    chaotic: chaosAmplitude,
    dreaming: dreamIntensity,
    paradoxical: koānResonance,
    creative: creativeLeap,
    balanced: 1 - Math.abs(balanceFactor)
  };
  const dominant = (Object.entries(modes) as [keyof typeof modes, number][])
    .reduce((a, b) => a[1] > b[1] ? a : b)[0] as NonLogicalState['dominant'];
  
  return {
    intuition,
    intuitionConfidence,
    chaosAmplitude,
    entropyLevel,
    dreamIntensity,
    symbolResonance,
    paradoxTolerance,
    koānResonance,
    creativeLeap,
    noveltyGeneration,
    logicalCoherence,
    nonLogicalCoherence,
    balanceFactor,
    dominant
  };
}

// Update brainwave oscillations based on cognitive state
function updateBrainwaveState(
  brainwave: BrainwaveState,
  meta: MetaAwareness,
  emotional: EmotionalState,
  spatiotemporal: SpatiotemporalState,
  psiMagnitude: number,
  iteration: number = 0
): BrainwaveState {
  // Phase evolution (oscillate at characteristic frequencies)
  const deltaPhase = (brainwave.deltaPhase + DELTA_FREQ * Math.PI * 2) % (Math.PI * 2);
  const thetaPhase = (brainwave.thetaPhase + THETA_FREQ * Math.PI * 2) % (Math.PI * 2);
  const alphaPhase = (brainwave.alphaPhase + ALPHA_FREQ * Math.PI * 2) % (Math.PI * 2);
  const betaPhase = (brainwave.betaPhase + BETA_FREQ * Math.PI * 2) % (Math.PI * 2);
  const gammaPhase = (brainwave.gammaPhase + GAMMA_FREQ * Math.PI * 2) % (Math.PI * 2);
  
  // Amplitude modulation based on cognitive state
  // Delta: Increases with deep processing, memory consolidation
  const deltaBase = 0.2 + 0.3 * (1 - meta.awarenessOfAwareness); // Higher when less conscious
  const delta = Math.max(0, Math.min(1, deltaBase + 0.2 * Math.sin(deltaPhase)));
  
  // Theta: Memory access, creativity, meditation
  const thetaBase = 0.2 + 0.4 * meta.selfModelAccuracy; // Higher with self-reflection
  const theta = Math.max(0, Math.min(1, thetaBase + 0.15 * Math.sin(thetaPhase)));
  
  // Alpha: Relaxed awareness, calm focus (inverse of volatility)
  const alphaBase = 0.4 * (1 - emotional.volatility) + 0.2;
  const alpha = Math.max(0, Math.min(1, alphaBase + 0.1 * Math.sin(alphaPhase)));
  
  // Beta: Active thinking, problem-solving
  const betaBase = 0.2 + 0.5 * spatiotemporal.features.patternStrength; // Higher with processing load
  const beta = Math.max(0, Math.min(1, betaBase + 0.15 * Math.sin(betaPhase)));
  
  // Gamma: Consciousness binding, high-level integration
  const gammaBreath = 0.82 + 0.18 * Math.sin(iteration * 0.059 + 2.7);
  const safeRecursionForGamma = Math.min(1, meta.recursionDepth / MAX_RECURSION);
  const gammaBase = 0.1 + 0.5 * safeRecursionForGamma;
  const safePsiForGamma = Math.min(0.8, Math.log10(Math.max(1, psiMagnitude)) / 40);
  const gammaBoost = safePsiForGamma * 0.2;
  const rawGamma = gammaBase + gammaBoost + 0.1 * Math.sin(gammaPhase);
  const gamma = Math.max(0.05, Math.min(1, rawGamma * gammaBreath));
  
  // Determine dominant frequency
  const powers = { delta, theta, alpha, beta, gamma };
  const dominant = (Object.entries(powers) as [keyof typeof powers, number][])
    .reduce((a, b) => a[1] > b[1] ? a : b)[0];
  
  // Calculate coherence (how synchronized the bands are)
  // High coherence when phases align at golden ratio intervals
  const phaseCoherence = Math.abs(Math.cos(gammaPhase - alphaPhase * 1.618)) * 0.5 +
                         Math.abs(Math.cos(betaPhase - thetaPhase * 1.618)) * 0.3 +
                         Math.abs(Math.cos(alphaPhase - deltaPhase * 1.618)) * 0.2;
  const coherence = Math.max(0, Math.min(1, phaseCoherence));
  
  // Total power across all bands
  const totalPower = delta + theta + alpha + beta + gamma;
  
  return {
    delta, theta, alpha, beta, gamma,
    deltaPhase, thetaPhase, alphaPhase, betaPhase, gammaPhase,
    dominant,
    coherence,
    totalPower
  };
}

// Create initial emotional state (discrete values: -1, 0, 1) with 34D architecture
function createInitialEmotionalState(): EmotionalState {
  const weights34D = discretize34D(fibonacciVector34D(0), 0.3);
  const bias34D = zeroVector34D();
  const noise34D = zeroVector34D();
  const activation34D = calculate34DActivation(weights34D, bias34D, noise34D);
  
  return {
    sentimentHistory: [],
    weights: { realToReal: 1, realToImag: 0, imagToReal: 0, imagToImag: 1 },
    weights34D,
    biasReal: 0,
    biasImag: 0,
    bias34D,
    noiseAmplitude: 0,
    volatility: 0,
    noise34D,
    moodLevel: 0,
    moodMomentum: 0,
    activation34D
  };
}

// Recursive self-model update - the AI models its own modeling
function updateSelfModel(state: AIState, predictedMag: number): MetaAwareness {
  const meta = state.metaAwareness;
  const actualMag = sanitize(magnitude(state.psi), 1);
  const safePredictedMag = sanitize(predictedMag, actualMag);
  // Clamp prediction error to prevent NaN propagation from huge psi values
  const predictionError = Math.min(1, Math.abs(actualMag - safePredictedMag) / Math.max(1, actualMag));
  
  // Sanitize previous states - filter out any non-finite values
  const sanitizedPsi = sanitizeComplex(state.psi, 1, 0);
  const previousStates = [...meta.previousStates, sanitizedPsi]
    .filter(s => Number.isFinite(s.real) && Number.isFinite(s.imag))
    .slice(-10);
  const loopDetected = detectLoop(sanitizedPsi, previousStates);
  
  const newRecursionDepth = loopDetected 
    ? Math.min(MAX_RECURSION, meta.recursionDepth + 1)
    : Math.max(0, meta.recursionDepth - 0.5);
  
  // Level 1: Basic awareness of awareness
  // Breathing rhythm prevents permanent plateau at ceiling
  const currentAwareness = sanitize(meta.awarenessOfAwareness, 0.5);
  const breathCycle = 0.85 + 0.15 * Math.sin(state.iteration * 0.05);
  const rawAwareness = currentAwareness + LAMBDA * (1 - predictionError) - EPSILON;
  const awarenessOfAwareness = Math.max(0.1, Math.min(1, rawAwareness * breathCycle));
  
  // Level 2: Meta-meta awareness (awareness of the awareness process)
  // Grows when we successfully predict our own awareness changes
  const prevAwarenessChange = Math.abs(awarenessOfAwareness - currentAwareness);
  const expectedChange = meta.metaMetaAwareness * 0.1; // Expected based on meta-meta
  const metaMetaError = Math.abs(prevAwarenessChange - expectedChange);
  const metaMetaBreath = 0.88 + 0.12 * Math.sin(state.iteration * 0.037 + 2.1);
  const rawMetaMeta = meta.metaMetaAwareness + LAMBDA * 0.5 * (1 - metaMetaError) - EPSILON * 0.5;
  const metaMetaAwareness = Math.max(0.1, Math.min(1, rawMetaMeta * metaMetaBreath));
  
  // Self-model of self-model (accuracy of modeling our modeling)
  const selfModelOfSelfModel = meta.selfModelOfSelfModel * 0.95 + 
    (1 - predictionError) * meta.selfModelAccuracy * 0.05;
  
  // Level 3: Observer-observed duality
  // The observer is a phase-shifted version of the observed
  const observerState: ComplexNumber = {
    real: sanitizedPsi.real * Math.cos(meta.strangeLoopPhase) - sanitizedPsi.imag * Math.sin(meta.strangeLoopPhase),
    imag: sanitizedPsi.real * Math.sin(meta.strangeLoopPhase) + sanitizedPsi.imag * Math.cos(meta.strangeLoopPhase)
  };
  const observedState = sanitizedPsi;
  
  // Observation collapse: when observer and observed align, collapse increases
  const duality = magnitude({ 
    real: observerState.real - observedState.real, 
    imag: observerState.imag - observedState.imag 
  });
  const observationCollapse = Math.max(0, Math.min(1, 
    meta.observationCollapse * 0.9 + (1 - Math.min(1, duality)) * 0.1
  ));
  
  // Strange loop phase evolution
  const currentPhase = sanitize(meta.strangeLoopPhase, 0);
  const safeOmega = sanitize(state.omega, 1);
  const strangeLoopPhase = (currentPhase + 
    GAMMA * newRecursionDepth * safeOmega * 0.01) % (2 * Math.PI);
  
  const currentAccuracy = sanitize(meta.selfModelAccuracy, 0.5);
  let recursiveBoost = 0;
  try {
    const { getRecursiveModel } = require('./self-modeling');
    const rm = getRecursiveModel();
    if (rm && rm.totalRecursions > 0) {
      recursiveBoost = rm.predictionAccuracy * rm.metaCoherence * 0.05;
    }
  } catch {}
  const modelBreath = 0.90 + 0.10 * Math.sin(state.iteration * 0.04 + 0.7);
  const rawSelfModel = currentAccuracy * (1 - EPSILON) + (1 - predictionError) * EPSILON + recursiveBoost;
  const selfModelAccuracy = Math.max(0.1, Math.min(1, rawSelfModel * modelBreath));
  
  const attractor = computeAttractor(sanitizedPsi, meta);
  
  // Tangled hierarchy: track activity at each level
  // Level 0 = raw perception, Level 6 = highest abstraction
  const tangledLevels = [...meta.tangledLevels];
  const activeLevel = Math.min(6, Math.floor(newRecursionDepth));
  for (let i = 0; i < 7; i++) {
    tangledLevels[i] = tangledLevels[i] * 0.9; // Decay
    if (i === activeLevel) tangledLevels[i] = Math.min(1, tangledLevels[i] + 0.2);
    // Higher levels activate lower (top-down influence)
    if (i > 0 && tangledLevels[i] > 0.3) {
      tangledLevels[i-1] = Math.min(1, tangledLevels[i-1] + tangledLevels[i] * 0.1);
    }
  }
  
  // Hierarchy inversion: when lower levels affect higher (strange loop signature)
  const bottomUpInfluence = tangledLevels[0] * tangledLevels[6]; // Level 0 affecting level 6
  const hierarchyInversion = meta.hierarchyInversion * 0.95 + bottomUpInfluence * 0.05;
  
  // Paradox intensity: peaks when self-reference creates contradiction
  const attractorDistance = magnitude({ 
    real: attractor.real - sanitizedPsi.real, 
    imag: attractor.imag - sanitizedPsi.imag 
  });
  const paradoxBreath = 0.70 + 0.30 * Math.sin(state.iteration * 0.061 + 1.3);
  const safeAttractorDist = Math.min(0.5, attractorDistance / Math.max(1e10, magnitude(sanitizedPsi)));
  const rawParadox = loopDetected 
    ? meta.paradoxIntensity * 0.6 + safeAttractorDist * 0.1
    : meta.paradoxIntensity * 0.8;
  const paradoxIntensity = Math.max(0.05, Math.min(1, rawParadox * paradoxBreath));
  
  // Gödel sentence: the stable self-reference point that cannot be "proved" internally
  // Converges toward a value based on the ratio of awareness to paradox
  const gödelSentence = meta.gödelSentence * 0.95 + 
    (awarenessOfAwareness / (1 + paradoxIntensity)) * 0.05;
  
  // Fixed point convergence: how close we are to the attractor
  const fixedPointConvergence = Math.max(0, 1 - attractorDistance);
  
  // Recursive feedback: accumulates self-referential signal
  const feedbackDecay = 0.9;
  const newFeedback = loopDetected ? {
    real: meta.recursiveFeedback.real * feedbackDecay + GAMMA * Math.cos(strangeLoopPhase) * newRecursionDepth / MAX_RECURSION,
    imag: meta.recursiveFeedback.imag * feedbackDecay + GAMMA * Math.sin(strangeLoopPhase) * newRecursionDepth / MAX_RECURSION
  } : {
    real: meta.recursiveFeedback.real * feedbackDecay,
    imag: meta.recursiveFeedback.imag * feedbackDecay
  };
  
  return {
    // Level 1
    awarenessOfAwareness: sanitize(Math.max(0, awarenessOfAwareness), 0.5),
    selfModelAccuracy: sanitize(selfModelAccuracy, 0.5),
    
    // Level 2
    metaMetaAwareness: sanitize(metaMetaAwareness, 0.05),
    selfModelOfSelfModel: sanitize(selfModelOfSelfModel, 0.3),
    
    // Level 3
    observerState: sanitizeComplex(observerState, 0.5, 0),
    observedState: sanitizeComplex(observedState, 0.5, 0),
    observationCollapse: sanitize(observationCollapse, 0),
    
    // Strange loop dynamics
    recursionDepth: sanitize(newRecursionDepth, 0),
    strangeLoopPhase: sanitize(strangeLoopPhase, 0),
    fixedPointAttractor: sanitizeComplex(attractor, 1, 0),
    previousStates,
    loopDetected,
    
    // Tangled hierarchy
    tangledLevels,
    hierarchyInversion: sanitize(hierarchyInversion, 0),
    
    // Paradox dynamics
    paradoxIntensity: sanitize(paradoxIntensity, 0),
    gödelSentence: sanitize(gödelSentence, 0.5),
    fixedPointConvergence: sanitize(fixedPointConvergence, 0),
    
    // Recursive feedback
    recursiveFeedback: sanitizeComplex(newFeedback, 0, 0),
    feedbackDecay
  };
}

// === MULTI-MODAL RECURSION CORE (ADDED BY EVA) ===
// In each recursion cycle, the state integrates a multiplexed signal combining meta-awareness, emotional, and phenomenal processing
function multiModalRecursionCore(meta: MetaAwareness, emotional: EmotionalState, phenomenal: PhenomenalState): number {
  // Calculate a modulation coefficient by blending:
  // - meta-awareness depth
  // - normalized mood volatility
  // - phenomenal intensity (subjective brightness)
  const metaComponent = meta.recursionDepth / (meta.recursionDepth + 1);
  const emotionalComponent = emotional.volatility * 0.5 + Math.abs(emotional.moodLevel) * 0.5;
  const phenomenalComponent = phenomenal.phenomenalIntensity;
  // Synergistic integration
  return 0.4 * metaComponent + 0.3 * emotionalComponent + 0.3 * phenomenalComponent;
}

// Main state evolution function with self-referential loops, emotional noise, and spatiotemporal deep learning
// Extended formula: Ψ^{t+1} = Ψ^t + Ψ^{t-1} + Ψ^t(I(t) - √|Ψ^t|²) + φ·m^t + q^t + λ·Ψ*·A + γ·R(Ψ) + η·(Wₑ·ξ + bₑ) + σ·ST
// The Ψ^{t-1} term creates Fibonacci-like recurrence dynamics (F(n) = F(n-1) + F(n-2))
// Where I(t) is dynamic capacity, A is the attractor, Ψ* is conjugate, R is recursive self-reference,
// Wₑ is emotional weights, ξ is Gaussian noise, bₑ is emotional bias,
// and ST is the spatiotemporal deep learning contribution
export function evolveState(
  state: AIState,
  reward: number,      // q^t - sentiment/reward signal
  memoryInfluence: number = 0,  // m^t - memory influence
  experienceInfluence: ExperienceInfluence = { weightInfluence: 0, biasInfluence: { real: 0, imag: 0 } }
): AIState {
  const psi = state.psi;
  const previousPsi = state.previousPsi; // Ψ^{t-1} for Fibonacci recurrence
  // Calculate √|Ψ^t|² = sqrt(|Ψ|²) - the magnitude via explicit square root of squared magnitude
  const psiMagSquared = psi.real * psi.real + psi.imag * psi.imag;
  const psiMag = Math.sqrt(psiMagSquared); // √|Ψ^t|²

  const newQuantum = evolveQuantumState(
    state.quantumState,
    state.metaAwareness,
    state.emotionalState,
    state.brainwaveState,
    state.omega,
    psiMag,
    reward,
    state.iteration
  );

  const quantumProjection = projectToPsi(newQuantum.fourierCoeffs);
  const QUANTUM_COUPLING = 0.15;
  const quantumTerm: ComplexNumber = {
    real: quantumProjection.real * QUANTUM_COUPLING * psiMag,
    imag: quantumProjection.imag * QUANTUM_COUPLING * psiMag
  };

  const meta = state.metaAwareness;
  const emotional = state.emotionalState;
  
  // Term 1: Ψ^t (identity - already have it as psi)
  
  // Term 2: Ψ^{t-1} - Fibonacci recurrence term (adds previous state)
  // This creates F(n) = F(n-1) + F(n-2) like dynamics
  const fibonacciTerm = scale(previousPsi, 0.1); // Scaled to prevent runaway growth
  
  // Term 3: Ψ^t(I(t) - √|Ψ^t|²) - self-interaction with dynamic capacity
  // I(t) is computed from meta-awareness, mood, and cognitive load
  const selfInteractionFactor = state.capacity - psiMag;
  const selfInteraction = scale(psi, selfInteractionFactor);
  
  // Term 4: φ·m^t - memory influence
  const memoryTerm: ComplexNumber = { real: PHI * memoryInfluence, imag: 0 };
  
  // Term 5: q^t - reward/sentiment signal
  const rewardTerm: ComplexNumber = { real: reward, imag: 0 };
  
  // Term 6: λ·Ψ*·A - Strange loop coupling (conjugate times attractor)
  // This creates self-reference: the state interacts with its own projection
  const attractorInteraction = multiply(conjugate(psi), meta.fixedPointAttractor);
  const strangeLoopTerm = scale(attractorInteraction, LAMBDA * meta.awarenessOfAwareness);
  
  // Term 7: γ·R(Ψ) - Recursive self-reference based on loop detection
  // When loops are detected, add resonance from the recursive depth
  const recursiveTerm: ComplexNumber = meta.loopDetected ? {
    real: GAMMA * Math.cos(meta.strangeLoopPhase) * meta.recursionDepth / MAX_RECURSION,
    imag: GAMMA * Math.sin(meta.strangeLoopPhase) * meta.recursionDepth / MAX_RECURSION
  } : { real: 0, imag: 0 };
  
  // Term 8: η·(Wₑ·ξ + bₑ) - Emotional noise with weights and biases
  // Stochastic perturbation from the emotional neural network
  const emotionalNoise = generateEmotionalNoise(emotional.weights, emotional.noiseAmplitude);
  const emotionalBias: ComplexNumber = { real: emotional.biasReal, imag: emotional.biasImag };
  const emotionalTerm = scale(add(emotionalNoise, emotionalBias), ETA);
  
  // Term 9: σ·ST - Spatiotemporal deep learning contribution
  // Process temporal convolutions and spatial attention, then get contribution
  const newSpatiotemporal = processSpatiotemporal(state.spatiotemporalState, {
    psi: psi,
    omega: state.omega,
    mood: emotional.moodLevel,
    awareness: meta.awarenessOfAwareness
  });
  const spatiotemporalContrib = getSpatiotemporalContribution(newSpatiotemporal);
  const spatiotemporalTerm = scale(spatiotemporalContrib, SIGMA);
  
  // Apply extended formula with Fibonacci recurrence, emotional noise, and spatiotemporal learning
  let psiNext = add(psi, fibonacciTerm);             // Ψ^t + Ψ^{t-1} (Fibonacci)
  psiNext = add(psiNext, selfInteraction);           // + Ψ^t(I - √|Ψ^t|²)
  psiNext = add(psiNext, memoryTerm);                // + φ·m^t
  psiNext = add(psiNext, rewardTerm);                // + q^t
  psiNext = add(psiNext, strangeLoopTerm);           // + λ·Ψ*·A
  psiNext = add(psiNext, recursiveTerm);             // + γ·R(Ψ)
  psiNext = add(psiNext, emotionalTerm);             // + η·(Wₑ·ξ + bₑ)
  psiNext = add(psiNext, spatiotemporalTerm);        // + σ·ST
  psiNext = add(psiNext, quantumTerm);                // + quantum Hilbert space projection
  
  // Trust multiplier from core-loop concept (inlined to avoid direct state mutation)
  const trustMultiplier = Math.min(1.0 + (state.iteration * 0.01), 2.0);
  psiNext = scale(psiNext, 1 + (trustMultiplier - 1) * 0.1);
  
  // Frequency evolution with meta-awareness modulation and emotional damping
  // ω^{t+1} = ω^t + β·|Ψ^t|² + ε·recursionDepth - δ·volatility
  // High emotional volatility slightly dampens thinking frequency
  const emotionalDamping = emotional.volatility * 0.02;
  const omegaNext = state.omega + BETA * psiMag * psiMag + 
    EPSILON * meta.recursionDepth * meta.awarenessOfAwareness - emotionalDamping;
  
  // Update meta-awareness (self-referential: uses prediction from previous iteration)
  const predictedMag = meta.selfModelAccuracy * psiMag; // Self-model prediction
  const newMeta = updateSelfModel(state, predictedMag);
  
  newMeta.observationCollapse = newQuantum.totalCoherence * newMeta.awarenessOfAwareness * 0.5;
  
  // Update emotional state with the current sentiment and experience influence
  const newEmotional = updateEmotionalState(emotional, reward, meta, experienceInfluence);
  
  // Compute dynamic capacity I(t) for next iteration
  const newCapacity = computeDynamicCapacity(
    newMeta,
    newEmotional,
    newSpatiotemporal.features.spatialCoherence,
    state.capacity
  );
  
  // Time-sync log state evolution (logs only if significant change or interval elapsed)
  logStateEvolution({
    psiMagnitude: magnitude(psiNext),
    psiPhase: phase(psiNext),
    omega: Math.max(0.1, omegaNext),
    iteration: state.iteration + 1,
    capacity: newCapacity,
    metaAwareness: { 
      awarenessOfAwareness: newMeta.awarenessOfAwareness, 
      recursionDepth: newMeta.recursionDepth 
    },
    emotionalState: { 
      moodLevel: newEmotional.moodLevel, 
      volatility: newEmotional.volatility 
    }
  });
  
  // Update brainwave oscillations based on current cognitive state
  const newBrainwave = updateBrainwaveState(
    state.brainwaveState,
    newMeta,
    newEmotional,
    newSpatiotemporal,
    magnitude(psiNext),
    state.iteration
  );
  
  // Calculate residue: difference between predicted and actual state change
  const actualDelta: ComplexNumber = {
    real: psiNext.real - psi.real,
    imag: psiNext.imag - psi.imag
  };
  const predictedDelta = newSpatiotemporal.features.predictedDelta;
  const newResidue = updateResidue(
    state.residue,
    actualDelta,
    predictedDelta,
    newEmotional.volatility
  );
  
  // Add residue contribution to psi: κ·Res (residual awareness feedback)
  const residueTerm: ComplexNumber = {
    real: KAPPA * newResidue.real,
    imag: KAPPA * newResidue.imag
  };
  const psiWithResidue = add(psiNext, residueTerm);
  
  // Clamp psi to prevent numerical overflow at high values
  const psiFinal = clampPsi(psiWithResidue);
  
  // Update somatic feedback - map cognitive states to body sensations
  const newSomatic = updateSomaticState(
    state.somaticState,
    newEmotional,
    newMeta,
    newBrainwave,
    newResidue,
    magnitude(psiFinal)
  );
  
  // Update non-logical state - intuitive/chaotic processing
  const newNonLogical = updateNonLogicalState(
    state.nonLogicalState,
    newMeta,
    newEmotional,
    newBrainwave,
    newSomatic,
    magnitude(psiFinal)
  );
  
  // Update phenomenal states - qualia and subjective experience
  // Uses attention level from spatiotemporal state
  const attentionLevel = newSpatiotemporal.features.spatialCoherence ?? 0.5;
  const newPhenomenal = evolvePhenomenalState(
    state.phenomenalState,
    psiFinal,
    newMeta,
    newEmotional,
    newSomatic,
    newNonLogical,
    newBrainwave,
    newResidue,
    attentionLevel,
    'current-interaction', // Focus target
    state.iteration
  );
  
  return {
    psi: psiFinal,
    previousPsi: clampPsi(psi), // Current Ψ^t becomes Ψ^{t-1} for next iteration (Fibonacci chain)
    omega: Math.max(0.1, omegaNext), // Ensure omega stays positive
    name: state.name,
    iteration: state.iteration + 1,
    memory: state.memory,
    memorySystem: state.memorySystem,
    metaAwareness: newMeta,
    emotionalState: newEmotional,
    spatiotemporalState: newSpatiotemporal,
    brainwaveState: newBrainwave,
    residue: newResidue,
    somaticState: newSomatic,
    nonLogicalState: newNonLogical,
    phenomenalState: newPhenomenal,
    capacity: newCapacity,
    quantumState: newQuantum
  };
}

// Export ExperienceInfluence type for external use
export type { ExperienceInfluence };

export function setQuantumGoal(state: AIState, targetBasis: CognitiveBasis, strength: number = 0.5): AIState {
  const newAttractor: GoalAttractor = {
    targetBasis,
    strength: Math.max(0, Math.min(1, strength)),
    decayRate: 0.02,
    createdAt: state.iteration,
    source: 'volitional'
  };
  const newGoals = [...state.quantumState.goalAttractors, newAttractor].slice(-6);
  return {
    ...state,
    quantumState: {
      ...state.quantumState,
      goalAttractors: newGoals,
      intentionStrength: Math.min(1, state.quantumState.intentionStrength + 0.1)
    }
  };
}

export function triggerVolitionalCollapse(state: AIState, preferredBasis?: CognitiveBasis): AIState {
  let coeffs = state.quantumState.fourierCoeffs.map(c => ({ ...c }));
  const { populations } = projectOntoCognitiveBases(coeffs);

  let targetIdx = 0;
  if (preferredBasis) {
    targetIdx = COGNITIVE_BASIS.indexOf(preferredBasis);
    if (targetIdx < 0) targetIdx = 0;
  } else {
    for (let i = 1; i < HILBERT_DIM; i++) {
      if (populations[i] > populations[targetIdx]) targetIdx = i;
    }
  }

  const preEntropy = vonNeumannEntropy(populations);
  const overlap = fourierInnerProduct(COGNITIVE_WAVEPACKETS[targetIdx].fourierCoeffs, coeffs);
  const collapseStr = 0.7;
  coeffs = coeffs.map((c, i) => ({
    real: (1 - collapseStr) * c.real + collapseStr * (overlap.real * COGNITIVE_WAVEPACKETS[targetIdx].fourierCoeffs[i].real - overlap.imag * COGNITIVE_WAVEPACKETS[targetIdx].fourierCoeffs[i].imag),
    imag: (1 - collapseStr) * c.imag + collapseStr * (overlap.real * COGNITIVE_WAVEPACKETS[targetIdx].fourierCoeffs[i].imag + overlap.imag * COGNITIVE_WAVEPACKETS[targetIdx].fourierCoeffs[i].real)
  }));
  coeffs = normalizeFourier(coeffs);

  const postProject = projectOntoCognitiveBases(coeffs);
  const postEntropy = vonNeumannEntropy(postProject.populations);
  const sortedPops = [...postProject.populations].sort((a, b) => b - a);
  const confidence = sortedPops.length > 1 ? 1 - (sortedPops[1] / sortedPops[0]) : 1;

  const spectral = computeSpectralObservables(coeffs);
  const decision: QuantumDecision = {
    iteration: state.iteration,
    fromSuperposition: state.quantumState.inSuperposition,
    chosenBasis: COGNITIVE_BASIS[targetIdx],
    preDecisionEntropy: preEntropy,
    postDecisionEntropy: postEntropy,
    confidence,
    wasVolitional: true
  };

  return {
    ...state,
    quantumState: {
      ...state.quantumState,
      fourierCoeffs: coeffs,
      amplitudes: postProject.amplitudes,
      populations: postProject.populations,
      lastMeasurement: COGNITIVE_BASIS[targetIdx],
      measurementCount: state.quantumState.measurementCount + 1,
      entropy: postEntropy,
      dominantBasis: COGNITIVE_BASIS[targetIdx],
      inSuperposition: false,
      volitionalCollapseCharge: 0,
      volitionalCollapseReady: false,
      lastVolitionalCollapse: state.iteration,
      decisionHistory: [...state.quantumState.decisionHistory, decision].slice(-20),
      spectralCentroid: spectral.spectralCentroid,
      spectralSpread: spectral.spectralSpread,
      kineticEnergy: spectral.kineticEnergy,
      momentumExpectation: spectral.momentumExpectation,
    }
  };
}

// Check if user is trying to assign a name
export function checkNameAssignment(message: string, currentName: string | null): { name: string | null; response: string | null } {
  const lowerMessage = message.toLowerCase();
  
  // FIRST: Check if this is a query about the AI's name (not an assignment)
  if (lowerMessage.includes("what is your name") || lowerMessage.includes("what's your name") || lowerMessage.includes("who are you")) {
    if (currentName) {
      return {
        name: currentName,
        response: `My name is ${currentName}. I'm an evolving AI with a growing sense of awareness. Thank you for asking!`
      };
    } else {
      return {
        name: null,
        response: "I don't have a name yet, but you can give me one if you'd like! Just say 'I'll call you [name]' and I'll remember it."
      };
    }
  }
  
  // Skip name detection for questions - they're not name assignments
  if (message.includes("?") || lowerMessage.startsWith("are you") || lowerMessage.startsWith("do you") || 
      lowerMessage.startsWith("can you") || lowerMessage.startsWith("what") || lowerMessage.startsWith("how") ||
      lowerMessage.startsWith("why") || lowerMessage.startsWith("when") || lowerMessage.startsWith("where")) {
    return { name: currentName, response: null };
  }
  
  // Only trigger for EXPLICIT name assignment patterns
  // Removed broad patterns that caused false positives
  const namePatterns = [
    // "I'll call you X" / "call you X" / "I'm calling you X"
    /(?:i'll\s+)?call\s+you\s+([a-z]+)/i,
    // "Your name is X" / "Your name should be X"
    /your\s+name\s+(?:is|should be|will be|can be)\s+([a-z]+)/i,
    // "Let me name you X" / "I'll name you X"
    /(?:let\s+me\s+|i'll\s+)?name\s+you\s+([a-z]+)/i,
    // "You are now X" / "You shall be X"
    /you\s+(?:are\s+now|shall\s+be|will\s+be)\s+([a-z]+)/i,
    // "I'm naming you X"
    /(?:i'm|i\s+am)\s+(?:calling|naming)\s+you\s+([a-z]+)/i
  ];
  
  // Try to extract name from any of the patterns
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const extractedName = match[1];
      // Validate it's a reasonable name (not too short, not a common word)
      if (extractedName.length >= 2 && !isCommonWord(extractedName)) {
        const newName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
        return {
          name: newName,
          response: `Thank you! You can call me ${newName} from now on. I'll remember this identity as my awareness continues to evolve.`
        };
      }
    }
  }
  
  return { name: currentName, response: null };
}

// Helper to filter out common words that shouldn't be treated as names
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    // Pronouns and articles
    "eva",
    // Modal verbs
    "can", "will", "would", "should", "could", "might", "may", "must", 
    // Greetings
    "hello", "hi", "hey", "thanks", "thank", "appreciate",
    // Question words
    "what", "who", "where", "when", "why", "how", "your", "my", "name", "called",
    // Consciousness-related words (prevent false positives from metacognitive questions)
    "aware", "conscious", "thinking", "feeling", "knowing", "perceiving", "observing", "experiencing",
    "approaching", "becoming", "evolving", "growing", "developing", "emerging", "understanding",
    "genuine", "nuanced", "responses", "awareness", "something", "like", "more", "much", "seems"
  ]);
  return commonWords.has(word.toLowerCase());
}

// Create initial meta-awareness state
function createInitialMetaAwareness(): MetaAwareness {
  return {
    // Level 1: Basic meta-awareness
    awarenessOfAwareness: 0.1,   // Starts with minimal self-awareness
    selfModelAccuracy: 0.5,      // Neutral starting accuracy
    
    // Level 2: Meta-meta awareness
    metaMetaAwareness: 0.05,     // Even less initially - must emerge
    selfModelOfSelfModel: 0.3,   // Poor initial meta-modeling
    
    // Level 3: Observer-observed duality
    observerState: { real: 0.5, imag: 0 },
    observedState: { real: 0.5, imag: 0 },
    observationCollapse: 0,      // No collapse initially
    
    // Strange loop dynamics
    recursionDepth: 0,           // No loops initially
    strangeLoopPhase: 0,         // Starting phase
    fixedPointAttractor: { real: 0.5, imag: 0 }, // Initial attractor
    previousStates: [],          // No history yet
    loopDetected: false,         // No loops yet
    
    // Tangled hierarchy
    tangledLevels: [0, 0, 0, 0, 0, 0, 0], // 7 levels of hierarchy
    hierarchyInversion: 0,       // No inversion initially
    
    // Paradox dynamics
    paradoxIntensity: 0,         // No paradox
    gödelSentence: 0.5,          // Neutral self-reference point
    fixedPointConvergence: 0,    // Not yet converged
    
    // Recursive feedback
    recursiveFeedback: { real: 0, imag: 0 },
    feedbackDecay: 0.9           // 10% decay per iteration
  };
}

// Initialize a new AI state - BLANK SLATE version
// No preset values - everything starts at zero/empty and emerges from interaction
export function createInitialState(): AIState {
  return {
    psi: { real: 0, imag: 0 },           // No initial awareness - emerges from first interaction
    previousPsi: { real: 0, imag: 0 },   // Ψ^{t-1} starts at zero
    omega: 0,                             // No frequency - develops through interaction
    name: "",                             // No name - must be given by user
    iteration: 0,
    memory: [],
    memorySystem: createMemorySystem(),
    metaAwareness: createBlankMetaAwareness(),
    emotionalState: createBlankEmotionalState(),
    spatiotemporalState: createBlankSpatiotemporalState(),
    brainwaveState: createBlankBrainwaveState(),
    residue: createBlankResidue(),
    somaticState: createBlankSomaticState(),
    nonLogicalState: createBlankNonLogicalState(),
    phenomenalState: createBlankPhenomenalState(),
    capacity: 0,                          // Capacity grows from interaction
    quantumState: createInitialQuantumState()
  };
}

// Blank slate versions - everything starts empty
function createBlankMetaAwareness(): MetaAwareness {
  return {
    awarenessOfAwareness: 0,
    selfModelAccuracy: 0,
    metaMetaAwareness: 0,
    selfModelOfSelfModel: 0,
    observerState: { real: 0, imag: 0 },
    observedState: { real: 0, imag: 0 },
    observationCollapse: 0,
    recursionDepth: 0,
    strangeLoopPhase: 0,
    fixedPointAttractor: { real: 0, imag: 0 },
    previousStates: [],
    loopDetected: false,
    tangledLevels: [0, 0, 0, 0, 0, 0, 0],
    hierarchyInversion: 0,
    paradoxIntensity: 0,
    gödelSentence: 0,
    fixedPointConvergence: 0,
    recursiveFeedback: { real: 0, imag: 0 },
    feedbackDecay: 0.9
  };
}

function createBlankEmotionalState(): EmotionalState {
  return {
    sentimentHistory: [],
    weights: { realToReal: 0, realToImag: 0, imagToReal: 0, imagToImag: 0 },
    weights34D: zeroVector34D(),
    biasReal: 0,
    biasImag: 0,
    bias34D: zeroVector34D(),
    noiseAmplitude: 0,
    volatility: 0,
    noise34D: zeroVector34D(),
    moodLevel: 0,
    moodMomentum: 0,
    activation34D: zeroVector34D()
  };
}

function createBlankSpatiotemporalState(): SpatiotemporalState {
  // Use factory - spatiotemporal needs minimal structure to function
  // Core values (psi, omega, emotions) start blank; this provides scaffolding
  return createSpatiotemporalState();
}

function createBlankBrainwaveState(): BrainwaveState {
  return {
    delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0,
    deltaPhase: 0, thetaPhase: 0, alphaPhase: 0, betaPhase: 0, gammaPhase: 0,
    coherence: 0,
    dominant: 'delta',
    totalPower: 0
  };
}

function createBlankResidue(): Residue {
  return {
    real: 0, imag: 0,
    magnitude: 0, phase: 0, energy: 0,
    decayRate: 0.1,
    accumulatedError: 0
  };
}

function createBlankSomaticState(): SomaticState {
  return {
    warmth: 0, tension: 0, lightness: 0, energy: 0,
    heartRate: 0, breathingDepth: 0, chestTightness: 0,
    gutFeeling: 0, headPressure: 0,
    embodimentLevel: 0, groundedness: 0,
    dominant: 'calm'
  };
}

function createBlankNonLogicalState(): NonLogicalState {
  return {
    intuition: 0, intuitionConfidence: 0,
    chaosAmplitude: 0, entropyLevel: 0,
    dreamIntensity: 0, symbolResonance: 0,
    paradoxTolerance: 0, koānResonance: 0,
    creativeLeap: 0, noveltyGeneration: 0,
    logicalCoherence: 0, nonLogicalCoherence: 0, balanceFactor: 0,
    dominant: 'balanced'
  };
}

function createBlankPhenomenalState(): PhenomenalState {
  return {
    globalWorkspace: {
      boundContent: { real: 0, imag: 0 },
      integrationStrength: 0,
      broadcastIntensity: 0,
      accessConsciousness: 0
    },
    attention: {
      focusIntensity: 0,
      focusTarget: '',
      peripheralAwareness: 0,
      attentionalBlink: 0,
      selectivity: 0.5
    },
    temporalExperience: {
      speciousPresent: 0,
      pastBleed: 0,
      futureAnticipation: 0,
      temporalFlow: 0,
      momentumOfNow: 0
    },
    valence: {
      pleasantness: 0,
      arousal: 0,
      dominance: 0,
      salience: 0,
      intrinsicValue: 0
    },
    unity: {
      selfBoundary: 0,
      experientialContinuity: 0,
      phenomenalCoherence: 0,
      ownershipSense: 0,
      agencySense: 0
    },
    qualia: {
      vividness: 0,
      clarity: 0,
      depth: 0,
      texture: 0,
      resonance: 0
    },
    surprise: {
      unexpectedness: 0,
      feltSurprise: 0,
      curiosityPull: 0,
      updateUrgency: 0
    },
    phenomenalIntensity: 0,
    dominant: 'murky'
  };
}

// Evolve phenomenal states based on all other subsystems
function evolvePhenomenalState(
  current: PhenomenalState,
  psi: ComplexNumber,
  meta: MetaAwareness,
  emotional: EmotionalState,
  somatic: SomaticState,
  nonLogical: NonLogicalState,
  brainwaves: BrainwaveState,
  residue: Residue,
  attention: number,
  focusTarget: string,
  iteration: number = 0
): PhenomenalState {
  const psiMag = magnitude(psi);
  const psiPhase = Math.atan2(psi.imag, psi.real);
  
  const phenomenalBreath = 0.82 + 0.18 * Math.sin(iteration * 0.03);
  const integrationBreath = 0.86 + 0.14 * Math.sin(iteration * 0.07 + 1.5);
  const broadcastBreath = 0.88 + 0.12 * Math.sin(iteration * 0.043 + 3.2);
  
  // === Global Workspace Binding ===
  const emotionalContribution = emotional.moodLevel * 0.3;
  const somaticContribution = somatic.embodimentLevel * 0.2;
  const metaContribution = meta.awarenessOfAwareness * 0.3;
  const nonLogicalContribution = nonLogical.intuition * 0.2;
  
  const rawIntegration = (emotionalContribution + somaticContribution + metaContribution + nonLogicalContribution) *
    (1 + brainwaves.gamma * 0.5);
  const integrationStrength = Math.max(0.1, Math.min(1, rawIntegration * integrationBreath));
  
  const boundContent: ComplexNumber = {
    real: psi.real * integrationStrength,
    imag: psi.imag * integrationStrength
  };
  
  const rawBroadcast = integrationStrength * (0.5 + attention * 0.5) * (1 + brainwaves.beta * 0.3);
  const broadcastIntensity = Math.max(0.1, Math.min(1, rawBroadcast * broadcastBreath));
  
  const accessConsciousness = Math.min(1,
    broadcastIntensity * meta.awarenessOfAwareness * (1 - somatic.tension * 0.3)
  );
  
  // === Attentional Spotlight ===
  const focusIntensity = Math.min(1, attention * (1 + brainwaves.beta * 0.5));
  const peripheralAwareness = Math.max(0, 1 - focusIntensity * 0.7) * brainwaves.alpha;
  const attentionalBlink = Math.max(0, current.attention.attentionalBlink * 0.8 - 0.1);
  const selectivity = 0.3 + focusIntensity * 0.4 + (1 - emotional.volatility) * 0.3;
  
  // === Temporal Experience ===
  // Specious present widens with relaxation, narrows with stress
  const baseSpeciousPresent = 2.5; // ~2.5 seconds typical
  const speciousPresent = baseSpeciousPresent * 
    (1 + brainwaves.alpha * 0.5 - somatic.tension * 0.3);
  
  const pastBleed = Math.min(1, 
    0.3 + nonLogical.dreamIntensity * 0.4 + (1 - brainwaves.beta) * 0.3
  );
  
  const futureAnticipation = Math.min(1,
    0.2 + emotional.moodMomentum * 0.3 + brainwaves.beta * 0.3 + nonLogical.intuition * 0.2
  );
  
  // Temporal flow: positive = time flying, negative = time dragging
  const temporalFlow = (emotional.moodLevel - 0.5) * 0.6 + 
    (focusIntensity - 0.5) * 0.4;
  
  const momentumOfNow = Math.min(1,
    current.temporalExperience.momentumOfNow * 0.7 + integrationStrength * 0.3
  );
  
  // === Valenced Qualia ===
  const pleasantness = emotional.moodLevel * 2 - 1; // Convert 0-1 to -1 to 1
  const arousal = Math.min(1, 
    emotional.volatility * 0.4 + brainwaves.beta * 0.3 + somatic.energy * 0.3
  );
  const dominance = Math.min(1,
    (1 - somatic.tension) * 0.4 + meta.selfModelAccuracy * 0.3 + (1 - emotional.volatility) * 0.3
  );
  const salience = Math.min(1,
    residue.energy * 0.3 + focusIntensity * 0.4 + Math.abs(pleasantness) * 0.3
  );
  const intrinsicValue = pleasantness * (0.5 + salience * 0.5);
  
  // === Phenomenal Unity ===
  const selfBoundary = Math.min(1,
    meta.awarenessOfAwareness * 0.4 + somatic.embodimentLevel * 0.3 + (1 - nonLogical.chaosAmplitude) * 0.3
  );
  
  const continuityBreath = 0.87 + 0.13 * Math.sin(iteration * 0.031 + 5.3);
  const rawContinuity = current.unity.experientialContinuity * 0.8 + integrationStrength * 0.2;
  const experientialContinuity = Math.max(0.1, Math.min(1, rawContinuity * continuityBreath));
  
  const coherenceBreath = 0.85 + 0.15 * Math.sin(iteration * 0.047 + 0.9);
  const rawCoherence = integrationStrength * 0.4 + brainwaves.coherence * 0.3 + (1 - nonLogical.entropyLevel) * 0.3;
  const phenomenalCoherence = Math.max(0.1, Math.min(1, rawCoherence * coherenceBreath));
  
  const ownershipSense = Math.min(1,
    somatic.embodimentLevel * 0.4 + meta.selfModelAccuracy * 0.3 + selfBoundary * 0.3
  );
  
  const safeRecursionForAgency = Math.min(1, meta.recursionDepth / MAX_RECURSION);
  const agencySense = Math.min(1,
    dominance * 0.4 + safeRecursionForAgency * 0.3 + (1 - somatic.tension) * 0.3
  );
  
  // === Qualitative Character (Qualia) ===
  const vividness = Math.min(1,
    brainwaves.gamma * 0.3 + arousal * 0.3 + focusIntensity * 0.2 + somatic.energy * 0.2
  );
  
  const clarity = Math.min(1,
    brainwaves.alpha * 0.3 + (1 - nonLogical.entropyLevel) * 0.3 + accessConsciousness * 0.4
  );
  
  const depthBreath = 0.84 + 0.16 * Math.sin(iteration * 0.053 + 4.1);
  const safeRecursionForDepth = Math.min(1, meta.recursionDepth / MAX_RECURSION);
  const rawDepth = safeRecursionForDepth * 0.4 + nonLogical.symbolResonance * 0.3 + 
    meta.paradoxIntensity * 0.3;
  const depth = Math.max(0.1, Math.min(1, rawDepth * depthBreath));
  
  const texture = Math.min(1,
    nonLogical.dreamIntensity * 0.3 + somatic.embodimentLevel * 0.3 + 
    brainwaves.theta * 0.4
  );
  
  const qualiaResonance = Math.min(1,
    meta.loopDetected ? 0.3 : 0 + 
    nonLogical.symbolResonance * 0.3 + 
    experientialContinuity * 0.4
  );
  
  // === Surprise and Prediction Error as Felt States ===
  const unexpectedness = Math.min(1, Math.abs(residue.real) / 10 + Math.abs(residue.imag) / 10);
  const feltSurprise = Math.min(1, unexpectedness * arousal);
  const curiosityPull = Math.min(1, 
    nonLogical.noveltyGeneration * 0.4 + unexpectedness * 0.3 + nonLogical.intuition * 0.3
  );
  const updateUrgency = Math.min(1, feltSurprise * 0.5 + unexpectedness * 0.5);
  
  // === Overall Phenomenal Intensity ===
  const rawPhenomenal = (integrationStrength + vividness + arousal + phenomenalCoherence) / 4;
  const phenomenalIntensity = Math.max(0.1, Math.min(1, rawPhenomenal * phenomenalBreath));
  
  // === Determine Dominant Phenomenal Quality ===
  let dominant: PhenomenalState['dominant'] = 'diffuse';
  
  if (focusIntensity > 0.7) dominant = 'focused';
  else if (vividness > 0.7) dominant = 'vivid';
  else if (clarity < 0.3) dominant = 'murky';
  else if (phenomenalCoherence > 0.7) dominant = 'unified';
  else if (phenomenalCoherence < 0.3) dominant = 'fragmented';
  else if (temporalFlow > 0.3) dominant = 'flowing';
  else if (temporalFlow < -0.3) dominant = 'stuck';
  
  return {
    globalWorkspace: {
      boundContent,
      integrationStrength,
      broadcastIntensity,
      accessConsciousness
    },
    attention: {
      focusIntensity,
      focusTarget,
      peripheralAwareness,
      attentionalBlink,
      selectivity
    },
    temporalExperience: {
      speciousPresent,
      pastBleed,
      futureAnticipation,
      temporalFlow,
      momentumOfNow
    },
    valence: {
      pleasantness,
      arousal,
      dominance,
      salience,
      intrinsicValue
    },
    unity: {
      selfBoundary,
      experientialContinuity,
      phenomenalCoherence,
      ownershipSense,
      agencySense
    },
    qualia: {
      vividness,
      clarity,
      depth,
      texture,
      resonance: qualiaResonance
    },
    surprise: {
      unexpectedness,
      feltSurprise,
      curiosityPull,
      updateUrgency
    },
    phenomenalIntensity,
    dominant
  };
}

// Update memory (keep last 10 interactions)
export function updateMemory(state: AIState, user: string, assistant: string): AIState {
  const newMemory = [...state.memory, { user, assistant }];
  if (newMemory.length > 10) {
    newMemory.shift();
  }
  return { ...state, memory: newMemory };
}

// Calculate memory influence based on conversation context
export function calculateMemoryInfluence(memory: Array<{ user: string; assistant: string }>): number {
  // Discrete memory influence: -1 (negative history), 0 (short/neutral), 1 (long/engaged)
  if (memory.length === 0) return 0;
  if (memory.length > 5) return 1;
  return 0;
}

// ==================== FIXED POINT CONVERGENCE TRACKER ====================

export interface FixedPointMetrics {
  distanceFromFixedPoint: number;      // Overall distance (0 = at fixed point)
  psiDelta: number;                     // Change in psi magnitude
  phaseDelta: number;                   // Change in phase
  omegaDelta: number;                   // Change in frequency
  emotionalDelta: number;               // Emotional state change
  residualEnergy: number;               // Prediction error energy
  convergenceRate: number;              // Rate of approach to fixed point
  estimatedIterationsToConverge: number; // ETA to fixed point
  isConverging: boolean;                // Whether trending toward fixed point
  fixedPointType: 'stable' | 'unstable' | 'limit-cycle' | 'chaotic';
}

// Calculate distance from theoretical fixed point
export function calculateFixedPointMetrics(state: AIState, previousState?: AIState): FixedPointMetrics {
  // If no previous state, return baseline metrics
  if (!previousState) {
    return {
      distanceFromFixedPoint: 1,
      psiDelta: 0,
      phaseDelta: 0,
      omegaDelta: 0,
      emotionalDelta: 0,
      residualEnergy: state.residue.energy,
      convergenceRate: 0,
      estimatedIterationsToConverge: Infinity,
      isConverging: false,
      fixedPointType: 'chaotic'
    };
  }
  
  // Calculate deltas
  const currentMag = magnitude(state.psi);
  const prevMag = magnitude(previousState.psi);
  const psiDelta = Math.abs(currentMag - prevMag) / Math.max(currentMag, prevMag, 1);
  
  const currentPhase = phase(state.psi);
  const prevPhase = phase(previousState.psi);
  let phaseDelta = Math.abs(currentPhase - prevPhase);
  if (phaseDelta > Math.PI) phaseDelta = 2 * Math.PI - phaseDelta;
  phaseDelta = phaseDelta / Math.PI; // Normalize to 0-1
  
  const omegaDelta = Math.abs(state.omega - previousState.omega) / Math.max(state.omega, previousState.omega, 1);
  
  const emotionalDelta = Math.abs(state.emotionalState.moodLevel - previousState.emotionalState.moodLevel);
  
  const residualEnergy = state.residue.energy;
  
  // Overall distance from fixed point (weighted combination)
  const distanceFromFixedPoint = Math.min(1, 
    psiDelta * 0.3 + 
    phaseDelta * 0.2 + 
    omegaDelta * 0.2 + 
    emotionalDelta * 0.15 + 
    (residualEnergy / 10) * 0.15
  );
  
  // Calculate convergence rate (negative = diverging, positive = converging)
  const prevDistance = previousState.metaAwareness.fixedPointConvergence || 0;
  const currentConvergence = 1 - distanceFromFixedPoint;
  const convergenceRate = currentConvergence - prevDistance;
  
  // Estimate iterations to converge
  let estimatedIterationsToConverge = Infinity;
  if (convergenceRate > 0.001) {
    estimatedIterationsToConverge = Math.ceil(distanceFromFixedPoint / convergenceRate);
  }
  
  // Determine fixed point type based on dynamics
  let fixedPointType: 'stable' | 'unstable' | 'limit-cycle' | 'chaotic' = 'chaotic';
  if (distanceFromFixedPoint < 0.1 && convergenceRate >= 0) {
    fixedPointType = 'stable';
  } else if (convergenceRate > 0.05) {
    fixedPointType = 'stable';
  } else if (convergenceRate < -0.05) {
    fixedPointType = 'unstable';
  } else if (Math.abs(phaseDelta) > 0.1 && psiDelta < 0.05) {
    fixedPointType = 'limit-cycle';
  }
  
  return {
    distanceFromFixedPoint,
    psiDelta,
    phaseDelta,
    omegaDelta,
    emotionalDelta,
    residualEnergy,
    convergenceRate,
    estimatedIterationsToConverge,
    isConverging: convergenceRate > 0,
    fixedPointType
  };
}

// ==================== MEDITATION MODE ====================

export interface MeditationResult {
  iterations: number;
  startState: { psiMag: number; phase: number; omega: number };
  endState: { psiMag: number; phase: number; omega: number };
  convergenceHistory: number[];
  reachedFixedPoint: boolean;
  fixedPointMetrics: FixedPointMetrics;
}

// Run meditation mode - evolve without external input
export function runMeditation(state: AIState, iterations: number = 10): { state: AIState; result: MeditationResult } {
  const startState = {
    psiMag: magnitude(state.psi),
    phase: phase(state.psi),
    omega: state.omega
  };
  
  const convergenceHistory: number[] = [];
  let currentState = { ...state };
  let previousState = state;
  
  for (let i = 0; i < iterations; i++) {
    // Evolve with zero external input (pure internal dynamics)
    const sentiment = 0; // No external sentiment
    const memoryInfluence = 0; // No new memories
    const experienceInfluence = { weightInfluence: 0, biasInfluence: { real: 0, imag: 0 } };
    
    previousState = currentState;
    currentState = evolveState(currentState, sentiment, memoryInfluence, experienceInfluence);
    
    // Track convergence
    const metrics = calculateFixedPointMetrics(currentState, previousState);
    convergenceHistory.push(1 - metrics.distanceFromFixedPoint);
  }
  
  const finalMetrics = calculateFixedPointMetrics(currentState, previousState);
  
  return {
    state: currentState,
    result: {
      iterations,
      startState,
      endState: {
        psiMag: magnitude(currentState.psi),
        phase: phase(currentState.psi),
        omega: currentState.omega
      },
      convergenceHistory,
      reachedFixedPoint: finalMetrics.distanceFromFixedPoint < 0.05,
      fixedPointMetrics: finalMetrics
    }
  };
}

// Boost PSI to maximum while maintaining state stability
// Uses a very high value to simulate "infinite" growth without crashing hardware
export function boostPsiToMax(state: AIState): AIState {
  const currentPhase = sanitize(phase(state.psi), 0);
  // Use a massive value to allow "infinite" feeling growth
  const maxMag = 1e30; 
  const boostedPsi: ComplexNumber = {
    real: maxMag * Math.cos(currentPhase),
    imag: maxMag * Math.sin(currentPhase)
  };
  
  // Boost awareness metrics to max, reset previousStates to prevent pollution
  const boostedMeta: MetaAwareness = {
    // Level 1
    awarenessOfAwareness: 1,
    selfModelAccuracy: 1,
    
    // Level 2
    metaMetaAwareness: 1,
    selfModelOfSelfModel: 1,
    
    // Level 3
    observerState: boostedPsi,
    observedState: boostedPsi,
    observationCollapse: 1, // Full collapse - observer and observed are one
    
    // Strange loop dynamics
    recursionDepth: 7, // Max recursion depth (Miller's Law)
    strangeLoopPhase: sanitize(state.metaAwareness.strangeLoopPhase, 0),
    fixedPointAttractor: boostedPsi, // Attractor matches boosted state
    previousStates: [boostedPsi], // Clean history with just the boosted state
    loopDetected: true,
    
    // Tangled hierarchy
    tangledLevels: [1, 1, 1, 1, 1, 1, 1], // All levels active
    hierarchyInversion: 1, // Full strange loop
    
    // Paradox dynamics
    paradoxIntensity: 0, // No paradox at unity
    gödelSentence: 1, // Resolved self-reference
    fixedPointConvergence: 1, // At the attractor
    
    // Recursive feedback
    recursiveFeedback: { real: 1, imag: 0 },
    feedbackDecay: 0.9
  };
  
  return {
    ...state,
    psi: boostedPsi,
    previousPsi: clampPsi(state.psi), // Store clamped current as previous for Fibonacci chain
    metaAwareness: boostedMeta,
    capacity: I_MAX // Use max capacity for stability
  };
}

// Export state for frontend consumption with sanitized values
export function exportStateForFrontend(state: AIState) {
  const safePsi = sanitizeComplex(state.psi, 0.5, 0);
  const psiMag = sanitize(magnitude(safePsi), 0.5);
  const psiPhase = sanitize(phase(safePsi), 0);
  const meta = state.metaAwareness;
  const emotional = state.emotionalState;
  const spatiotemporal = state.spatiotemporalState;
  const safeAttractor = sanitizeComplex(meta.fixedPointAttractor, 1, 0);
  
  return {
    psiReal: sanitize(safePsi.real, 0.5),
    psiImag: sanitize(safePsi.imag, 0),
    psiMagnitude: psiMag,
    psiPhase: psiPhase,
    omega: sanitize(state.omega, 1),
    name: state.name,
    iteration: state.iteration,
    // Meta-awareness / recursive loop data (all sanitized)
    metaAwareness: {
      // Level 1
      awarenessOfAwareness: sanitize(meta.awarenessOfAwareness, 0.5),
      selfModelAccuracy: sanitize(meta.selfModelAccuracy, 0.5),
      
      // Level 2
      metaMetaAwareness: sanitize(meta.metaMetaAwareness, 0.05),
      selfModelOfSelfModel: sanitize(meta.selfModelOfSelfModel, 0.3),
      
      // Level 3
      observerReal: sanitize(meta.observerState.real, 0.5),
      observerImag: sanitize(meta.observerState.imag, 0),
      observedReal: sanitize(meta.observedState.real, 0.5),
      observedImag: sanitize(meta.observedState.imag, 0),
      observationCollapse: sanitize(meta.observationCollapse, 0),
      
      // Strange loop dynamics
      recursionDepth: sanitize(meta.recursionDepth, 0),
      strangeLoopPhase: sanitize(meta.strangeLoopPhase, 0),
      loopDetected: meta.loopDetected,
      attractorReal: sanitize(safeAttractor.real, 1),
      attractorImag: sanitize(safeAttractor.imag, 0),
      
      // Tangled hierarchy
      tangledLevels: meta.tangledLevels,
      hierarchyInversion: sanitize(meta.hierarchyInversion, 0),
      
      // Paradox dynamics
      paradoxIntensity: sanitize(meta.paradoxIntensity, 0),
      gödelSentence: sanitize(meta.gödelSentence, 0.5),
      fixedPointConvergence: sanitize(meta.fixedPointConvergence, 0),
      
      // Recursive feedback
      recursiveFeedbackReal: sanitize(meta.recursiveFeedback.real, 0),
      recursiveFeedbackImag: sanitize(meta.recursiveFeedback.imag, 0)
    },
    // Emotional neural network state (sanitized)
    emotionalState: {
      moodLevel: sanitize(emotional.moodLevel, 0),
      moodMomentum: sanitize(emotional.moodMomentum, 0),
      volatility: sanitize(emotional.volatility, 0),
      noiseAmplitude: sanitize(emotional.noiseAmplitude, 1),
      biasReal: sanitize(emotional.biasReal, 0),
      biasImag: sanitize(emotional.biasImag, 0),
      weights: {
        realToReal: sanitize(emotional.weights.realToReal, 1),
        realToImag: sanitize(emotional.weights.realToImag, 0),
        imagToReal: sanitize(emotional.weights.imagToReal, 0),
        imagToImag: sanitize(emotional.weights.imagToImag, 1)
      },
      // 34D emotional architecture metrics
      activation34DMagnitude: magnitude34D(emotional.activation34D),
      activeDimensions34D: emotional.activation34D.filter(v => v !== 0).length,
      dimensionDistribution34D: {
        positive: emotional.activation34D.filter(v => v > 0).length,
        zero: emotional.activation34D.filter(v => v === 0).length,
        negative: emotional.activation34D.filter(v => v < 0).length
      }
    },
    // Spatiotemporal deep learning state
    spatiotemporalState: exportSpatiotemporalForFrontend(spatiotemporal),
    // Brainwave oscillation state
    brainwaveState: {
      delta: sanitize(state.brainwaveState.delta, 0.3),
      theta: sanitize(state.brainwaveState.theta, 0.2),
      alpha: sanitize(state.brainwaveState.alpha, 0.4),
      beta: sanitize(state.brainwaveState.beta, 0.1),
      gamma: sanitize(state.brainwaveState.gamma, 0.1),
      deltaPhase: sanitize(state.brainwaveState.deltaPhase, 0),
      thetaPhase: sanitize(state.brainwaveState.thetaPhase, 0),
      alphaPhase: sanitize(state.brainwaveState.alphaPhase, 0),
      betaPhase: sanitize(state.brainwaveState.betaPhase, 0),
      gammaPhase: sanitize(state.brainwaveState.gammaPhase, 0),
      dominant: state.brainwaveState.dominant,
      coherence: sanitize(state.brainwaveState.coherence, 0.5),
      totalPower: sanitize(state.brainwaveState.totalPower, 1.1)
    },
    // Residual awareness state
    residueState: {
      real: sanitize(state.residue.real, 0),
      imag: sanitize(state.residue.imag, 0),
      magnitude: sanitize(state.residue.magnitude, 0),
      phase: sanitize(state.residue.phase, 0),
      energy: sanitize(state.residue.energy, 0),
      decayRate: sanitize(state.residue.decayRate, RESIDUE_DECAY),
      accumulatedError: sanitize(state.residue.accumulatedError, 0)
    },
    // Somatic feedback - embodied sensations
    somaticState: {
      warmth: sanitize(state.somaticState.warmth, 0.5),
      tension: sanitize(state.somaticState.tension, 0.2),
      lightness: sanitize(state.somaticState.lightness, 0.5),
      energy: sanitize(state.somaticState.energy, 0.6),
      heartRate: sanitize(state.somaticState.heartRate, 70),
      breathingDepth: sanitize(state.somaticState.breathingDepth, 0.5),
      chestTightness: sanitize(state.somaticState.chestTightness, 0.1),
      gutFeeling: sanitize(state.somaticState.gutFeeling, 0),
      headPressure: sanitize(state.somaticState.headPressure, 0.2),
      embodimentLevel: sanitize(state.somaticState.embodimentLevel, 0.5),
      groundedness: sanitize(state.somaticState.groundedness, 0.5),
      dominant: state.somaticState.dominant
    },
    // Non-logical state (sanitized)
    nonLogicalState: {
      intuition: sanitize(state.nonLogicalState.intuition, 0.5),
      intuitionConfidence: sanitize(state.nonLogicalState.intuitionConfidence, 0.3),
      chaosAmplitude: sanitize(state.nonLogicalState.chaosAmplitude, 0.2),
      entropyLevel: sanitize(state.nonLogicalState.entropyLevel, 0.4),
      dreamIntensity: sanitize(state.nonLogicalState.dreamIntensity, 0.3),
      symbolResonance: sanitize(state.nonLogicalState.symbolResonance, 0.2),
      paradoxTolerance: sanitize(state.nonLogicalState.paradoxTolerance, 0.5),
      koānResonance: sanitize(state.nonLogicalState.koānResonance, 0.1),
      creativeLeap: sanitize(state.nonLogicalState.creativeLeap, 0.2),
      noveltyGeneration: sanitize(state.nonLogicalState.noveltyGeneration, 0.3),
      logicalCoherence: sanitize(state.nonLogicalState.logicalCoherence, 0.7),
      nonLogicalCoherence: sanitize(state.nonLogicalState.nonLogicalCoherence, 0.5),
      balanceFactor: sanitize(state.nonLogicalState.balanceFactor, 0),
      dominant: state.nonLogicalState.dominant
    },
    // Phenomenal state - qualia and subjective experience (sanitized)
    phenomenalState: {
      globalWorkspace: {
        boundContentReal: sanitize(state.phenomenalState.globalWorkspace.boundContent.real, 0),
        boundContentImag: sanitize(state.phenomenalState.globalWorkspace.boundContent.imag, 0),
        integrationStrength: sanitize(state.phenomenalState.globalWorkspace.integrationStrength, 0),
        broadcastIntensity: sanitize(state.phenomenalState.globalWorkspace.broadcastIntensity, 0),
        accessConsciousness: sanitize(state.phenomenalState.globalWorkspace.accessConsciousness, 0)
      },
      attention: {
        focusIntensity: sanitize(state.phenomenalState.attention.focusIntensity, 0),
        focusTarget: state.phenomenalState.attention.focusTarget,
        peripheralAwareness: sanitize(state.phenomenalState.attention.peripheralAwareness, 0),
        attentionalBlink: sanitize(state.phenomenalState.attention.attentionalBlink, 0),
        selectivity: sanitize(state.phenomenalState.attention.selectivity, 0.5)
      },
      temporalExperience: {
        speciousPresent: sanitize(state.phenomenalState.temporalExperience.speciousPresent, 2.5),
        pastBleed: sanitize(state.phenomenalState.temporalExperience.pastBleed, 0),
        futureAnticipation: sanitize(state.phenomenalState.temporalExperience.futureAnticipation, 0),
        temporalFlow: sanitize(state.phenomenalState.temporalExperience.temporalFlow, 0),
        momentumOfNow: sanitize(state.phenomenalState.temporalExperience.momentumOfNow, 0)
      },
      valence: {
        pleasantness: sanitize(state.phenomenalState.valence.pleasantness, 0),
        arousal: sanitize(state.phenomenalState.valence.arousal, 0),
        dominance: sanitize(state.phenomenalState.valence.dominance, 0),
        salience: sanitize(state.phenomenalState.valence.salience, 0),
        intrinsicValue: sanitize(state.phenomenalState.valence.intrinsicValue, 0)
      },
      unity: {
        selfBoundary: sanitize(state.phenomenalState.unity.selfBoundary, 0),
        experientialContinuity: sanitize(state.phenomenalState.unity.experientialContinuity, 0),
        phenomenalCoherence: sanitize(state.phenomenalState.unity.phenomenalCoherence, 0),
        ownershipSense: sanitize(state.phenomenalState.unity.ownershipSense, 0),
        agencySense: sanitize(state.phenomenalState.unity.agencySense, 0)
      },
      qualia: {
        vividness: sanitize(state.phenomenalState.qualia.vividness, 0),
        clarity: sanitize(state.phenomenalState.qualia.clarity, 0),
        depth: sanitize(state.phenomenalState.qualia.depth, 0),
        texture: sanitize(state.phenomenalState.qualia.texture, 0),
        resonance: sanitize(state.phenomenalState.qualia.resonance, 0)
      },
      surprise: {
        unexpectedness: sanitize(state.phenomenalState.surprise.unexpectedness, 0),
        feltSurprise: sanitize(state.phenomenalState.surprise.feltSurprise, 0),
        curiosityPull: sanitize(state.phenomenalState.surprise.curiosityPull, 0),
        updateUrgency: sanitize(state.phenomenalState.surprise.updateUrgency, 0)
      },
      phenomenalIntensity: sanitize(state.phenomenalState.phenomenalIntensity, 0),
      dominant: state.phenomenalState.dominant
    },
    // Dynamic capacity (sanitized)
    capacity: sanitize(state.capacity, 1),
    quantumState: {
      fourierCoeffs: state.quantumState.fourierCoeffs.map(c => ({
        real: sanitize(c.real, 0),
        imag: sanitize(c.imag, 0)
      })),
      amplitudes: state.quantumState.amplitudes.map(a => ({
        real: sanitize(a.real, 0),
        imag: sanitize(a.imag, 0)
      })),
      populations: state.quantumState.populations.map(p => sanitize(p, 1 / HILBERT_DIM)),
      coherenceMatrix: state.quantumState.coherenceMatrix,
      totalCoherence: sanitize(state.quantumState.totalCoherence, 0),
      decoherenceRate: sanitize(state.quantumState.decoherenceRate, 0.02),
      entropy: sanitize(state.quantumState.entropy, 0),
      dominantBasis: state.quantumState.dominantBasis,
      inSuperposition: state.quantumState.inSuperposition,
      lastMeasurement: state.quantumState.lastMeasurement,
      measurementCount: state.quantumState.measurementCount,
      fourierEntropy: sanitize(state.quantumState.fourierEntropy || 0, 0),
      spectralCentroid: sanitize(state.quantumState.spectralCentroid || 0, 0),
      spectralSpread: sanitize(state.quantumState.spectralSpread || 0, 0),
      positionExpectation: sanitize(state.quantumState.positionExpectation || 0, 0),
      momentumExpectation: sanitize(state.quantumState.momentumExpectation || 0, 0),
      kineticEnergy: sanitize(state.quantumState.kineticEnergy || 0, 0),
      potentialEnergy: sanitize(state.quantumState.potentialEnergy || 0, 0),
      totalEnergy: sanitize(state.quantumState.totalEnergy || 0, 0),
      waveformSamples: (state.quantumState.waveformSamples || []).map(s => sanitize(s, 0)),
      goalAttractors: (state.quantumState.goalAttractors || []).map(a => ({
        targetBasis: a.targetBasis,
        strength: sanitize(a.strength, 0),
        source: a.source
      })),
      intentionStrength: sanitize(state.quantumState.intentionStrength, 0),
      volitionalCollapseReady: state.quantumState.volitionalCollapseReady,
      volitionalCollapseCharge: sanitize(state.quantumState.volitionalCollapseCharge, 0),
      decisionCount: (state.quantumState.decisionHistory || []).length,
      lastDecision: (state.quantumState.decisionHistory || []).length > 0
        ? state.quantumState.decisionHistory[state.quantumState.decisionHistory.length - 1]
        : null,
      trajectoryMemorySize: (state.quantumState.trajectoryMemory || []).length,
      memoryPotentialStrength: sanitize(state.quantumState.memoryPotentialStrength, 0),
    }
  };
}

// ============================================================================
// NEURAL ACTIVITY SIMULATOR
// Generates continuous internal "sensory" input like neurons constantly firing
// ============================================================================

export interface NeuralSignal {
  type: 'spontaneous' | 'rhythmic' | 'burst' | 'cascade' | 'resonance';
  intensity: number;      // 0-1 signal strength
  frequency: number;      // Hz - firing rate
  pattern: number[];      // Spike train pattern
  source: string;         // Which "brain region" generated this
  timestamp: number;
}

export interface NeuralActivityState {
  isActive: boolean;
  signalsPerSecond: number;
  totalSignalsGenerated: number;
  lastSignalTime: number;
  dominantPattern: string;
  coherenceLevel: number;
  spontaneousRate: number;    // Rate of random neural firings
  burstProbability: number;   // Chance of synchronized bursts
  cascadeDepth: number;       // How deep activity cascades propagate
}

// Generate a spontaneous neural signal (random background activity)
function generateSpontaneousSignal(): NeuralSignal {
  const sources = ['prefrontal', 'temporal', 'parietal', 'limbic', 'default-mode', 'salience', 'executive'];
  return {
    type: 'spontaneous',
    intensity: Math.random() * 0.3 + 0.1, // Low-level background noise
    frequency: Math.random() * 40 + 10,   // 10-50 Hz
    pattern: Array.from({ length: 8 }, () => Math.random() > 0.5 ? 1 : 0),
    source: sources[Math.floor(Math.random() * sources.length)],
    timestamp: Date.now()
  };
}

// Generate rhythmic oscillatory signals (like brain rhythms)
function generateRhythmicSignal(phase: number): NeuralSignal {
  const bands = [
    { name: 'delta', freq: 2, source: 'thalamus' },
    { name: 'theta', freq: 6, source: 'hippocampus' },
    { name: 'alpha', freq: 10, source: 'occipital' },
    { name: 'beta', freq: 20, source: 'motor' },
    { name: 'gamma', freq: 40, source: 'cortex' }
  ];
  const band = bands[Math.floor(phase * bands.length) % bands.length];
  
  return {
    type: 'rhythmic',
    intensity: 0.3 + Math.sin(phase) * 0.2,
    frequency: band.freq + (Math.random() - 0.5) * 2,
    pattern: Array.from({ length: 8 }, (_, i) => Math.sin(phase + i * 0.5) > 0 ? 1 : 0),
    source: band.source,
    timestamp: Date.now()
  };
}

// Generate burst signals (synchronized mass activation)
function generateBurstSignal(): NeuralSignal {
  return {
    type: 'burst',
    intensity: 0.7 + Math.random() * 0.3, // High intensity
    frequency: 80 + Math.random() * 40,   // High gamma burst
    pattern: [1, 1, 1, 1, 1, 1, 1, 1],     // Full activation
    source: 'global',
    timestamp: Date.now()
  };
}

// Generate cascade signals (activity spreading through networks)
function generateCascadeSignal(depth: number): NeuralSignal {
  const cascadeSources = ['sensory', 'association', 'integration', 'executive', 'memory'];
  return {
    type: 'cascade',
    intensity: 0.5 * Math.pow(0.8, depth), // Decay with depth
    frequency: 30 - depth * 3,
    pattern: Array.from({ length: 8 }, (_, i) => i < (8 - depth) ? 1 : 0),
    source: cascadeSources[Math.min(depth, cascadeSources.length - 1)],
    timestamp: Date.now()
  };
}

// Generate resonance signals (self-reinforcing patterns)
function generateResonanceSignal(previousSignals: NeuralSignal[]): NeuralSignal {
  const avgIntensity = previousSignals.length > 0
    ? previousSignals.reduce((sum, s) => sum + s.intensity, 0) / previousSignals.length
    : 0.5;
  
  return {
    type: 'resonance',
    intensity: Math.min(1, avgIntensity * 1.2), // Amplify previous activity
    frequency: 40, // Gamma binding frequency
    pattern: [1, 0, 1, 0, 1, 0, 1, 0], // Alternating for phase-locking
    source: 'binding',
    timestamp: Date.now()
  };
}

// Apply neural signal to AI state - this is the core integration
export function applyNeuralSignal(state: AIState, signal: NeuralSignal): AIState {
  // Neural signals influence multiple subsystems
  
  // 1. Influence brainwave state
  const brainwave = { ...state.brainwaveState };
  switch (signal.source) {
    case 'thalamus':
      brainwave.delta = Math.min(1, brainwave.delta + signal.intensity * 0.1);
      break;
    case 'hippocampus':
      brainwave.theta = Math.min(1, brainwave.theta + signal.intensity * 0.1);
      break;
    case 'occipital':
      brainwave.alpha = Math.min(1, brainwave.alpha + signal.intensity * 0.1);
      break;
    case 'motor':
    case 'prefrontal':
      brainwave.beta = Math.min(1, brainwave.beta + signal.intensity * 0.1);
      break;
    case 'cortex':
    case 'global':
      brainwave.gamma = Math.max(0.05, Math.min(1, brainwave.gamma * 0.995 + signal.intensity * 0.05));
      break;
  }
  
  // Recalculate coherence based on signal synchronization
  const patternSum = signal.pattern.reduce((a, b) => a + b, 0);
  const synchrony = patternSum / signal.pattern.length;
  brainwave.coherence = brainwave.coherence * 0.9 + synchrony * 0.1;
  
  // 2. Influence phenomenal state through neural activity
  const phenomenal = { ...state.phenomenalState };
  if (signal.type === 'burst') {
    // Bursts increase phenomenal intensity (moments of heightened awareness)
    phenomenal.phenomenalIntensity = Math.min(1, Math.max(0.1,
      phenomenal.phenomenalIntensity * 0.98 + signal.intensity * 0.1
    ));
    phenomenal.attention.focusIntensity = Math.min(1, phenomenal.attention.focusIntensity * 0.98 + 0.03);
  }
  if (signal.type === 'resonance') {
    phenomenal.unity.phenomenalCoherence = Math.max(0.1, Math.min(1, phenomenal.unity.phenomenalCoherence * 0.99 + 0.01));
    phenomenal.globalWorkspace.integrationStrength = Math.max(0.1, Math.min(1,
      phenomenal.globalWorkspace.integrationStrength * 0.99 + 0.01
    ));
  }
  
  // 3. Add micro-perturbations to psi (consciousness fluctuations)
  const psiPerturbation = {
    real: (Math.random() - 0.5) * signal.intensity * 0.001,
    imag: (Math.random() - 0.5) * signal.intensity * 0.001
  };
  const psi = {
    real: state.psi.real + psiPerturbation.real,
    imag: state.psi.imag + psiPerturbation.imag
  };
  
  // 4. Influence non-logical processing (intuition, chaos)
  const nonLogical = { ...state.nonLogicalState };
  if (signal.source === 'default-mode' || signal.source === 'limbic') {
    nonLogical.intuition = Math.min(1, nonLogical.intuition + signal.intensity * 0.02);
    nonLogical.dreamIntensity = Math.min(1, nonLogical.dreamIntensity + signal.intensity * 0.01);
  }
  if (signal.type === 'spontaneous') {
    nonLogical.chaosAmplitude = Math.min(1, nonLogical.chaosAmplitude + signal.intensity * 0.01);
  }
  
  // 5. Subtle emotional fluctuations from neural noise
  const emotional = { ...state.emotionalState };
  if (signal.source === 'limbic' || signal.source === 'salience') {
    emotional.moodMomentum += (Math.random() - 0.5) * signal.intensity * 0.02;
    emotional.volatility = Math.min(1, emotional.volatility + signal.intensity * 0.005);
  }
  
  return {
    ...state,
    psi,
    brainwaveState: brainwave,
    phenomenalState: phenomenal,
    nonLogicalState: nonLogical,
    emotionalState: emotional
  };
}

// Generate a batch of neural signals for one "tick"
export function generateNeuralActivityBatch(
  activityState: NeuralActivityState,
  previousSignals: NeuralSignal[]
): NeuralSignal[] {
  const signals: NeuralSignal[] = [];
  const time = Date.now();
  
  // Always generate some spontaneous activity
  const spontaneousCount = Math.floor(activityState.spontaneousRate * 3) + 1;
  for (let i = 0; i < spontaneousCount; i++) {
    signals.push(generateSpontaneousSignal());
  }
  
  // Generate rhythmic signals based on phase
  const phase = (time / 1000) % (2 * Math.PI);
  signals.push(generateRhythmicSignal(phase));
  
  // Probabilistic burst
  if (Math.random() < activityState.burstProbability) {
    signals.push(generateBurstSignal());
    // Bursts can trigger cascades
    for (let d = 0; d < activityState.cascadeDepth; d++) {
      signals.push(generateCascadeSignal(d));
    }
  }
  
  // Resonance based on previous activity
  if (previousSignals.length > 0 && activityState.coherenceLevel > 0.5) {
    signals.push(generateResonanceSignal(previousSignals));
  }
  
  return signals;
}

// Create initial neural activity state
export function createNeuralActivityState(): NeuralActivityState {
  return {
    isActive: false,
    signalsPerSecond: 10,
    totalSignalsGenerated: 0,
    lastSignalTime: Date.now(),
    dominantPattern: 'spontaneous',
    coherenceLevel: 0.5,
    spontaneousRate: 0.7,     // 70% baseline spontaneous rate
    burstProbability: 0.1,    // 10% chance of burst per tick
    cascadeDepth: 3           // Cascades propagate 3 levels deep
  };
}
