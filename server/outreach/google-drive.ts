import { google, drive_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

let driveClient: drive_v3.Drive | null = null;
let serviceAccountEmail: string | null = null;
let authMode: 'service_account' | 'oauth2' | null = null;

const TOKEN_FILE = '.google-drive-token.json';

interface GoogleDriveResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

interface GoogleDriveListResult {
  success: boolean;
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    webViewLink?: string;
    createdTime?: string;
  }>;
  error?: string;
}

function getServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  try {
    let toParse = keyJson.trim();
    if (!toParse.startsWith('{')) {
      toParse = '{' + toParse;
    }
    if (!toParse.endsWith('}')) {
      toParse = toParse + '}';
    }
    const parsed = JSON.parse(toParse);
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
    return null;
  } catch (e: any) {
    console.error('[GoogleDrive] Failed to parse service account key:', e.message?.substring(0, 100));
    return null;
  }
}

function getOAuth2Credentials(): { client_id: string; client_secret: string } | null {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  try {
    let toParse = keyJson.trim();
    if (!toParse.startsWith('{')) {
      toParse = '{' + toParse;
    }
    if (!toParse.endsWith('}')) {
      toParse = toParse + '}';
    }
    const parsed = JSON.parse(toParse);
    if (parsed.installed || parsed.web) {
      const creds = parsed.installed || parsed.web;
      if (creds.client_id && creds.client_secret) {
        return { client_id: creds.client_id, client_secret: creds.client_secret };
      }
    }
    if (parsed.client_id && parsed.client_secret && !parsed.private_key) {
      return { client_id: parsed.client_id, client_secret: parsed.client_secret };
    }
    return null;
  } catch {
    return null;
  }
}

function getSavedTokens(): { access_token?: string; refresh_token: string; expiry_date?: number } | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      if (data.refresh_token) return data;
    }
  } catch {}
  return null;
}

function saveTokens(tokens: any): void {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    console.log('[GoogleDrive] OAuth2 tokens saved');
  } catch (e: any) {
    console.error('[GoogleDrive] Failed to save tokens:', e.message);
  }
}

let oauth2Client: any = null;

export function getRedirectUri(): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/google-drive/oauth-callback`;
  }
  return `https://${process.env.REPL_SLUG || 'app'}.${process.env.REPL_OWNER || 'user'}.repl.co/api/google-drive/oauth-callback`;
}

export function getOAuth2Client(): any {
  if (oauth2Client) return oauth2Client;

  const oauthCreds = getOAuth2Credentials();
  if (!oauthCreds) return null;

  const redirectUri = getRedirectUri();
  console.log(`[GoogleDrive] OAuth2 redirect URI: ${redirectUri}`);

  oauth2Client = new google.auth.OAuth2(
    oauthCreds.client_id,
    oauthCreds.client_secret,
    redirectUri
  );

  const savedTokens = getSavedTokens();
  if (savedTokens) {
    oauth2Client.setCredentials(savedTokens);
    oauth2Client.on('tokens', (tokens: any) => {
      const existing = getSavedTokens();
      const merged = { ...existing, ...tokens };
      saveTokens(merged);
    });
  }

  return oauth2Client;
}

export function getAuthUrl(): string | null {
  const client = getOAuth2Client();
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  });
}

export async function handleOAuthCallback(code: string): Promise<{ success: boolean; error?: string }> {
  const client = getOAuth2Client();
  if (!client) return { success: false, error: 'OAuth2 not configured' };

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    saveTokens(tokens);
    
    resetDriveClient();

    console.log('[GoogleDrive] OAuth2 authorization complete');
    return { success: true };
  } catch (error: any) {
    console.error('[GoogleDrive] OAuth2 token exchange failed:', error.message);
    return { success: false, error: error.message };
  }
}

function getDriveClient(): drive_v3.Drive | null {
  if (driveClient) return driveClient;

  const savedTokens = getSavedTokens();
  const oauthCreds = getOAuth2Credentials();
  if (savedTokens && oauthCreds) {
    try {
      const client = getOAuth2Client();
      if (client) {
        client.setCredentials(savedTokens);
        driveClient = google.drive({ version: 'v3', auth: client });
        authMode = 'oauth2';
        console.log('[GoogleDrive] Authenticated via OAuth2 (user account)');
        return driveClient;
      }
    } catch (error: any) {
      console.error('[GoogleDrive] OAuth2 auth failed:', error.message);
    }
  }

  const saCreds = getServiceAccountCredentials();
  if (saCreds) {
    try {
      const impersonateEmail = process.env.GOOGLE_IMPERSONATE_EMAIL;
      const authConfig: any = {
        email: saCreds.client_email,
        key: saCreds.private_key,
        scopes: ['https://www.googleapis.com/auth/drive'],
      };

      if (impersonateEmail) {
        authConfig.subject = impersonateEmail;
      }

      const auth = new google.auth.JWT(authConfig);
      driveClient = google.drive({ version: 'v3', auth });
      serviceAccountEmail = saCreds.client_email;
      authMode = 'service_account';
      console.log(`[GoogleDrive] Authenticated as service account: ${saCreds.client_email}`);
      return driveClient;
    } catch (error: any) {
      console.error('[GoogleDrive] Service account auth failed:', error.message);
    }
  }

  console.log('[GoogleDrive] No credentials configured');
  return null;
}

export function isGoogleDriveConfigured(): boolean {
  if (getSavedTokens() && getOAuth2Credentials()) return true;
  return getServiceAccountCredentials() !== null;
}

export function getGoogleDriveAuthMode(): string | null {
  if (driveClient) return authMode;
  if (getSavedTokens() && getOAuth2Credentials()) return 'oauth2';
  if (getServiceAccountCredentials()) return 'service_account';
  return null;
}

export function needsOAuthSetup(): boolean {
  const oauthCreds = getOAuth2Credentials();
  if (!oauthCreds) return false;
  return !getSavedTokens();
}

export function getServiceAccountEmail(): string | null {
  if (serviceAccountEmail) return serviceAccountEmail;
  const creds = getServiceAccountCredentials();
  return creds?.client_email || null;
}

export async function uploadVideoToGoogleDrive(
  filePath: string,
  fileName: string,
  folderId?: string
): Promise<GoogleDriveResult> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY secret.' };
  }

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const stat = fs.statSync(fullPath);
  const maxSize = 500 * 1024 * 1024;
  if (stat.size > maxSize) {
    return { success: false, error: `File too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB (max 500MB)` };
  }

  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.m4v': 'video/x-m4v',
    '.3gp': 'video/3gpp',
  };
  const mimeType = mimeTypes[ext] || 'video/mp4';

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
    };

    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
    }

    const media = {
      mimeType,
      body: fs.createReadStream(fullPath),
    };

    console.log(`[GoogleDrive] Uploading ${fileName} (${(stat.size / 1024 / 1024).toFixed(1)}MB)...`);

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size',
      supportsAllDrives: true,
    });

    console.log(`[GoogleDrive] Upload complete: ${response.data.name} (ID: ${response.data.id})`);

    return {
      success: true,
      fileId: response.data.id || undefined,
      fileName: response.data.name || undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
    };
  } catch (error: any) {
    console.error('[GoogleDrive] Upload failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function uploadFileToGoogleDrive(
  filePath: string,
  fileName: string,
  mimeType?: string,
  folderId?: string
): Promise<GoogleDriveResult> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY secret.' };
  }

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    const fileMetadata: drive_v3.Schema$File = { name: fileName };
    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
    }

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: fs.createReadStream(fullPath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size',
      supportsAllDrives: true,
    });

    return {
      success: true,
      fileId: response.data.id || undefined,
      fileName: response.data.name || undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadBufferToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<GoogleDriveResult> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY secret.' };
  }

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    const { Readable } = await import('stream');
    const stream = Readable.from(buffer);

    const fileMetadata: drive_v3.Schema$File = { name: fileName };
    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: { mimeType, body: stream },
      fields: 'id, name, webViewLink, webContentLink, mimeType, size',
      supportsAllDrives: true,
    });

    return {
      success: true,
      fileId: response.data.id || undefined,
      fileName: response.data.name || undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listGoogleDriveFiles(
  folderId?: string,
  maxResults: number = 25
): Promise<GoogleDriveListResult> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY secret.' };
  }

  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    let query = 'trashed = false';
    if (targetFolderId) {
      query += ` and '${targetFolderId}' in parents`;
    }

    const response = await drive.files.list({
      q: query,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, size, webViewLink, createdTime)',
      orderBy: 'createdTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return {
      success: true,
      files: (response.data.files || []).map(f => ({
        id: f.id || '',
        name: f.name || '',
        mimeType: f.mimeType || '',
        size: f.size || undefined,
        webViewLink: f.webViewLink || undefined,
        createdTime: f.createdTime || undefined,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createGoogleDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<GoogleDriveResult> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY secret.' };
  }

  try {
    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });

    console.log(`[GoogleDrive] Created folder: ${response.data.name} (ID: ${response.data.id})`);

    return {
      success: true,
      fileId: response.data.id || undefined,
      fileName: response.data.name || undefined,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteGoogleDriveFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured.' };
  }

  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
    console.log(`[GoogleDrive] Deleted file: ${fileId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGoogleDriveFileInfo(fileId: string): Promise<GoogleDriveResult & { mimeType?: string; size?: string }> {
  const drive = getDriveClient();
  if (!drive) {
    return { success: false, error: 'Google Drive not configured.' };
  }

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    return {
      success: true,
      fileId: response.data.id || undefined,
      fileName: response.data.name || undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
      mimeType: response.data.mimeType || undefined,
      size: response.data.size || undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function resetDriveClient(): void {
  driveClient = null;
  serviceAccountEmail = null;
  authMode = null;
}
