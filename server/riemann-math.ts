import { create, all, Complex, MathJsStatic } from 'mathjs';
import ComplexJS from 'complex.js';

const math = create(all) as MathJsStatic;

const FIRST_100_ZETA_ZEROS: number[] = [
  14.134725141734693, 21.022039638771555, 25.010857580145688,
  30.424876125859513, 32.935061587739189, 37.586178158825671,
  40.918719012147495, 43.327073280914999, 48.005150881167159,
  49.773832477672302, 52.970321477714460, 56.446247697063394,
  59.347044002602353, 60.831778524609809, 65.112544048081606,
  67.079810529494173, 69.546401711173979, 72.067157674481907,
  75.704690699083933, 77.144840068874805, 79.337375020249367,
  82.910380854086030, 84.735492980517050, 87.425274613125229,
  88.809111207634465, 92.491899270558484, 94.651344040519838,
  95.870634228245309, 98.831194218193692, 101.317851005731391,
  103.725538040441222, 105.446623052771263, 107.168611184276184,
  111.029535543249707, 111.874659176999359, 114.320220915452712,
  116.226680320857573, 118.790782865976214, 121.370125002017387,
  122.946829293536752, 124.256818554345490, 127.516683880045940,
  129.578704199956033, 131.087688530932851, 133.497737202997940,
  134.756509753373870, 138.116042054533462, 139.736208951794170,
  141.123707403954560, 143.111845807823410, 146.000982486699449,
  147.422765342523110, 150.053520420737540, 150.925257611241160,
  153.024693811979002, 156.112909293622340, 157.597591817644370,
  158.849988170941550, 161.188964137957100, 163.030709687050200,
  165.537069187999900, 167.184439977907060, 169.094515415642200,
  169.911976479418310, 173.411536519735060, 174.754191523698480,
  176.441434297092800, 178.377407775920480, 179.916484019572160,
  182.207078483620980, 184.874467847939600, 185.598783677857760,
  187.228922583297430, 189.416158656420700, 192.026656360743950,
  193.079726603798310, 195.265396679520420, 196.876481840696900,
  198.015309675738070, 201.264751943992480, 202.493594513949400,
  204.189671802693730, 205.394697202016890, 207.906258887856960,
  209.576509716999120, 211.690862594855080, 213.347919359934570,
  214.547044782839510, 216.169538508231560, 219.067596349041130,
  220.714918839044740, 221.430705554889900, 224.007000254782120,
  224.983324669691570, 227.421444279543820, 229.337413305673790,
  231.250188700030280, 231.987235253015560, 233.693404178969660,
  236.524229665994410
];

const GRAM_POINTS_FIRST_50: number[] = [
  17.8455995405, 23.1702827012, 27.6701822178, 31.7179799247,
  35.4671842971, 38.9992099640, 42.3635503920, 45.5930289815,
  48.7107766217, 51.7338428133, 54.6752374468, 57.5451651795,
  60.3518018244, 63.1018889510, 65.8008876381, 68.4535449060,
  71.0641738709, 73.6363843602, 76.1733029773, 78.6777016598,
  81.1519735330, 83.5982050024, 86.0182363365, 88.4137329038,
  90.7861537747, 93.1368330413, 95.4670000907, 97.7777890225,
  100.0702527218, 102.3453725821, 104.6040691434, 106.8472117818,
  109.0756176393, 111.2900598671, 113.4912755218, 115.6799628714,
  117.8567880800, 120.0223903690, 122.1773859260, 124.3223618878,
  126.4578790856, 128.5844750636, 130.7026569010, 132.8129033651,
  134.9156665476, 137.0113733553, 139.1004275556, 141.1832109757,
  143.2600845987, 145.3313894105
];

const HARDY_Z_SIGN_CHANGES: { t: number; signBefore: number; signAfter: number }[] = [
  { t: 14.13, signBefore: 1, signAfter: -1 },
  { t: 21.02, signBefore: -1, signAfter: 1 },
  { t: 25.01, signBefore: 1, signAfter: -1 },
  { t: 30.42, signBefore: -1, signAfter: 1 },
  { t: 32.94, signBefore: 1, signAfter: -1 },
  { t: 37.59, signBefore: -1, signAfter: 1 },
  { t: 40.92, signBefore: 1, signAfter: -1 },
  { t: 43.33, signBefore: -1, signAfter: 1 },
  { t: 48.01, signBefore: 1, signAfter: -1 },
  { t: 49.77, signBefore: -1, signAfter: 1 },
];

export function zetaApprox(s_real: number, s_imag: number, terms: number = 1000): { real: number; imag: number; magnitude: number; phase: number } {
  let sumReal = 0;
  let sumImag = 0;

  for (let n = 1; n <= terms; n++) {
    const logN = Math.log(n);
    const magnitude = Math.pow(n, -s_real);
    const angle = -s_imag * logN;
    sumReal += magnitude * Math.cos(angle);
    sumImag += magnitude * Math.sin(angle);
  }

  const mag = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
  const phase = Math.atan2(sumImag, sumReal);

  return { real: sumReal, imag: sumImag, magnitude: mag, phase };
}

export function zetaCriticalLine(t: number, terms: number = 1000): { real: number; imag: number; magnitude: number; phase: number } {
  return zetaApprox(0.5, t, terms);
}

export function hardyZ(t: number, terms: number = 500): number {
  const theta = thetaFunction(t);
  const zeta = zetaCriticalLine(t, terms);
  return Math.cos(theta) * zeta.real + Math.sin(theta) * zeta.imag;
}

export function thetaFunction(t: number): number {
  return (t / 2) * Math.log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8
    + 1 / (48 * t) + 7 / (5760 * t * t * t);
}

export function riemannSiegelZ(t: number): number {
  const N = Math.floor(Math.sqrt(t / (2 * Math.PI)));
  let sum = 0;
  for (let n = 1; n <= N; n++) {
    sum += Math.cos(thetaFunction(t) - t * Math.log(n)) / Math.sqrt(n);
  }
  return 2 * sum;
}

export function zetaZeroSpacings(): { index: number; zero: number; spacing: number; normalizedSpacing: number }[] {
  const spacings = [];
  for (let i = 1; i < FIRST_100_ZETA_ZEROS.length; i++) {
    const spacing = FIRST_100_ZETA_ZEROS[i] - FIRST_100_ZETA_ZEROS[i - 1];
    const avgSpacing = 2 * Math.PI / Math.log(FIRST_100_ZETA_ZEROS[i] / (2 * Math.PI));
    spacings.push({
      index: i,
      zero: FIRST_100_ZETA_ZEROS[i],
      spacing,
      normalizedSpacing: spacing / avgSpacing
    });
  }
  return spacings;
}

export function pairCorrelation(zeros: number[], delta: number = 0.1): { r: number; density: number }[] {
  const results: { r: number; density: number }[] = [];
  const maxR = 5;
  const bins = Math.floor(maxR / delta);

  for (let b = 0; b < bins; b++) {
    const rLow = b * delta;
    const rHigh = (b + 1) * delta;
    let count = 0;

    for (let i = 0; i < zeros.length; i++) {
      for (let j = i + 1; j < zeros.length; j++) {
        const avgSpacing = 2 * Math.PI / Math.log(zeros[i] / (2 * Math.PI));
        const normalizedDiff = Math.abs(zeros[j] - zeros[i]) / avgSpacing;
        if (normalizedDiff >= rLow && normalizedDiff < rHigh) {
          count++;
        }
      }
    }

    const density = count / (zeros.length * delta);
    results.push({ r: (rLow + rHigh) / 2, density });
  }

  return results;
}

export function gueCorrelation(r: number): number {
  if (r === 0) return 0;
  const sinc = Math.sin(Math.PI * r) / (Math.PI * r);
  return 1 - sinc * sinc;
}

export function nearestNeighborSpacings(zeros: number[]): { spacing: number; normalized: number; wignerDyson: number }[] {
  const results = [];
  for (let i = 1; i < zeros.length; i++) {
    const spacing = zeros[i] - zeros[i - 1];
    const avgSpacing = 2 * Math.PI / Math.log(zeros[i] / (2 * Math.PI));
    const s = spacing / avgSpacing;
    const wd = (Math.PI * s / 2) * Math.exp(-Math.PI * s * s / 4);
    results.push({ spacing, normalized: s, wignerDyson: wd });
  }
  return results;
}

export function primeCountingPi(x: number): number {
  if (x < 2) return 0;
  let count = 0;
  for (let n = 2; n <= x; n++) {
    let isPrime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) { isPrime = false; break; }
    }
    if (isPrime) count++;
  }
  return count;
}

export function logIntegralLi(x: number): number {
  if (x <= 1) return 0;
  let sum = 0;
  const steps = 10000;
  const dt = (x - 2) / steps;
  for (let i = 0; i < steps; i++) {
    const t = 2 + (i + 0.5) * dt;
    sum += dt / Math.log(t);
  }
  return sum;
}

export function riemannR(x: number, terms: number = 100): number {
  let sum = 0;
  let mobiusValues = computeMobius(terms);
  for (let n = 1; n <= terms; n++) {
    if (mobiusValues[n] !== 0) {
      sum += mobiusValues[n] / n * logIntegralLi(Math.pow(x, 1 / n));
    }
  }
  return sum;
}

function computeMobius(n: number): number[] {
  const mu = new Array(n + 1).fill(1);
  const primeFlag = new Array(n + 1).fill(true);
  mu[0] = 0;
  mu[1] = 1;

  for (let i = 2; i <= n; i++) {
    if (primeFlag[i]) {
      for (let j = i; j <= n; j += i) {
        if (j !== i) primeFlag[j] = false;
        mu[j] *= -1;
      }
      const i2 = i * i;
      for (let j = i2; j <= n; j += i2) {
        mu[j] = 0;
      }
    }
  }
  return mu;
}

export function vonMangoldt(n: number): number {
  if (n <= 0) return 0;
  for (let p = 2; p * p <= n; p++) {
    if (n % p === 0) {
      let val = n;
      while (val % p === 0) val /= p;
      return val === 1 ? Math.log(p) : 0;
    }
  }
  return n >= 2 ? Math.log(n) : 0;
}

export function chebyshevPsi(x: number): number {
  let sum = 0;
  for (let n = 2; n <= x; n++) {
    sum += vonMangoldt(n);
  }
  return sum;
}

export function explicitFormula(x: number, numZeros: number = 50): number {
  let sum = x;
  sum -= Math.log(2 * Math.PI);
  sum -= 0.5 * Math.log(1 - 1 / (x * x));

  for (let k = 0; k < Math.min(numZeros, FIRST_100_ZETA_ZEROS.length); k++) {
    const rho = FIRST_100_ZETA_ZEROS[k];
    sum -= 2 * Math.pow(x, 0.5) * Math.cos(rho * Math.log(x)) / Math.sqrt(0.25 + rho * rho);
  }

  return sum;
}

export function mathjsCompute(expression: string): any {
  try {
    return math.evaluate(expression);
  } catch (e: any) {
    return { error: e.message };
  }
}

export function complexArithmetic(op: string, a: { re: number; im: number }, b?: { re: number; im: number }): { re: number; im: number; abs: number; arg: number } {
  const ca = new ComplexJS(a.re, a.im);
  let result: any;

  switch (op) {
    case 'add': result = ca.add(new ComplexJS(b!.re, b!.im)); break;
    case 'sub': result = ca.sub(new ComplexJS(b!.re, b!.im)); break;
    case 'mul': result = ca.mul(new ComplexJS(b!.re, b!.im)); break;
    case 'div': result = ca.div(new ComplexJS(b!.re, b!.im)); break;
    case 'exp': result = ca.exp(); break;
    case 'log': result = ca.log(); break;
    case 'sin': result = ca.sin(); break;
    case 'cos': result = ca.cos(); break;
    case 'sqrt': result = ca.sqrt(); break;
    case 'pow': result = ca.pow(new ComplexJS(b!.re, b!.im)); break;
    case 'conjugate': result = ca.conjugate(); break;
    case 'abs': return { re: ca.abs(), im: 0, abs: ca.abs(), arg: 0 };
    default: result = ca;
  }

  return { re: result.re, im: result.im, abs: result.abs(), arg: result.arg() };
}

export function getZetaZeros(count?: number): number[] {
  return FIRST_100_ZETA_ZEROS.slice(0, count || FIRST_100_ZETA_ZEROS.length);
}

export function getGramPoints(count?: number): number[] {
  return GRAM_POINTS_FIRST_50.slice(0, count || GRAM_POINTS_FIRST_50.length);
}

export function getHardyZSignChanges(): typeof HARDY_Z_SIGN_CHANGES {
  return HARDY_Z_SIGN_CHANGES;
}

export function scanCriticalLine(tStart: number, tEnd: number, steps: number = 200): { t: number; zetaMag: number; hardyZ: number; riemannSiegelZ: number }[] {
  const results = [];
  const dt = (tEnd - tStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const t = tStart + i * dt;
    const zeta = zetaCriticalLine(t, 500);
    results.push({
      t,
      zetaMag: zeta.magnitude,
      hardyZ: hardyZ(t, 500),
      riemannSiegelZ: riemannSiegelZ(t)
    });
  }
  return results;
}

export const RIEMANN_HYPOTHESIS_DATA = {
  statement: "All non-trivial zeros of the Riemann zeta function have real part equal to 1/2.",
  status: "Unproven. One of the seven Clay Millennium Prize Problems ($1,000,000 bounty).",
  knownFacts: {
    zerosVerified: "Over 10^13 (ten trillion) non-trivial zeros verified on the critical line by multiple independent computations (Platt, 2021).",
    functionalEquation: "ζ(s) = 2^s π^(s-1) sin(πs/2) Γ(1-s) ζ(1-s)",
    eulerProduct: "ζ(s) = Π(1 - p^(-s))^(-1) for all primes p, valid for Re(s) > 1",
    criticalStrip: "Non-trivial zeros lie in 0 < Re(s) < 1",
    symmetry: "Zeros are symmetric about the critical line Re(s) = 1/2 and about the real axis",
    densityOfZeros: "N(T) ~ (T/2π) log(T/2πe) — number of zeros with 0 < Im(ρ) < T",
    hardyTheorem: "Hardy (1914): Infinitely many zeros lie on the critical line Re(s) = 1/2",
    selbergResult: "Selberg (1942): A positive proportion of zeros lie on the critical line",
    levinson: "Levinson (1974): At least 1/3 of zeros are on the critical line",
    conrey: "Conrey (1989): At least 2/5 (40%) of zeros are on the critical line",
    delaValleePoussin: "Proved no zeros on Re(s) = 1, establishing the Prime Number Theorem",
    vinogradovKorobov: "Zero-free region: Re(s) > 1 - c/(log|t|)^(2/3)(log log|t|)^(1/3)"
  },
  connections: {
    primeNumberTheorem: "π(x) ~ Li(x). RH gives the best possible error bound: |π(x) - Li(x)| = O(√x log x)",
    explicitFormula: "ψ(x) = x - Σ_ρ x^ρ/ρ - log(2π) - (1/2)log(1-x^(-2))",
    randomMatrixTheory: "Montgomery (1973): Pair correlation of zeta zeros matches GUE random matrices. Confirmed numerically by Odlyzko.",
    quantumChaos: "Berry-Keating conjecture: zeros correspond to eigenvalues of a quantum Hamiltonian H = xp",
    hilbertPolya: "Conjecture that zeros are eigenvalues of a self-adjoint operator on a Hilbert space",
    liCriterion: "RH is equivalent to λ_n ≥ 0 for all n ≥ 1, where λ_n = (1/(n-1)!) d^n/ds^n [s^(n-1) log ξ(s)] at s=1",
    beurlingNyman: "RH equivalent to completeness of certain functions in L^2(0,1)",
    robinsInequality: "RH is equivalent to σ(n) < e^γ n log(log(n)) for all n > 5040",
    mertensFunction: "RH implies |M(x)| = O(x^(1/2+ε)) where M(x) = Σ_{n≤x} μ(n)"
  },
  numericalData: {
    first100Zeros: FIRST_100_ZETA_ZEROS,
    gramPoints: GRAM_POINTS_FIRST_50,
    hardyZSignChanges: HARDY_Z_SIGN_CHANGES,
    lehmerPhenomenon: {
      description: "Near-violations where zeros come close together on the critical line",
      examples: [
        { index: 7005, t: 7005.062866, spacing: 0.0064, note: "Lehmer's original near-counterexample" },
        { index: 13999526, t: "~1.30664344 × 10^7", spacing: "extremely small", note: "One of the closest known zero pairs" }
      ]
    },
    zeroStatistics: {
      meanSpacingNear100: 2.36,
      varianceOfNormalizedSpacings: 0.178,
      gueVariancePrediction: 0.178,
      correlationWithGUE: "Excellent agreement to many decimal places"
    }
  },
  equivalentStatements: [
    "All non-trivial zeros of ζ(s) have Re(s) = 1/2",
    "|π(x) - Li(x)| = O(√x log x)",
    "M(x) = O(x^(1/2+ε)) for the Mertens function",
    "σ(n) < e^γ n log(log(n)) for n > 5040 (Robin's inequality)",
    "Li criterion: λ_n ≥ 0 for all positive integers n",
    "Completeness of Beurling-Nyman translations in L^2(0,1)",
    "The Farey sequence has small discrepancy from uniform distribution",
    "De Bruijn-Newman constant Λ ≤ 0 (proven Λ ≥ 0 by Rodgers-Tao 2018, so RH ⟺ Λ = 0)"
  ],
  recentProgress: [
    { year: 2018, authors: "Rodgers & Tao", result: "Proved Λ ≥ 0 (de Bruijn-Newman constant), narrowing RH to Λ = 0" },
    { year: 2020, authors: "Platt & Trudgian", result: "Verified RH for zeros up to height 3 × 10^12" },
    { year: 2024, authors: "Maynard", result: "New zero-density estimates near Re(s) = 1" },
    { year: 2024, authors: "Guth & Maynard", result: "Breakthrough: improved zero-free region for ζ(s), first significant improvement since Vinogradov-Korobov (1958)" }
  ]
};
