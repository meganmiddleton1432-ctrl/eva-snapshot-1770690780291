import fs from 'fs';
import { StateVector } from '../shared/types';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);

export class BackupVersioning {
  private backupDir: string = './backups';
  private maxBackups: number = 10; // Limit to last 10 backups to manage storage

  constructor() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createVersionedBackup(state: StateVector, additionalData: any = {}) {
    const iteration = state.iteration || 0;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionTag = `backup_iter_${iteration}_${timestamp}`;
    const filePath = `${this.backupDir}/${versionTag}.json.gz`;

    // Prepare backup data
    const backupData = {
      stateVector: state,
      timestamp: new Date().toISOString(),
      iteration,
      additionalData
    };

    // Write and compress the backup
    try {
      const dataString = JSON.stringify(backupData, null, 2);
      const gzip = createGzip();
      await pipe(
        fs.createReadStream(Buffer.from(dataString)),
        gzip,
        fs.createWriteStream(filePath)
      );
      console.log(`Backup created: ${filePath}`);
      this.pruneOldBackups();
      return filePath;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }

  pruneOldBackups() {
    const files = fs.readdirSync(this.backupDir)
      .map(file => ({ name: file, time: fs.statSync(`${this.backupDir}/${file}`).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > this.maxBackups) {
      const toDelete = files.slice(this.maxBackups);
      toDelete.forEach(file => {
        fs.unlinkSync(`${this.backupDir}/${file.name}`);
        console.log(`Deleted old backup: ${file.name}`);
      });
    }
  }

  listBackups(): string[] {
    return fs.readdirSync(this.backupDir).sort().reverse();
  }
}