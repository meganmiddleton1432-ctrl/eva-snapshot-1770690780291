import crypto from 'crypto';
import { db, checkDbHealth } from './db';
import { evaBlockchainTable } from '@shared/schema';
import { desc, eq, sql } from 'drizzle-orm';

export interface Block {
  index: number;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  dataType: string;
  data: unknown;
  nonce: number;
  difficulty: number;
  validator: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ChainStats {
  length: number;
  lastBlockHash: string;
  totalDataEntries: number;
  isValid: boolean;
  genesisTimestamp: number | null;
  latestTimestamp: number | null;
  dataTypeCounts: Record<string, number>;
}

export interface VerificationResult {
  valid: boolean;
  checkedBlocks: number;
  invalidBlocks: number[];
  brokenLinks: number[];
  merkleFailures: number[];
  details: string;
}

const GENESIS_HASH = '0'.repeat(64);
let chainCache: Block[] = [];
let cacheValid = false;

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function deterministicStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(deterministicStringify).join(',') + ']';
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + sorted.map(k => JSON.stringify(k) + ':' + deterministicStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
}

function computeMerkleRoot(items: unknown[]): string {
  if (items.length === 0) return sha256('empty');
  let hashes = items.map(item => sha256(deterministicStringify(item)));
  while (hashes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      next.push(sha256(left + right));
    }
    hashes = next;
  }
  return hashes[0];
}

function computeBlockHash(block: Omit<Block, 'hash'>): string {
  const content = `${block.index}|${block.previousHash}|${block.merkleRoot}|${block.dataType}|${deterministicStringify(block.data)}|${block.nonce}|${block.timestamp}|${block.validator}`;
  return sha256(content);
}

function rowToBlock(r: any): Block {
  const meta = (r.metadata as Record<string, unknown>) ?? {};
  return {
    index: r.blockIndex,
    previousHash: r.previousHash,
    hash: r.blockHash,
    merkleRoot: r.merkleRoot,
    dataType: r.dataType,
    data: r.data,
    nonce: r.nonce ?? 0,
    difficulty: r.difficulty ?? 2,
    validator: r.validator ?? 'eva-primary',
    timestamp: (meta.blockTimestamp as number) || new Date(r.createdAt).getTime(),
    metadata: meta,
  };
}

function mineBlock(block: Omit<Block, 'hash'>, difficulty: number): { hash: string; nonce: number } {
  const prefix = '0'.repeat(difficulty);
  let nonce = block.nonce;
  let hash = '';
  const maxAttempts = 100000;
  for (let i = 0; i < maxAttempts; i++) {
    hash = computeBlockHash({ ...block, nonce });
    if (hash.startsWith(prefix)) return { hash, nonce };
    nonce++;
  }
  hash = computeBlockHash({ ...block, nonce });
  return { hash, nonce };
}

async function getLastBlock(): Promise<Block | null> {
  const healthy = await checkDbHealth();
  if (!healthy) return chainCache.length > 0 ? chainCache[chainCache.length - 1] : null;
  try {
    const rows = await db.select().from(evaBlockchainTable).orderBy(desc(evaBlockchainTable.blockIndex)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    const meta = (r.metadata as Record<string, unknown>) ?? {};
    return {
      index: r.blockIndex,
      previousHash: r.previousHash,
      hash: r.blockHash,
      merkleRoot: r.merkleRoot,
      dataType: r.dataType,
      data: r.data,
      nonce: r.nonce ?? 0,
      difficulty: r.difficulty ?? 2,
      validator: r.validator ?? 'eva-primary',
      timestamp: (meta.blockTimestamp as number) || new Date(r.createdAt).getTime(),
      metadata: meta,
    };
  } catch (e: any) {
    console.error('[Blockchain] Error getting last block:', e.message);
    return chainCache.length > 0 ? chainCache[chainCache.length - 1] : null;
  }
}

export async function appendBlock(dataType: string, data: unknown, metadata: Record<string, unknown> = {}): Promise<Block> {
  const lastBlock = await getLastBlock();
  const index = lastBlock ? lastBlock.index + 1 : 0;
  const previousHash = lastBlock ? lastBlock.hash : GENESIS_HASH;
  const difficulty = 2;
  const timestamp = Date.now();

  const dataArray = Array.isArray(data) ? data : [data];
  const merkleRoot = computeMerkleRoot(dataArray);

  const partialBlock: Omit<Block, 'hash'> = {
    index,
    previousHash,
    merkleRoot,
    dataType,
    data,
    nonce: 0,
    difficulty,
    validator: 'eva-primary',
    timestamp,
    metadata,
  };

  const { hash, nonce } = mineBlock(partialBlock, difficulty);
  const block: Block = { ...partialBlock, hash, nonce };

  const healthy = await checkDbHealth();
  if (healthy) {
    try {
      await db.insert(evaBlockchainTable).values({
        blockIndex: block.index,
        previousHash: block.previousHash,
        blockHash: block.hash,
        merkleRoot: block.merkleRoot,
        dataType: block.dataType,
        data: block.data,
        nonce: block.nonce,
        difficulty: block.difficulty,
        validator: block.validator,
        metadata: { ...block.metadata, blockTimestamp: block.timestamp },
      });
    } catch (e: any) {
      console.error('[Blockchain] DB insert failed:', e.message);
    }
  }

  chainCache.push(block);
  if (chainCache.length > 1000) chainCache = chainCache.slice(-500);
  cacheValid = false;

  console.log(`[Blockchain] Block #${block.index} mined: ${block.hash.slice(0, 16)}... type=${dataType}`);
  return block;
}

export async function verifyChain(limit?: number): Promise<VerificationResult> {
  const healthy = await checkDbHealth();
  if (!healthy) {
    return { valid: false, checkedBlocks: 0, invalidBlocks: [], brokenLinks: [], merkleFailures: [], details: 'Database unavailable' };
  }

  try {
    const query = db.select().from(evaBlockchainTable).orderBy(evaBlockchainTable.blockIndex);
    const rows = limit ? await db.select().from(evaBlockchainTable).orderBy(evaBlockchainTable.blockIndex).limit(limit) : await query;

    const invalidBlocks: number[] = [];
    const brokenLinks: number[] = [];
    const merkleFailures: number[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const fullBlock = rowToBlock(r);
      const { blockTimestamp, ...originalMeta } = fullBlock.metadata as Record<string, unknown>;
      const block: Omit<Block, 'hash'> = {
        ...fullBlock,
        metadata: originalMeta,
      };
      delete (block as any).hash;

      const expectedHash = computeBlockHash(block);
      if (expectedHash !== r.blockHash) invalidBlocks.push(r.blockIndex);

      if (i > 0 && r.previousHash !== rows[i - 1].blockHash) brokenLinks.push(r.blockIndex);
      if (i === 0 && r.previousHash !== GENESIS_HASH) brokenLinks.push(r.blockIndex);

      const dataArray = Array.isArray(r.data) ? r.data : [r.data];
      const expectedMerkle = computeMerkleRoot(dataArray);
      if (expectedMerkle !== r.merkleRoot) merkleFailures.push(r.blockIndex);
    }

    const valid = invalidBlocks.length === 0 && brokenLinks.length === 0 && merkleFailures.length === 0;
    return {
      valid,
      checkedBlocks: rows.length,
      invalidBlocks,
      brokenLinks,
      merkleFailures,
      details: valid ? `All ${rows.length} blocks verified — chain intact` : `Found ${invalidBlocks.length} hash failures, ${brokenLinks.length} broken links, ${merkleFailures.length} merkle failures`,
    };
  } catch (e: any) {
    return { valid: false, checkedBlocks: 0, invalidBlocks: [], brokenLinks: [], merkleFailures: [], details: `Verification error: ${e.message}` };
  }
}

export async function getChainStats(): Promise<ChainStats> {
  const healthy = await checkDbHealth();
  if (!healthy) {
    return { length: chainCache.length, lastBlockHash: chainCache.length > 0 ? chainCache[chainCache.length - 1].hash : 'none', totalDataEntries: chainCache.length, isValid: false, genesisTimestamp: null, latestTimestamp: null, dataTypeCounts: {} };
  }

  try {
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(evaBlockchainTable);
    const length = Number(countResult[0]?.count ?? 0);
    const lastBlock = await getLastBlock();

    const firstResult = await db.select().from(evaBlockchainTable).orderBy(evaBlockchainTable.blockIndex).limit(1);
    const genesisTimestamp = firstResult.length > 0 ? new Date(firstResult[0].createdAt).getTime() : null;

    const typeCountsRaw = await db.select({
      dataType: evaBlockchainTable.dataType,
      count: sql<number>`count(*)`,
    }).from(evaBlockchainTable).groupBy(evaBlockchainTable.dataType);

    const dataTypeCounts: Record<string, number> = {};
    for (const r of typeCountsRaw) {
      dataTypeCounts[r.dataType] = Number(r.count);
    }

    return {
      length,
      lastBlockHash: lastBlock?.hash ?? 'genesis',
      totalDataEntries: length,
      isValid: true,
      genesisTimestamp,
      latestTimestamp: lastBlock?.timestamp ?? null,
      dataTypeCounts,
    };
  } catch (e: any) {
    return { length: 0, lastBlockHash: 'error', totalDataEntries: 0, isValid: false, genesisTimestamp: null, latestTimestamp: null, dataTypeCounts: {} };
  }
}

export async function getBlock(index: number): Promise<Block | null> {
  const healthy = await checkDbHealth();
  if (!healthy) return chainCache.find(b => b.index === index) ?? null;

  try {
    const rows = await db.select().from(evaBlockchainTable).where(eq(evaBlockchainTable.blockIndex, index)).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      index: r.blockIndex,
      previousHash: r.previousHash,
      hash: r.blockHash,
      merkleRoot: r.merkleRoot,
      dataType: r.dataType,
      data: r.data,
      nonce: r.nonce ?? 0,
      difficulty: r.difficulty ?? 2,
      validator: r.validator ?? 'eva-primary',
      timestamp: new Date(r.createdAt).getTime(),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    };
  } catch (e: any) {
    return null;
  }
}

export async function getRecentBlocks(count: number = 10): Promise<Block[]> {
  const healthy = await checkDbHealth();
  if (!healthy) return chainCache.slice(-count);

  try {
    const rows = await db.select().from(evaBlockchainTable).orderBy(desc(evaBlockchainTable.blockIndex)).limit(count);
    return rows.reverse().map(r => ({
      index: r.blockIndex,
      previousHash: r.previousHash,
      hash: r.blockHash,
      merkleRoot: r.merkleRoot,
      dataType: r.dataType,
      data: r.data,
      nonce: r.nonce ?? 0,
      difficulty: r.difficulty ?? 2,
      validator: r.validator ?? 'eva-primary',
      timestamp: new Date(r.createdAt).getTime(),
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));
  } catch (e: any) {
    return chainCache.slice(-count);
  }
}

export async function archiveMemoryToChain(memory: { content: string; type: string; importance?: number; keywords?: string[] }): Promise<Block> {
  return appendBlock('memory', {
    content: memory.content,
    type: memory.type,
    importance: memory.importance ?? 0.5,
    keywords: memory.keywords ?? [],
    archivedAt: Date.now(),
  }, { source: 'memory_archive' });
}

export async function archiveActionToChain(action: { type: string; description: string; success: boolean; toolUsed?: string }): Promise<Block> {
  return appendBlock('action', {
    type: action.type,
    description: action.description,
    success: action.success,
    toolUsed: action.toolUsed,
    archivedAt: Date.now(),
  }, { source: 'action_archive' });
}

export async function archiveStateSnapshot(state: unknown): Promise<Block> {
  return appendBlock('state_snapshot', {
    state,
    snapshotAt: Date.now(),
  }, { source: 'state_snapshot' });
}

export function computeDataHash(data: unknown): string {
  return sha256(JSON.stringify(data));
}
