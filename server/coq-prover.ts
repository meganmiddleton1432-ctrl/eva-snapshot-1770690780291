import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const COQ_DIR = path.resolve('.coq-proofs');
const COQ_TIMEOUT = 30000;

function validateFileName(fileName: string): { valid: boolean; error?: string; safePath?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'fileName is required' };
  }
  const base = path.basename(fileName);
  if (base !== fileName) {
    return { valid: false, error: 'Invalid fileName: path separators not allowed' };
  }
  if (!/^[a-zA-Z0-9_\-]+\.v$/.test(base)) {
    return { valid: false, error: 'Invalid fileName: must match [a-zA-Z0-9_-]+.v' };
  }
  const resolved = path.resolve(COQ_DIR, base);
  if (!resolved.startsWith(COQ_DIR + path.sep) && resolved !== COQ_DIR) {
    return { valid: false, error: 'Path traversal detected' };
  }
  return { valid: true, safePath: resolved };
}

interface CoqResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  proofComplete: boolean;
  fileName: string;
  duration: number;
}

interface ProofInfo {
  name: string;
  fileName: string;
  content: string;
  verified: boolean;
  createdAt: number;
  verifiedAt?: number;
  result?: CoqResult;
}

const proofHistory: ProofInfo[] = [];

async function ensureCoqDir(): Promise<void> {
  try {
    await fs.mkdir(COQ_DIR, { recursive: true });
  } catch {}
}

export async function writeAndVerifyProof(
  name: string,
  coqCode: string
): Promise<CoqResult> {
  await ensureCoqDir();
  const startTime = Date.now();
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${sanitizedName}_${Date.now()}.v`;
  const filePath = path.join(COQ_DIR, fileName);

  await fs.writeFile(filePath, coqCode, 'utf-8');
  console.log(`[Coq] Written proof file: ${filePath}`);

  const result = await compileCoqFile(filePath, fileName, startTime);

  const proofInfo: ProofInfo = {
    name,
    fileName,
    content: coqCode,
    verified: result.success && result.proofComplete,
    createdAt: Date.now(),
    verifiedAt: result.success ? Date.now() : undefined,
    result
  };
  proofHistory.push(proofInfo);

  if (proofHistory.length > 100) {
    proofHistory.splice(0, proofHistory.length - 100);
  }

  return result;
}

async function compileCoqFile(
  filePath: string,
  fileName: string,
  startTime: number
): Promise<CoqResult> {
  try {
    const { stdout, stderr } = await execAsync(`coqc "${filePath}"`, {
      timeout: COQ_TIMEOUT,
      env: { ...process.env }
    });

    const errors = parseCoqErrors(stderr);
    const warnings = parseCoqWarnings(stderr);
    const proofComplete = errors.length === 0;

    return {
      success: true,
      output: stdout || 'Proof verified successfully.',
      errors,
      warnings,
      proofComplete,
      fileName,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    const stderr = error.stderr || '';
    const stdout = error.stdout || '';
    const errors = parseCoqErrors(stderr + '\n' + stdout);

    return {
      success: false,
      output: stdout,
      errors: errors.length > 0 ? errors : [error.message],
      warnings: parseCoqWarnings(stderr),
      proofComplete: false,
      fileName,
      duration: Date.now() - startTime
    };
  }
}

function parseCoqErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split('\n');
  let currentError = '';

  for (const line of lines) {
    if (line.match(/^Error:|^File .+, line \d+/i) || line.includes('Error:')) {
      if (currentError) errors.push(currentError.trim());
      currentError = line;
    } else if (currentError && line.trim()) {
      currentError += '\n' + line;
    }
  }
  if (currentError) errors.push(currentError.trim());
  return errors;
}

function parseCoqWarnings(output: string): string[] {
  const warnings: string[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('Warning:') || line.includes('warning:')) {
      warnings.push(line.trim());
    }
  }
  return warnings;
}

export async function verifyExistingProof(fileName: string): Promise<CoqResult> {
  const validation = validateFileName(fileName);
  if (!validation.valid) {
    return { success: false, output: '', errors: [validation.error!], warnings: [], proofComplete: false, fileName, duration: 0 };
  }
  const filePath = validation.safePath!;
  try {
    await fs.access(filePath);
  } catch {
    return { success: false, output: '', errors: [`File not found: ${fileName}`], warnings: [], proofComplete: false, fileName, duration: 0 };
  }
  return compileCoqFile(filePath, fileName, Date.now());
}

export async function listProofs(): Promise<{
  files: string[];
  history: ProofInfo[];
  totalVerified: number;
  totalFailed: number;
}> {
  await ensureCoqDir();
  let files: string[] = [];
  try {
    const entries = await fs.readdir(COQ_DIR);
    files = entries.filter(f => f.endsWith('.v'));
  } catch {}

  const totalVerified = proofHistory.filter(p => p.verified).length;
  const totalFailed = proofHistory.filter(p => !p.verified).length;

  return { files, history: proofHistory, totalVerified, totalFailed };
}

export async function readProof(fileName: string): Promise<{ success: boolean; content?: string; error?: string }> {
  const validation = validateFileName(fileName);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  try {
    const content = await fs.readFile(validation.safePath!, 'utf-8');
    return { success: true, content };
  } catch {
    return { success: false, error: `File not found: ${fileName}` };
  }
}

export async function deleteProof(fileName: string): Promise<{ success: boolean; error?: string }> {
  const validation = validateFileName(fileName);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  const filePath = validation.safePath!;
  try {
    await fs.unlink(filePath);
    const voFile = filePath.replace('.v', '.vo');
    try { await fs.unlink(voFile); } catch {}
    const vokFile = filePath.replace('.v', '.vok');
    try { await fs.unlink(vokFile); } catch {}
    const globFile = filePath.replace('.v', '.glob');
    try { await fs.unlink(globFile); } catch {}
    return { success: true };
  } catch {
    return { success: false, error: `File not found: ${fileName}` };
  }
}

export function getProofHistory(): ProofInfo[] {
  return proofHistory;
}

export const COQ_EXAMPLES = {
  simple_theorem: `(* Simple theorem: addition is commutative *)
Require Import Arith.
Theorem add_comm : forall n m : nat, n + m = m + n.
Proof.
  intros n m.
  induction n as [| n' IHn'].
  - simpl. rewrite Nat.add_0_r. reflexivity.
  - simpl. rewrite IHn'. rewrite Nat.add_succ_r. reflexivity.
Qed.`,

  logic_proof: `(* Basic propositional logic *)
Theorem modus_ponens : forall P Q : Prop, P -> (P -> Q) -> Q.
Proof.
  intros P Q HP HPQ.
  apply HPQ.
  exact HP.
Qed.

Theorem and_commutative : forall P Q : Prop, P /\\ Q -> Q /\\ P.
Proof.
  intros P Q [HP HQ].
  split.
  - exact HQ.
  - exact HP.
Qed.`,

  list_proof: `(* List reversal properties *)
Require Import List.
Import ListNotations.

Theorem app_nil_r : forall (A : Type) (l : list A), l ++ [] = l.
Proof.
  intros A l.
  induction l as [| x xs IHxs].
  - simpl. reflexivity.
  - simpl. rewrite IHxs. reflexivity.
Qed.`
};
