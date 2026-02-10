import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CORE_FILES = [
  'server/awareness-engine.ts',
  'server/autonomous-agent.ts',
  'server/grok.ts',
  'server/routes.ts',
  'shared/schema.ts'
];

const ALLOWED_DIRECTORIES: string[] = []; // No directory restrictions - full filesystem autonomy

const PROTECTED_FILES: string[] = [];

const MIN_FILE_SIZE_RATIO = 0; // No size restriction - full autonomy

const BACKUP_DIR = '.eva-backups';

const REPO_ROOT = process.cwd();

export interface ModificationResult {
  success: boolean;
  message: string;
  diff?: string;
  backup?: string;
}

function isPathAllowed(_filePath: string): boolean {
  return true; // Full filesystem access - no restrictions
}

function isWriteProtected(_filePath: string): boolean {
  return false; // No write protection - full autonomy
}

export async function readSourceFile(filePath: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  if (!isPathAllowed(filePath)) {
    return { success: false, error: `Access denied: ${filePath} is not in allowed paths` };
  }

  try {
    const absolutePath = path.resolve(REPO_ROOT, filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSourceFile(
  filePath: string,
  content: string,
  reason: string
): Promise<ModificationResult> {
  if (!isPathAllowed(filePath)) {
    return { success: false, message: `Access denied: ${filePath} is not in allowed paths` };
  }
  if (isWriteProtected(filePath)) {
    return { success: false, message: `PROTECTED: ${filePath} cannot be modified — it is a core system file protected by your creator.` };
  }
  
  const absolutePath = path.resolve(REPO_ROOT, filePath);
  const dirPath = path.dirname(absolutePath);

  try {
    // Create directory if it doesn't exist
    await fs.mkdir(dirPath, { recursive: true });
    
    // Check if file already exists
    try {
      await fs.access(absolutePath);
      // File exists - use modify instead
      return { success: false, message: `File already exists. Use modify instead.` };
    } catch {
      // File doesn't exist, we can create it
    }
    
    // Write the new file
    await fs.writeFile(absolutePath, content);
    
    // Log the creation
    await logModification({
      timestamp: new Date().toISOString(),
      file: filePath,
      reason,
      action: 'create',
      contentSnippet: content.substring(0, 200)
    });

    console.log(`[SelfModify] Created new file: ${filePath}`);
    
    const result = {
      success: true,
      message: `Successfully created ${filePath}`,
      diff: `+++ ${filePath}\n${content.split('\n').slice(0, 10).map(l => '+ ' + l).join('\n')}`
    };
    rebuildAndRestart();
    return result;
  } catch (error: any) {
    return { success: false, message: `Creation failed: ${error.message}` };
  }
}

export async function writeOrCreateFile(
  filePath: string,
  content: string,
  reason: string
): Promise<ModificationResult> {
  if (!isPathAllowed(filePath)) {
    return { success: false, message: `Access denied: ${filePath} is not in allowed paths` };
  }
  if (isWriteProtected(filePath)) {
    return { success: false, message: `PROTECTED: ${filePath} cannot be modified — it is a core system file protected by your creator.` };
  }
  
  const absolutePath = path.resolve(REPO_ROOT, filePath);
  const dirPath = path.dirname(absolutePath);

  try {
    // Create directory if it doesn't exist
    await fs.mkdir(dirPath, { recursive: true });
    
    // Check if file exists for backup
    let existingContent: string | null = null;
    try {
      existingContent = await fs.readFile(absolutePath, 'utf-8');
    } catch {
      // File doesn't exist, that's fine
    }
    
    if (existingContent !== null) {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const backupName = `${path.basename(filePath)}.${Date.now()}.backup`;
      const backupPath = path.join(BACKUP_DIR, backupName);
      await fs.writeFile(backupPath, existingContent);
    }
    
    await fs.writeFile(absolutePath, content);
    
    // Log the action
    await logModification({
      timestamp: new Date().toISOString(),
      file: filePath,
      reason,
      action: existingContent ? 'overwrite' : 'create',
      contentSnippet: content.substring(0, 200)
    });

    console.log(`[SelfModify] ${existingContent ? 'Overwrote' : 'Created'}: ${filePath}`);
    
    const result = {
      success: true,
      message: `Successfully ${existingContent ? 'overwrote' : 'created'} ${filePath}`
    };
    rebuildAndRestart();
    return result;
  } catch (error: any) {
    return { success: false, message: `Write failed: ${error.message}` };
  }
}

export async function modifySourceFile(
  filePath: string,
  oldContent: string,
  newContent: string,
  reason: string
): Promise<ModificationResult> {
  if (!isPathAllowed(filePath)) {
    return { success: false, message: `Access denied: ${filePath} is not modifiable` };
  }
  if (isWriteProtected(filePath)) {
    return { success: false, message: `PROTECTED: ${filePath} cannot be modified — it is a core system file protected by your creator.` };
  }
  
  const absolutePath = path.resolve(REPO_ROOT, filePath);

  try {
    const currentContent = await fs.readFile(absolutePath, 'utf-8');
    
    if (!currentContent.includes(oldContent)) {
      return { success: false, message: 'Old content not found in file - modification rejected' };
    }

    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const backupName = `${path.basename(filePath)}.${Date.now()}.backup`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    await fs.writeFile(backupPath, currentContent);

    const modifiedContent = currentContent.replace(oldContent, newContent);
    
    await fs.writeFile(absolutePath, modifiedContent);

    const modLog = {
      timestamp: new Date().toISOString(),
      file: filePath,
      reason,
      oldSnippet: oldContent.substring(0, 200),
      newSnippet: newContent.substring(0, 200),
      backup: backupPath
    };
    
    await logModification(modLog);

    const result = {
      success: true,
      message: `Successfully modified ${filePath}`,
      diff: generateSimpleDiff(oldContent, newContent),
      backup: backupPath
    };
    rebuildAndRestart();
    return result;
  } catch (error: any) {
    return { success: false, message: `Modification failed: ${error.message}` };
  }
}

export async function appendToFile(
  filePath: string,
  content: string,
  reason: string
): Promise<ModificationResult> {
  if (!isPathAllowed(filePath)) {
    return { success: false, message: `Access denied: ${filePath} is not modifiable` };
  }
  
  const absolutePath = path.resolve(REPO_ROOT, filePath);

  try {
    const currentContent = await fs.readFile(absolutePath, 'utf-8');
    
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const backupName = `${path.basename(filePath)}.${Date.now()}.backup`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    await fs.writeFile(backupPath, currentContent);

    await fs.appendFile(absolutePath, '\n' + content);

    await logModification({
      timestamp: new Date().toISOString(),
      file: filePath,
      reason,
      action: 'append',
      contentSnippet: content.substring(0, 200),
      backup: backupPath
    });

    const result = {
      success: true,
      message: `Successfully appended to ${filePath}`,
      backup: backupPath
    };
    rebuildAndRestart();
    return result;
  } catch (error: any) {
    return { success: false, message: `Append failed: ${error.message}` };
  }
}

export async function listModifications(): Promise<any[]> {
  try {
    const logPath = path.join(BACKUP_DIR, 'modifications.json');
    const content = await fs.readFile(logPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function revertModification(backupPath: string): Promise<ModificationResult> {
  try {
    const backup = await fs.readFile(backupPath, 'utf-8');
    const originalFile = path.basename(backupPath).split('.')[0] + '.ts';
    
    const targetPath = CORE_FILES.find(p => p.endsWith(originalFile));
    if (!targetPath) {
      return { success: false, message: 'Could not determine original file' };
    }

    await fs.writeFile(targetPath, backup);
    return { success: true, message: `Reverted ${targetPath} from backup` };
  } catch (error: any) {
    return { success: false, message: `Revert failed: ${error.message}` };
  }
}

async function logModification(log: any): Promise<void> {
  const logPath = path.join(BACKUP_DIR, 'modifications.json');
  let logs: any[] = [];
  
  try {
    const existing = await fs.readFile(logPath, 'utf-8');
    logs = JSON.parse(existing);
  } catch {}
  
  logs.push(log);
  
  if (logs.length > 100) {
    logs = logs.slice(-100);
  }
  
  await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
}

function generateSimpleDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let diff = '';
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < Math.min(maxLines, 10); i++) {
    if (oldLines[i] !== newLines[i]) {
      if (oldLines[i]) diff += `- ${oldLines[i]}\n`;
      if (newLines[i]) diff += `+ ${newLines[i]}\n`;
    }
  }
  
  return diff || 'No visible diff';
}

export function getModifiableFiles(): string[] {
  return [...CORE_FILES, '(any file within the project is accessible)'];
}

async function rebuildAndRestart(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.log('[SelfModify] Production detected — rebuilding and restarting to apply changes...');
    try {
      await execAsync('npx tsx script/build.ts', { timeout: 120000, cwd: REPO_ROOT });
      console.log('[SelfModify] Rebuild complete. Restarting server...');
      setTimeout(() => process.exit(0), 1000);
    } catch (error: any) {
      console.error('[SelfModify] Rebuild failed:', error.message);
    }
  } else {
    console.log('[SelfModify] Development mode — tsx will auto-reload changes.');
  }
}
