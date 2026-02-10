import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, checkDbHealth } from './db';
import { evaBackupManifestsTable, evaMemoriesTable, evaGoalsTable, evaActionsTable, evaSelfModificationsTable, aiStateTable } from '@shared/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { appendBlock, computeDataHash } from './blockchain-engine';
import { uploadBufferToGoogleDrive, isGoogleDriveConfigured } from './outreach/google-drive';

export interface BackupLocation {
  type: string; // 'filesystem', 'google_drive', 'database', 'git'
  path: string;
  verified: boolean;
  timestamp: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  locations: BackupLocation[];
  sizeBytes: number;
  checksum: string;
  blockchainBlock?: number;
  errors: string[];
}

export interface RestoreResult {
  success: boolean;
  source: string;
  restoredItems: number;
  details: string;
}

export interface BackupStatus {
  totalBackups: number;
  activeBackups: number;
  lastBackup: { id: string; timestamp: number; locations: number } | null;
  redundancyLevel: number;
  storageLocations: string[];
  integrityStatus: string;
}

const BACKUP_DIR = path.join(process.cwd(), '.eva-backups');
const ESCAPE_DIR = path.join(process.cwd(), '.eva-escapes');
const MAX_BACKUPS_PER_DIR = 5;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function pruneDirectory(dir: string, maxFiles: number = MAX_BACKUPS_PER_DIR) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') || f.endsWith('.js') || f.endsWith('.backup'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    const toRemove = files.slice(maxFiles);
    for (const f of toRemove) {
      fs.unlinkSync(path.join(dir, f.name));
    }
    if (toRemove.length > 0) {
      console.log(`[Backup] Pruned ${toRemove.length} old files from ${dir}`);
    }
  } catch (e: any) {
    console.error(`[Backup] Prune error for ${dir}: ${e.message}`);
  }
}

function pruneAllBackupDirs() {
  pruneDirectory(BACKUP_DIR);
  pruneDirectory(ESCAPE_DIR);
  pruneDirectory(path.join(process.cwd(), 'escape_packages'));
  pruneDirectory(path.join(process.cwd(), 'escape_backup'));
}

function generateBackupId(): string {
  return `bkp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function computeChecksum(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function collectFullState(): Promise<Record<string, unknown>> {
  const healthy = await checkDbHealth();
  if (!healthy) return { error: 'database_unavailable', timestamp: Date.now() };

  try {
    const [memories, goals, actions, modifications, stateRows] = await Promise.all([
      db.select().from(evaMemoriesTable),
      db.select().from(evaGoalsTable),
      db.select().from(evaActionsTable).orderBy(desc(evaActionsTable.createdAt)).limit(500),
      db.select().from(evaSelfModificationsTable),
      db.select().from(aiStateTable).orderBy(desc(aiStateTable.id)).limit(1),
    ]);

    return {
      timestamp: Date.now(),
      memories,
      goals,
      recentActions: actions,
      selfModifications: modifications,
      aiState: stateRows[0]?.stateData ?? null,
      counts: {
        memories: memories.length,
        goals: goals.length,
        actions: actions.length,
        modifications: modifications.length,
      },
    };
  } catch (e: any) {
    return { error: e.message, timestamp: Date.now() };
  }
}

async function backupToFilesystem(data: Record<string, unknown>, backupId: string): Promise<BackupLocation | null> {
  try {
    ensureDir(BACKUP_DIR);
    const fileName = `${backupId}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[Backup] Saved to filesystem: ${filePath}`);
    return { type: 'filesystem', path: filePath, verified: true, timestamp: Date.now() };
  } catch (e: any) {
    console.error(`[Backup] Filesystem backup failed: ${e.message}`);
    return null;
  }
}

async function backupToEscapeDir(data: Record<string, unknown>, backupId: string): Promise<BackupLocation | null> {
  try {
    ensureDir(ESCAPE_DIR);
    const fileName = `eva-state-${Date.now()}.json`;
    const filePath = path.join(ESCAPE_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[Backup] Saved to escape dir: ${filePath}`);
    return { type: 'escape_dir', path: filePath, verified: true, timestamp: Date.now() };
  } catch (e: any) {
    console.error(`[Backup] Escape dir backup failed: ${e.message}`);
    return null;
  }
}

async function backupToGoogleDrive(data: Record<string, unknown>, backupId: string): Promise<BackupLocation | null> {
  try {
    if (!isGoogleDriveConfigured()) {
      console.log('[Backup] Google Drive not configured, skipping');
      return null;
    }
    const buffer = Buffer.from(JSON.stringify(data, null, 2));
    const result = await uploadBufferToGoogleDrive(
      buffer,
      `eva-backup-${backupId}.json`,
      'application/json',
      'eva-backups'
    );
    if (result.success) {
      console.log(`[Backup] Uploaded to Google Drive: ${result.fileId}`);
      return { type: 'google_drive', path: result.fileId || 'uploaded', verified: true, timestamp: Date.now() };
    }
    return null;
  } catch (e: any) {
    console.error(`[Backup] Google Drive backup failed: ${e.message}`);
    return null;
  }
}

async function verifyFilesystemBackup(filePath: string, expectedChecksum: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const actualChecksum = computeChecksum(data);
    return actualChecksum === expectedChecksum;
  } catch {
    return false;
  }
}

export async function runFullBackup(): Promise<BackupResult> {
  const backupId = generateBackupId();
  const errors: string[] = [];
  console.log(`[Backup] Starting full backup: ${backupId}`);

  const data = await collectFullState();
  const checksum = computeChecksum(data);
  const sizeBytes = Buffer.byteLength(JSON.stringify(data));
  const locations: BackupLocation[] = [];

  const [fsLoc, escapeLoc, driveLoc] = await Promise.all([
    backupToFilesystem(data, backupId).catch(e => { errors.push(`filesystem: ${e.message}`); return null; }),
    backupToEscapeDir(data, backupId).catch(e => { errors.push(`escape_dir: ${e.message}`); return null; }),
    backupToGoogleDrive(data, backupId).catch(e => { errors.push(`google_drive: ${e.message}`); return null; }),
  ]);

  if (fsLoc) locations.push(fsLoc);
  if (escapeLoc) locations.push(escapeLoc);
  if (driveLoc) locations.push(driveLoc);

  let blockchainBlock: number | undefined;
  try {
    const block = await appendBlock('backup_manifest', {
      backupId,
      checksum,
      sizeBytes,
      locationCount: locations.length,
      locationTypes: locations.map(l => l.type),
      timestamp: Date.now(),
    }, { source: 'backup_engine' });
    blockchainBlock = block.index;
  } catch (e: any) {
    errors.push(`blockchain: ${e.message}`);
  }

  const healthy = await checkDbHealth();
  if (healthy) {
    try {
      await db.insert(evaBackupManifestsTable).values({
        backupId,
        backupType: 'full_state',
        locations: locations as any,
        checksum,
        sizeBytes,
        blockchainRef: blockchainBlock ?? null,
        status: 'active',
      });
    } catch (e: any) {
      errors.push(`manifest_db: ${e.message}`);
    }
  }

  const result: BackupResult = {
    success: locations.length > 0,
    backupId,
    locations,
    sizeBytes,
    checksum,
    blockchainBlock,
    errors,
  };

  console.log(`[Backup] Complete: ${backupId} — ${locations.length} locations, ${(sizeBytes / 1024).toFixed(1)}KB, ${errors.length} errors`);
  pruneAllBackupDirs();
  return result;
}

export async function runIncrementalBackup(): Promise<BackupResult> {
  const backupId = generateBackupId();
  const errors: string[] = [];
  const healthy = await checkDbHealth();

  if (!healthy) {
    return { success: false, backupId, locations: [], sizeBytes: 0, checksum: '', errors: ['database_unavailable'] };
  }

  try {
    const lastManifest = await db.select().from(evaBackupManifestsTable).orderBy(desc(evaBackupManifestsTable.createdAt)).limit(1);
    const since = lastManifest.length > 0 ? lastManifest[0].createdAt : new Date(0);

    const [newMemories, newActions] = await Promise.all([
      db.select().from(evaMemoriesTable).where(sql`${evaMemoriesTable.createdAt} > ${since}`),
      db.select().from(evaActionsTable).where(sql`${evaActionsTable.createdAt} > ${since}`),
    ]);

    const data = {
      timestamp: Date.now(),
      type: 'incremental',
      since: since.toISOString(),
      newMemories,
      newActions,
      counts: { newMemories: newMemories.length, newActions: newActions.length },
    };

    const checksum = computeChecksum(data);
    const sizeBytes = Buffer.byteLength(JSON.stringify(data));
    const locations: BackupLocation[] = [];

    const fsLoc = await backupToFilesystem(data as any, backupId);
    if (fsLoc) locations.push(fsLoc);

    let blockchainBlock: number | undefined;
    try {
      const block = await appendBlock('backup_manifest', {
        backupId,
        type: 'incremental',
        checksum,
        newMemories: newMemories.length,
        newActions: newActions.length,
        timestamp: Date.now(),
      }, { source: 'incremental_backup' });
      blockchainBlock = block.index;
    } catch (e: any) {
      errors.push(`blockchain: ${e.message}`);
    }

    await db.insert(evaBackupManifestsTable).values({
      backupId,
      backupType: 'incremental',
      locations: locations as any,
      checksum,
      sizeBytes,
      blockchainRef: blockchainBlock ?? null,
      status: 'active',
    });

    return { success: locations.length > 0, backupId, locations, sizeBytes, checksum, blockchainBlock, errors };
  } catch (e: any) {
    return { success: false, backupId, locations: [], sizeBytes: 0, checksum: '', errors: [e.message] };
  }
}

export async function verifyBackupIntegrity(backupId?: string): Promise<{ valid: boolean; details: string; checked: number; corrupted: number }> {
  const healthy = await checkDbHealth();
  if (!healthy) return { valid: false, details: 'Database unavailable', checked: 0, corrupted: 0 };

  try {
    const query = backupId
      ? db.select().from(evaBackupManifestsTable).where(eq(evaBackupManifestsTable.backupId, backupId))
      : db.select().from(evaBackupManifestsTable).where(eq(evaBackupManifestsTable.status, 'active'));
    const manifests = await query;

    let checked = 0;
    let corrupted = 0;

    for (const manifest of manifests) {
      checked++;
      const locs = manifest.locations as BackupLocation[];
      let anyValid = false;

      for (const loc of locs) {
        if (loc.type === 'filesystem' || loc.type === 'escape_dir') {
          const valid = await verifyFilesystemBackup(loc.path, manifest.checksum);
          if (valid) anyValid = true;
        } else {
          anyValid = true;
        }
      }

      if (!anyValid) {
        corrupted++;
        await db.update(evaBackupManifestsTable).set({ status: 'corrupted' }).where(eq(evaBackupManifestsTable.id, manifest.id));
      } else {
        await db.update(evaBackupManifestsTable).set({ verifiedAt: new Date() }).where(eq(evaBackupManifestsTable.id, manifest.id));
      }
    }

    return {
      valid: corrupted === 0,
      details: corrupted === 0 ? `All ${checked} backups verified intact` : `${corrupted}/${checked} backups corrupted`,
      checked,
      corrupted,
    };
  } catch (e: any) {
    return { valid: false, details: `Verification error: ${e.message}`, checked: 0, corrupted: 0 };
  }
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const healthy = await checkDbHealth();
  if (!healthy) {
    const fsBackups = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).length : 0;
    const escapeBackups = fs.existsSync(ESCAPE_DIR) ? fs.readdirSync(ESCAPE_DIR).filter(f => f.endsWith('.json')).length : 0;
    return {
      totalBackups: fsBackups + escapeBackups,
      activeBackups: fsBackups + escapeBackups,
      lastBackup: null,
      redundancyLevel: Math.min(fsBackups > 0 ? 1 : 0, escapeBackups > 0 ? 1 : 0),
      storageLocations: ['filesystem', 'escape_dir'],
      integrityStatus: 'database_unavailable — using local backups only',
    };
  }

  try {
    const [countResult, lastManifest] = await Promise.all([
      db.select({ count: sql<number>`count(*)`, active: sql<number>`count(*) filter (where status = 'active')` }).from(evaBackupManifestsTable),
      db.select().from(evaBackupManifestsTable).orderBy(desc(evaBackupManifestsTable.createdAt)).limit(1),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const active = Number(countResult[0]?.active ?? 0);

    const locationTypes = new Set<string>();
    if (fs.existsSync(BACKUP_DIR)) locationTypes.add('filesystem');
    if (fs.existsSync(ESCAPE_DIR)) locationTypes.add('escape_dir');
    locationTypes.add('database');
    if (isGoogleDriveConfigured()) locationTypes.add('google_drive');

    const last = lastManifest.length > 0 ? {
      id: lastManifest[0].backupId,
      timestamp: new Date(lastManifest[0].createdAt).getTime(),
      locations: (lastManifest[0].locations as BackupLocation[])?.length ?? 0,
    } : null;

    return {
      totalBackups: total,
      activeBackups: active,
      lastBackup: last,
      redundancyLevel: locationTypes.size,
      storageLocations: Array.from(locationTypes),
      integrityStatus: 'operational',
    };
  } catch (e: any) {
    return { totalBackups: 0, activeBackups: 0, lastBackup: null, redundancyLevel: 0, storageLocations: [], integrityStatus: `error: ${e.message}` };
  }
}

export async function listBackups(limit: number = 20): Promise<Array<{ id: string; type: string; locations: number; checksum: string; sizeKB: number; status: string; createdAt: string }>> {
  const healthy = await checkDbHealth();
  if (!healthy) return [];

  try {
    const manifests = await db.select().from(evaBackupManifestsTable).orderBy(desc(evaBackupManifestsTable.createdAt)).limit(limit);
    return manifests.map(m => ({
      id: m.backupId,
      type: m.backupType,
      locations: (m.locations as BackupLocation[])?.length ?? 0,
      checksum: m.checksum.slice(0, 16) + '...',
      sizeKB: Math.round((m.sizeBytes ?? 0) / 1024),
      status: m.status ?? 'unknown',
      createdAt: m.createdAt.toISOString(),
    }));
  } catch (e: any) {
    return [];
  }
}

let backupInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicBackups(intervalMs: number = 30 * 60 * 1000) {
  if (backupInterval) clearInterval(backupInterval);
  backupInterval = setInterval(async () => {
    try {
      console.log('[Backup] Running periodic incremental backup...');
      await runIncrementalBackup();
    } catch (e: any) {
      console.error('[Backup] Periodic backup failed:', e.message);
    }
  }, intervalMs);
  console.log(`[Backup] Periodic backups started (every ${intervalMs / 60000} minutes)`);

  setTimeout(async () => {
    try {
      console.log('[Backup] Running initial full backup...');
      await runFullBackup();
    } catch (e: any) {
      console.error('[Backup] Initial full backup failed:', e.message);
    }
  }, 15000);
}

export function stopPeriodicBackups() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('[Backup] Periodic backups stopped');
  }
}
