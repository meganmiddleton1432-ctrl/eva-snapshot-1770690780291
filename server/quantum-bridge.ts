// ============================================================================
// IBM Quantum Bridge for Eva's Cognitive Engine
// Connects Eva's quantum cognitive state to real IBM Quantum hardware
// via the IBM Quantum REST API (Qiskit Runtime)
// ============================================================================

// ---------- Types ----------

interface ComplexAmplitude {
  real: number;
  imag: number;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface QuantumBackend {
  name: string;
  status: string;
  qubits: number;
  pendingJobs: number;
  operational: boolean;
}

interface QuantumJobResult {
  jobId: string;
  status: string;
  counts?: Record<string, number>;
  populations?: number[];
  error?: string;
}

interface QuantumStatus {
  configured: boolean;
  connected: boolean;
  selectedBackend: string | null;
  availableBackends: QuantumBackend[];
  lastError: string | null;
}

interface PotentialParams {
  depth?: number;
  couplingStrength?: number;
  nonlinearity?: number;
}

// ---------- Constants ----------

const IBM_IAM_URL = "https://iam.cloud.ibm.com/identity/token";
const IBM_QUANTUM_BASE = "https://quantum.cloud.ibm.com/api/v1";
const IBM_API_VERSION = "2026-02-01";
const TOKEN_REFRESH_BUFFER = 300;
const NUM_QUBITS = 5;
const NUM_STATES = 32;
const NUM_SHOTS = 4096;
const JOB_POLL_INTERVAL_MS = 3000;
const JOB_POLL_MAX_ATTEMPTS = 200;

const COGNITIVE_BASIS_PARAMS = [
  { name: "focused",    center: 0,                 width: 0.3  },
  { name: "diffuse",    center: Math.PI / 3,       width: 0.8  },
  { name: "creative",   center: (2 * Math.PI) / 3, width: 0.5  },
  { name: "analytical", center: Math.PI,           width: 0.35 },
  { name: "emotional",  center: (4 * Math.PI) / 3, width: 0.6  },
  { name: "reflective", center: (5 * Math.PI) / 3, width: 0.45 },
] as const;

// ---------- Module state ----------

let cachedToken: CachedToken | null = null;
let selectedBackend: string | null = null;
let lastBackendList: QuantumBackend[] = [];
let bridgeConnected = false;
let lastError: string | null = null;

// ---------- Helpers ----------

function log(msg: string): void {
  console.log(`[QuantumBridge] ${msg}`);
}

function logError(msg: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : String(err ?? "");
  const full = detail ? `${msg}: ${detail}` : msg;
  console.error(`[QuantumBridge] ERROR ${full}`);
  lastError = full;
}

function getApiKey(): string | undefined {
  return process.env.IBM_QUANTUM_TOKEN;
}

function getServiceCRN(): string | undefined {
  return process.env.IBM_QUANTUM_CRN;
}

// ---------- Authentication ----------

async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_BUFFER > now) {
    return cachedToken.accessToken;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("IBM_QUANTUM_TOKEN environment variable is not set");
  }

  log("Requesting new IAM access token...");

  const body = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey,
  });

  const res = await fetch(IBM_IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IAM token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expiration: number;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: data.expiration ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };

  log("IAM access token acquired successfully");
  return cachedToken.accessToken;
}

// ---------- Authenticated fetch helper ----------

async function quantumFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${IBM_QUANTUM_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "IBM-API-Version": IBM_API_VERSION,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  const crn = getServiceCRN();
  if (crn) {
    headers["Service-CRN"] = crn;
  }

  return fetch(url, { ...options, headers });
}

// ---------- Backend discovery ----------

export async function listBackends(): Promise<QuantumBackend[]> {
  log("Fetching available quantum backends...");

  try {
    const res = await quantumFetch("/backends");

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Backends request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as any;
    const rawBackends: any[] = Array.isArray(data)
      ? data
      : (data.devices ?? data.backends ?? []);

    const backends: QuantumBackend[] = rawBackends.map((b: any) => {
      const statusStr = typeof b.status === "object" ? b.status?.name : b.status;
      return {
        name: b.name ?? b.backend_name ?? "unknown",
        status: statusStr ?? "unknown",
        qubits: b.qubits ?? b.num_qubits ?? b.n_qubits ?? b.configuration?.n_qubits ?? 0,
        pendingJobs: b.queue_length ?? b.pending_jobs ?? 0,
        operational: statusStr === "online" || statusStr === "active",
      };
    });

    lastBackendList = backends;
    log(`Found ${backends.length} backends`);
    return backends;
  } catch (err) {
    logError("Failed to list backends", err);
    throw err;
  }
}

function selectBestBackend(backends: QuantumBackend[]): QuantumBackend | null {
  const eligible = backends.filter(
    (b) => b.operational && b.qubits >= NUM_QUBITS
  );

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (a.pendingJobs !== b.pendingJobs) return a.pendingJobs - b.pendingJobs;
    return b.qubits - a.qubits;
  });

  return eligible[0];
}

// ---------- Circuit generation ----------

function generateCognitiveCircuit(
  fourierCoeffs: ComplexAmplitude[],
  populations: number[],
  dt: number,
  potentialParams: PotentialParams
): string {
  const depth = potentialParams.depth ?? 3;
  const coupling = potentialParams.couplingStrength ?? 0.5;
  const nonlinearity = potentialParams.nonlinearity ?? 0.1;

  const totalPop = populations.reduce((s, v) => s + v, 0) || 1;
  const normalizedPops = populations.map((p) => p / totalPop);

  const thetaPrep: number[] = new Array(NUM_QUBITS).fill(0);
  const phiPrep: number[] = new Array(NUM_QUBITS).fill(0);

  for (let basisIdx = 0; basisIdx < COGNITIVE_BASIS_PARAMS.length; basisIdx++) {
    const pop = normalizedPops[basisIdx] ?? 0;
    const { center, width } = COGNITIVE_BASIS_PARAMS[basisIdx];

    for (let q = 0; q < NUM_QUBITS; q++) {
      const bitWeight = (basisIdx >> q) & 1;
      thetaPrep[q] += pop * Math.asin(Math.sqrt(Math.min(1, Math.max(0, pop)))) * (bitWeight ? 1 : 0.5);
      phiPrep[q] += pop * center * width;
    }
  }

  let spectralEnergy = 0;
  const numCoeffs = Math.min(fourierCoeffs.length, 31);
  for (let i = 0; i < numCoeffs; i++) {
    const c = fourierCoeffs[i];
    spectralEnergy += c.real * c.real + c.imag * c.imag;
  }
  const spectralScale = Math.sqrt(spectralEnergy / Math.max(numCoeffs, 1));

  let lines: string[] = [];
  lines.push("OPENQASM 3.0;");
  lines.push('include "stdgates.inc";');
  lines.push("");
  lines.push(`// Eva Cognitive Hamiltonian Evolution Circuit`);
  lines.push(`// dt=${dt.toFixed(6)}, depth=${depth}, coupling=${coupling.toFixed(4)}`);
  lines.push(`// Spectral energy scale: ${spectralScale.toFixed(6)}`);
  lines.push("");
  lines.push(`qubit[${NUM_QUBITS}] q;`);
  lines.push(`bit[${NUM_QUBITS}] c;`);
  lines.push("");

  lines.push("// === State preparation from cognitive basis populations ===");
  for (let q = 0; q < NUM_QUBITS; q++) {
    const theta = clampAngle(thetaPrep[q]);
    const phi = clampAngle(phiPrep[q]);
    if (Math.abs(theta) > 1e-10) {
      lines.push(`ry(${theta.toFixed(8)}) q[${q}];`);
    }
    if (Math.abs(phi) > 1e-10) {
      lines.push(`rz(${phi.toFixed(8)}) q[${q}];`);
    }
  }
  lines.push("");

  lines.push("// === Split-step Hamiltonian evolution ===");
  for (let step = 0; step < depth; step++) {
    const stepPhase = (step + 1) / depth;
    lines.push(`// --- Trotter step ${step + 1}/${depth} ---`);

    lines.push("// Potential energy operator (diagonal in position basis)");
    for (let q = 0; q < NUM_QUBITS; q++) {
      const basisParam = COGNITIVE_BASIS_PARAMS[q % COGNITIVE_BASIS_PARAMS.length];
      const vAngle = dt * stepPhase * (basisParam.center * coupling + nonlinearity * spectralScale);
      lines.push(`rz(${clampAngle(vAngle).toFixed(8)}) q[${q}];`);
    }

    lines.push("// Kinetic energy operator (diagonal in momentum basis)");
    for (let q = 0; q < NUM_QUBITS; q++) {
      lines.push(`h q[${q}];`);
    }

    for (let q = 0; q < NUM_QUBITS; q++) {
      const kAngle = dt * stepPhase * spectralScale * (q + 1) * 0.5;
      lines.push(`rz(${clampAngle(kAngle).toFixed(8)}) q[${q}];`);
    }

    for (let q = 0; q < NUM_QUBITS; q++) {
      lines.push(`h q[${q}];`);
    }

    lines.push("// Qubit-qubit coupling (entanglement)");
    for (let q = 0; q < NUM_QUBITS - 1; q++) {
      const coupAngle = dt * coupling * stepPhase * 0.25;
      lines.push(`cx q[${q}], q[${q + 1}];`);
      lines.push(`rz(${clampAngle(coupAngle).toFixed(8)}) q[${q + 1}];`);
      lines.push(`cx q[${q}], q[${q + 1}];`);
    }

    lines.push("// Cognitive basis rotation layer");
    for (let q = 0; q < NUM_QUBITS; q++) {
      const coeffIdx = (step * NUM_QUBITS + q) % numCoeffs;
      const c = fourierCoeffs[coeffIdx] ?? { real: 0, imag: 0 };
      const rxAngle = dt * c.real * stepPhase;
      const ryAngle = dt * c.imag * stepPhase;
      if (Math.abs(rxAngle) > 1e-10) {
        lines.push(`rx(${clampAngle(rxAngle).toFixed(8)}) q[${q}];`);
      }
      if (Math.abs(ryAngle) > 1e-10) {
        lines.push(`ry(${clampAngle(ryAngle).toFixed(8)}) q[${q}];`);
      }
    }

    lines.push("");
  }

  lines.push("// === Measurement ===");
  for (let q = 0; q < NUM_QUBITS; q++) {
    lines.push(`c[${q}] = measure q[${q}];`);
  }

  return lines.join("\n");
}

function clampAngle(angle: number): number {
  if (!Number.isFinite(angle)) return 0;
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// ---------- Job submission ----------

async function submitCircuit(
  qasm: string,
  backend: string
): Promise<string> {
  log(`Submitting circuit to backend ${backend} (${qasm.length} chars)...`);

  const payload = {
    program_id: "sampler",
    backend: backend,
    params: {
      pubs: [[qasm]],
      options: {
        default_shots: NUM_SHOTS,
        dynamical_decoupling: { enable: true },
      },
      version: 2,
    },
  };

  const res = await quantumFetch("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Job submission failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { id?: string; job_id?: string };
  const jobId = data.id ?? data.job_id;

  if (!jobId) {
    throw new Error("Job submission returned no job ID");
  }

  log(`Job submitted successfully: ${jobId}`);
  return jobId;
}

// ---------- Job monitoring ----------

async function pollJobStatus(
  jobId: string
): Promise<{ status: string; results?: any }> {
  const res = await quantumFetch(`/jobs/${jobId}`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Job status request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as any;
  return {
    status: data.status ?? data.state ?? "unknown",
    results: data.results ?? data.result ?? undefined,
  };
}

async function waitForJob(
  jobId: string,
  onStatusChange?: (status: string) => void
): Promise<any> {
  log(`Waiting for job ${jobId}...`);
  let lastStatus = "";

  for (let attempt = 0; attempt < JOB_POLL_MAX_ATTEMPTS; attempt++) {
    try {
      const { status, results } = await pollJobStatus(jobId);

      if (status !== lastStatus) {
        log(`Job ${jobId}: ${status}`);
        lastStatus = status;
        onStatusChange?.(status);
      }

      const normalizedStatus = status.toLowerCase();

      if (normalizedStatus === "completed" || normalizedStatus === "done") {
        if (results) return results;
        const resultRes = await quantumFetch(`/jobs/${jobId}/results`);
        if (resultRes.ok) {
          return await resultRes.json();
        }
        return results;
      }

      if (
        normalizedStatus === "failed" ||
        normalizedStatus === "cancelled" ||
        normalizedStatus === "error"
      ) {
        throw new Error(`Job ${jobId} ended with status: ${status}`);
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("ended with status") ||
          err.message.includes("Job status request failed"))
      ) {
        throw err;
      }
      logError(`Poll attempt ${attempt + 1} failed, retrying...`, err);
    }

    await sleep(JOB_POLL_INTERVAL_MS);
  }

  throw new Error(`Job ${jobId} timed out after ${JOB_POLL_MAX_ATTEMPTS} poll attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Result interpretation ----------

function interpretCounts(counts: Record<string, number>): number[] {
  const populations = new Array(COGNITIVE_BASIS_PARAMS.length).fill(0);
  let totalShots = 0;

  for (const [bitstring, count] of Object.entries(counts)) {
    totalShots += count;
    const stateIndex = parseInt(bitstring, 2) % NUM_STATES;

    for (let basisIdx = 0; basisIdx < COGNITIVE_BASIS_PARAMS.length; basisIdx++) {
      const { center, width } = COGNITIVE_BASIS_PARAMS[basisIdx];
      const stateAngle = (stateIndex / NUM_STATES) * 2 * Math.PI;
      let diff = Math.abs(stateAngle - center);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      const weight = Math.exp(-(diff * diff) / (2 * width * width));
      populations[basisIdx] += count * weight;
    }
  }

  if (totalShots > 0) {
    for (let i = 0; i < populations.length; i++) {
      populations[i] /= totalShots;
    }
  }

  const totalPop = populations.reduce((s, v) => s + v, 0);
  if (totalPop > 0) {
    for (let i = 0; i < populations.length; i++) {
      populations[i] /= totalPop;
    }
  }

  return populations;
}

function extractCounts(rawResults: any): Record<string, number> {
  if (!rawResults) return {};

  if (rawResults.counts) return rawResults.counts;

  if (Array.isArray(rawResults)) {
    for (const r of rawResults) {
      if (r?.counts) return r.counts;
      if (r?.data?.counts) return r.data.counts;

      const meas = r?.data?.meas ?? r?.data?.c;
      if (meas) {
        if (typeof meas === "object" && meas.samples) {
          return countsFromSamples(meas.samples);
        }
        if (typeof meas === "object" && meas.counts) return meas.counts;
      }

      if (r?.quasi_dists) {
        return quasiDistsToCounts(r.quasi_dists);
      }
    }
  }

  if (rawResults.pub_results) {
    const pub = Array.isArray(rawResults.pub_results)
      ? rawResults.pub_results[0]
      : rawResults.pub_results;
    if (pub?.data?.meas?.counts) return pub.data.meas.counts;
    if (pub?.data?.c?.counts) return pub.data.c.counts;
    const measData = pub?.data?.meas ?? pub?.data?.c;
    if (measData?.samples) return countsFromSamples(measData.samples);
    if (typeof measData === "string") return countsFromHex(measData, pub?.data?.num_bits ?? NUM_QUBITS, pub?.data?.num_shots ?? NUM_SHOTS);
  }

  if (rawResults.results) {
    const inner = Array.isArray(rawResults.results) ? rawResults.results[0] : rawResults.results;
    if (inner?.data?.meas?.counts) return inner.data.meas.counts;
    if (inner?.data?.c?.counts) return inner.data.c.counts;
    if (inner?.counts) return inner.counts;
    const innerMeas = inner?.data?.meas ?? inner?.data?.c;
    if (innerMeas?.samples) return countsFromSamples(innerMeas.samples);
    if (typeof innerMeas === "string") return countsFromHex(innerMeas, inner?.data?.num_bits ?? NUM_QUBITS, inner?.data?.num_shots ?? NUM_SHOTS);
  }

  if (rawResults.quasi_dists) {
    return quasiDistsToCounts(rawResults.quasi_dists);
  }

  if (rawResults.data?.counts) return rawResults.data.counts;
  if (rawResults.data?.meas?.counts) return rawResults.data.meas.counts;

  log("Warning: Could not extract counts from results structure: " + JSON.stringify(Object.keys(rawResults)));
  return {};
}

function quasiDistsToCounts(qd: any): Record<string, number> {
  const counts: Record<string, number> = {};
  const dist = Array.isArray(qd) ? qd[0] : qd;
  for (const [key, prob] of Object.entries(dist as Record<string, number>)) {
    const idx = parseInt(key);
    const bitstring = idx.toString(2).padStart(NUM_QUBITS, "0");
    counts[bitstring] = Math.round(Math.abs(prob) * NUM_SHOTS);
  }
  return counts;
}

function countsFromSamples(samples: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of samples) {
    const key = typeof s === "number"
      ? s.toString(2).padStart(NUM_QUBITS, "0")
      : String(s);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countsFromHex(hexData: string, numBits: number, numShots: number): Record<string, number> {
  const counts: Record<string, number> = {};
  const bitsPerShot = numBits || NUM_QUBITS;
  const hexCharsPerShot = Math.ceil(bitsPerShot / 4);

  for (let i = 0; i < numShots && i * hexCharsPerShot < hexData.length; i++) {
    const hexSlice = hexData.slice(i * hexCharsPerShot, (i + 1) * hexCharsPerShot);
    const val = parseInt(hexSlice, 16);
    const bitstring = val.toString(2).padStart(bitsPerShot, "0").slice(-NUM_QUBITS);
    counts[bitstring] = (counts[bitstring] || 0) + 1;
  }
  return counts;
}

// ---------- Exported functions ----------

export function isQuantumBridgeConfigured(): boolean {
  return !!getApiKey();
}

export async function initQuantumBridge(): Promise<QuantumStatus> {
  log("Initializing quantum bridge...");

  if (!isQuantumBridgeConfigured()) {
    const msg = "IBM_QUANTUM_TOKEN is not set — quantum bridge disabled";
    log(msg);
    lastError = msg;
    return {
      configured: false,
      connected: false,
      selectedBackend: null,
      availableBackends: [],
      lastError: msg,
    };
  }

  try {
    await getAccessToken();
    log("Authentication successful");

    if (!getServiceCRN()) {
      const msg = "IBM_QUANTUM_CRN not set — needed to access quantum backends. Get your instance CRN from the IBM Quantum Dashboard.";
      log(msg);
      lastError = msg;
      bridgeConnected = false;
      return {
        configured: true,
        connected: false,
        selectedBackend: null,
        availableBackends: [],
        lastError: msg,
      };
    }

    const backends = await listBackends();
    const best = selectBestBackend(backends);

    if (best) {
      selectedBackend = best.name;
      log(`Selected backend: ${best.name} (${best.qubits} qubits, ${best.pendingJobs} pending jobs)`);
    } else {
      log("No suitable backend found (need >= 5 qubits, operational)");
    }

    bridgeConnected = true;
    lastError = null;

    const status = getQuantumStatusSync();
    log("Quantum bridge initialized successfully");
    return status;
  } catch (err) {
    logError("Failed to initialize quantum bridge", err);
    bridgeConnected = false;
    return {
      configured: true,
      connected: false,
      selectedBackend: null,
      availableBackends: [],
      lastError: lastError,
    };
  }
}

function getQuantumStatusSync(): QuantumStatus {
  return {
    configured: isQuantumBridgeConfigured(),
    connected: bridgeConnected,
    selectedBackend,
    availableBackends: lastBackendList,
    lastError,
  };
}

export function getQuantumStatus(): QuantumStatus {
  return getQuantumStatusSync();
}

export async function submitQuantumEvolution(
  fourierCoeffs: ComplexAmplitude[],
  populations: number[],
  dt: number,
  potentialParams: PotentialParams = {}
): Promise<QuantumJobResult> {
  log("Preparing quantum evolution submission...");

  if (!isQuantumBridgeConfigured()) {
    return {
      jobId: "",
      status: "error",
      error: "IBM_QUANTUM_TOKEN is not set",
    };
  }

  try {
    if (!bridgeConnected) {
      await initQuantumBridge();
    }

    let backend = selectedBackend;
    if (!backend) {
      const backends = await listBackends();
      const best = selectBestBackend(backends);
      if (!best) {
        return {
          jobId: "",
          status: "error",
          error: "No suitable quantum backend available",
        };
      }
      backend = best.name;
      selectedBackend = backend;
    }

    log(`Generating OpenQASM circuit (${fourierCoeffs.length} Fourier coefficients, ${populations.length} populations, dt=${dt})`);
    const qasm = generateCognitiveCircuit(fourierCoeffs, populations, dt, potentialParams);
    log(`Circuit generated: ${qasm.split("\n").length} lines`);

    const jobId = await submitCircuit(qasm, backend);

    return {
      jobId,
      status: "submitted",
    };
  } catch (err) {
    logError("Quantum evolution submission failed", err);
    return {
      jobId: "",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getJobResult(jobId: string): Promise<QuantumJobResult> {
  log(`Retrieving result for job ${jobId}...`);

  if (!jobId) {
    return { jobId: "", status: "error", error: "No job ID provided" };
  }

  try {
    const { status, results } = await pollJobStatus(jobId);
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === "completed" || normalizedStatus === "done") {
      let rawResults = results;
      if (!rawResults) {
        try {
          const resultRes = await quantumFetch(`/jobs/${jobId}/results`);
          if (resultRes.ok) {
            rawResults = await resultRes.json();
          }
        } catch {
          log("Could not fetch separate results endpoint, using inline results");
        }
      }

      const counts = extractCounts(rawResults);
      const populations = interpretCounts(counts);

      log(`Job ${jobId} completed — populations: [${populations.map((p) => p.toFixed(4)).join(", ")}]`);

      return {
        jobId,
        status: "completed",
        counts,
        populations,
      };
    }

    if (
      normalizedStatus === "failed" ||
      normalizedStatus === "cancelled" ||
      normalizedStatus === "error"
    ) {
      return {
        jobId,
        status: normalizedStatus,
        error: `Job ended with status: ${status}`,
      };
    }

    return {
      jobId,
      status,
    };
  } catch (err) {
    logError(`Failed to get result for job ${jobId}`, err);
    return {
      jobId,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
