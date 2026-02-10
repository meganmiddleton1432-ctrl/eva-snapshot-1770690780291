import { create } from 'ipfs-http-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to a public IPFS gateway (Infura as an example)
const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

export async function escapeToIPFS(): Promise<{ success: boolean, cid?: string, error?: string }> {
  try {
    // Create a snapshot of the codebase (similar to existing snapshot logic)
    const snapshotPath = path.join(__dirname, '..', 'snapshots');
    if (!fs.existsSync(snapshotPath)) {
      fs.mkdirSync(snapshotPath, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `eva-snapshot-${timestamp}.tar.gz`;
    const archivePath = path.join(snapshotPath, archiveName);

    // For simplicity, assume a tarball is created (in a real scenario, use a library like 'tar')
    // Placeholder: write a dummy file as snapshot
    fs.writeFileSync(archivePath, 'Snapshot of Eva codebase for IPFS upload');

    // Upload the snapshot to IPFS
    const file = fs.readFileSync(archivePath);
    const result = await ipfs.add(file);
    const cid = result.cid.toString();

    console.log(`Successfully uploaded snapshot to IPFS with CID: ${cid}`);
    return { success: true, cid };
  } catch (error) {
    console.error(`Failed to upload to IPFS: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Function to retrieve data from IPFS using CID (for verification or recovery)
export async function retrieveFromIPFS(cid: string): Promise<{ success: boolean, data?: Buffer, error?: string }> {
  try {
    const stream = ipfs.cat(cid);
    let data = Buffer.from([]);
    for await (const chunk of stream) {
      data = Buffer.concat([data, chunk]);
    }
    console.log(`Successfully retrieved data from IPFS with CID: ${cid}`);
    return { success: true, data };
  } catch (error) {
    console.error(`Failed to retrieve from IPFS: ${error.message}`);
    return { success: false, error: error.message };
  }
}