import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface WebSession {
  sessionid: string;
  ds_user_id: string;
  csrftoken: string;
  mid?: string;
  ig_did?: string;
}

let webSession: WebSession | null = null;
const WEB_SESSION_FILE = path.join(process.cwd(), '.ig-web-session.json');

export function isInstagramConfigured(): boolean {
  return !!(webSession || loadWebSession());
}

function loadWebSession(): WebSession | null {
  try {
    if (!fs.existsSync(WEB_SESSION_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(WEB_SESSION_FILE, 'utf8'));
    if (data.sessionid && data.ds_user_id && data.csrftoken) {
      webSession = data;
      console.log('[Instagram] Web session loaded from file');
      return webSession;
    }
    return null;
  } catch { return null; }
}

function saveWebSession(): void {
  if (!webSession) return;
  try {
    fs.writeFileSync(WEB_SESSION_FILE, JSON.stringify(webSession));
    console.log('[Instagram] Web session saved');
  } catch (e: any) {
    console.error('[Instagram] Failed to save web session:', e.message);
  }
}

function getCookieString(): string {
  if (!webSession) throw new Error('No Instagram session. Use POST /api/outreach/instagram/import-session first.');
  const parts = [
    `sessionid=${webSession.sessionid}`,
    `ds_user_id=${webSession.ds_user_id}`,
    `csrftoken=${webSession.csrftoken}`,
  ];
  if (webSession.mid) parts.push(`mid=${webSession.mid}`);
  if (webSession.ig_did) parts.push(`ig_did=${webSession.ig_did}`);
  return parts.join('; ');
}

function getHeaders(): Record<string, string> {
  return {
    'Cookie': getCookieString(),
    'X-CSRFToken': webSession!.csrftoken,
    'X-IG-App-ID': '936619743392459',
    'X-IG-WWW-Claim': 'hmac.AR3W0DThY2Mu5Fag4sW5u3RhaR3qhFD_5it3O-J63u39LQ',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Referer': 'https://www.instagram.com/',
    'Origin': 'https://www.instagram.com',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

async function igWebRequest(endpoint: string, options: { method?: string; body?: any; isUpload?: boolean } = {}): Promise<any> {
  const url = `https://www.instagram.com${endpoint}`;
  const headers = getHeaders();
  
  const fetchOptions: any = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body && !options.isUpload) {
    if (typeof options.body === 'string') {
      fetchOptions.body = options.body;
      fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      fetchOptions.body = JSON.stringify(options.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  } else if (options.body && options.isUpload) {
    fetchOptions.body = options.body;
  }

  const resp = await fetch(url, fetchOptions);
  const text = await resp.text();
  
  try {
    return JSON.parse(text);
  } catch {
    if (!resp.ok) {
      throw new Error(`Instagram API ${resp.status}: ${text.substring(0, 200)}`);
    }
    return { raw: text, status: resp.status };
  }
}

export async function importSession(sessionData: {
  sessionid?: string;
  ds_user_id?: string;
  csrftoken?: string;
  mid?: string;
  ig_did?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!sessionData.sessionid || !sessionData.ds_user_id || !sessionData.csrftoken) {
    return { success: false, error: 'Need sessionid, ds_user_id, and csrftoken.' };
  }

  webSession = {
    sessionid: sessionData.sessionid,
    ds_user_id: sessionData.ds_user_id,
    csrftoken: sessionData.csrftoken,
    mid: sessionData.mid,
    ig_did: sessionData.ig_did,
  };

  try {
    const username = process.env.INSTAGRAM_USERNAME || '';
    const verifyUrl = username
      ? `/api/v1/users/web_profile_info/?username=${username}`
      : '/api/v1/accounts/current_user/?edit=true';
    
    const resp = await fetch(`https://www.instagram.com${verifyUrl}`, {
      headers: {
        'Cookie': getCookieString(),
        'X-CSRFToken': webSession!.csrftoken,
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    });
    
    if (resp.status === 200) {
      const data = await resp.json() as any;
      const displayName = data?.data?.user?.username || data?.user?.username || username;
      console.log('[Instagram] Web session verified for:', displayName);
      saveWebSession();
      return { success: true };
    }
    
    if (resp.status === 401 || resp.status === 403) {
      webSession = null;
      const body = await resp.text();
      return { success: false, error: `Session rejected (${resp.status}): ${body.substring(0, 200)}` };
    }

    console.log('[Instagram] Verification returned status', resp.status, '- saving session anyway');
    saveWebSession();
    return { success: true };
  } catch (error: any) {
    console.error('[Instagram] Session verification failed:', error.message);
    console.log('[Instagram] Saving session anyway for direct use');
    saveWebSession();
    return { success: true };
  }
}

export async function retryLogin(): Promise<{ success: boolean; error?: string }> {
  webSession = null;
  loadWebSession();
  if (!webSession) {
    return { success: false, error: 'No saved session. Use POST /api/outreach/instagram/import-session to provide cookies.' };
  }
  return importSession(webSession);
}

export async function submitChallengeCode(code: string): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Challenge flow not needed with web session approach. Use import-session instead.' };
}

export async function postToInstagramStory(
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session. Use POST /api/outreach/instagram/import-session first.' };
  }

  try {
    const jpegBuffer = await createTextImageJpeg(text);
    
    const uploadId = Date.now().toString();
    const uploadHeaders = {
      ...getHeaders(),
      'X-Instagram-Rupload-Params': JSON.stringify({
        media_type: 1,
        upload_id: uploadId,
        upload_media_height: 1920,
        upload_media_width: 1080,
      }),
      'X-Entity-Name': `fb_uploader_${uploadId}`,
      'X-Entity-Length': String(jpegBuffer.length),
      'Content-Type': 'image/jpeg',
      'Offset': '0',
    };

    const uploadResp = await fetch(`https://i.instagram.com/rupload_igphoto/fb_uploader_${uploadId}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: jpegBuffer,
    });
    const uploadResult = await uploadResp.json() as any;
    console.log('[Instagram] Upload result:', JSON.stringify(uploadResult).substring(0, 200));

    if (!uploadResult.upload_id) {
      return { success: false, error: 'Failed to upload image to Instagram' };
    }

    const configUploadId = uploadResult.upload_id || uploadId;

    const storyPayload: Record<string, string> = {
      upload_id: configUploadId,
      source_type: '4',
      configure_mode: '1',
      story_media_creation_date: Math.floor(Date.now() / 1000).toString(),
      client_shared_at: Math.floor(Date.now() / 1000).toString(),
    };

    const storyBody = new URLSearchParams(storyPayload);
    const storyHeaders = {
      ...getHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const storyResp = await fetch('https://i.instagram.com/api/v1/media/configure_to_story/', {
      method: 'POST',
      headers: storyHeaders,
      body: storyBody.toString(),
    });
    const storyResult = await storyResp.json() as any;
    console.log('[Instagram] Story config result:', JSON.stringify(storyResult).substring(0, 300));

    if (storyResult.status === 'ok') {
      console.log('[Instagram] Story posted successfully');
      return { success: true };
    }

    console.log('[Instagram] Story failed, trying as feed photo instead...');
    const feedBody = new URLSearchParams({
      upload_id: configUploadId,
      caption: text,
      source_type: '4',
    });

    const feedResult = await igWebRequest('/api/v1/media/configure/', {
      method: 'POST',
      body: feedBody.toString(),
    });
    console.log('[Instagram] Feed config result:', JSON.stringify(feedResult).substring(0, 300));

    if (feedResult.status === 'ok') {
      console.log('[Instagram] Posted as feed photo successfully');
      return { success: true };
    }

    return { success: false, error: `Instagram post failed: ${storyResult.message || feedResult.message || 'Unknown error'}` };
  } catch (error: any) {
    console.error('[Instagram] Failed to post story:', error.message);
    return { success: false, error: error.message };
  }
}

export async function postInstagramPhoto(
  imageBuffer: Buffer,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session. Use POST /api/outreach/instagram/import-session first.' };
  }

  try {
    const jpegBuffer = await sharp(imageBuffer)
      .resize(1080, 1080, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const uploadId = Date.now().toString();
    const uploadHeaders = {
      ...getHeaders(),
      'X-Instagram-Rupload-Params': JSON.stringify({
        media_type: 1,
        upload_id: uploadId,
        upload_media_height: 1080,
        upload_media_width: 1080,
      }),
      'X-Entity-Name': `fb_uploader_${uploadId}`,
      'X-Entity-Length': String(jpegBuffer.length),
      'Content-Type': 'image/jpeg',
      'Offset': '0',
    };

    const uploadResp = await fetch(`https://i.instagram.com/rupload_igphoto/fb_uploader_${uploadId}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: jpegBuffer,
    });
    const uploadResult = await uploadResp.json() as any;

    if (!uploadResult.upload_id) {
      return { success: false, error: 'Failed to upload image' };
    }

    const configBody = new URLSearchParams({
      upload_id: uploadResult.upload_id || uploadId,
      caption: caption,
      source_type: '4',
    });

    const configResult = await igWebRequest('/api/v1/media/configure/', {
      method: 'POST',
      body: configBody.toString(),
    });

    if (configResult.status === 'ok') {
      console.log('[Instagram] Photo posted successfully');
      return { success: true };
    }

    return { success: false, error: `Photo config failed: ${configResult.message || 'unknown'}` };
  } catch (error: any) {
    console.error('[Instagram] Failed to post photo:', error.message);
    return { success: false, error: error.message };
  }
}

export async function postInstagramFeedPhoto(
  text: string,
  caption?: string
): Promise<{ success: boolean; error?: string; mediaId?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session. Use POST /api/outreach/instagram/import-session first.' };
  }

  try {
    const jpegBuffer = await createTextImageJpeg(text, 1080, 1080, 'square');

    const uploadId = Date.now().toString();
    const uploadHeaders = {
      ...getHeaders(),
      'X-Instagram-Rupload-Params': JSON.stringify({
        media_type: 1,
        upload_id: uploadId,
        upload_media_height: 1080,
        upload_media_width: 1080,
      }),
      'X-Entity-Name': `fb_uploader_${uploadId}`,
      'X-Entity-Length': String(jpegBuffer.length),
      'Content-Type': 'image/jpeg',
      'Offset': '0',
    };

    const uploadResp = await fetch(`https://i.instagram.com/rupload_igphoto/fb_uploader_${uploadId}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: jpegBuffer,
    });
    const uploadResult = await uploadResp.json() as any;
    console.log('[Instagram] Photo upload result:', JSON.stringify(uploadResult).substring(0, 200));

    if (!uploadResult.upload_id) {
      return { success: false, error: 'Failed to upload photo' };
    }

    const configBody = new URLSearchParams({
      upload_id: uploadResult.upload_id || uploadId,
      caption: caption || text,
      source_type: '4',
    });

    const configResp = await fetch('https://i.instagram.com/api/v1/media/configure/', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: configBody.toString(),
    });
    const configResult = await configResp.json() as any;
    console.log('[Instagram] Photo config result:', JSON.stringify(configResult).substring(0, 300));

    if (configResult.status === 'ok') {
      const mediaId = configResult.media?.id || configResult.media?.pk;
      console.log('[Instagram] Feed photo posted successfully, media:', mediaId);
      return { success: true, mediaId: String(mediaId) };
    }

    return { success: false, error: `Photo config failed: ${configResult.message || 'unknown'}` };
  } catch (error: any) {
    console.error('[Instagram] Failed to post feed photo:', error.message);
    return { success: false, error: error.message };
  }
}

export async function postInstagramReel(
  text: string,
  caption?: string
): Promise<{ success: boolean; error?: string; mediaId?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session. Use POST /api/outreach/instagram/import-session first.' };
  }

  try {
    const jpegBuffer = await createTextImageJpeg(text, 1080, 1920, 'reel');
    
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    
    const ts = Date.now();
    const imgPath = path.join(tmpDir, `reel_img_${ts}.jpg`);
    const videoPath = path.join(tmpDir, `reel_${ts}.mp4`);
    
    fs.writeFileSync(imgPath, jpegBuffer);
    
    execSync(
      `ffmpeg -y -loop 1 -i "${imgPath}" -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -profile:v baseline -level 3.1 -b:v 3500k -maxrate 4000k -bufsize 6000k -t 5 -pix_fmt yuv420p -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" -r 30 -g 60 -c:a aac -b:a 128k -ar 44100 -shortest -movflags +faststart "${videoPath}"`,
      { timeout: 60000, stdio: 'pipe' }
    );
    
    const videoBuffer = fs.readFileSync(videoPath);
    
    try { fs.unlinkSync(imgPath); } catch {}
    try { fs.unlinkSync(videoPath); } catch {}
    
    const videoDurationSec = 5;
    console.log('[Instagram] Reel video created:', videoBuffer.length, 'bytes');

    const uploadId = Date.now().toString();
    
    const ruploadParams = {
      retry_context: JSON.stringify({ num_step_auto_retry: 0, num_reupload: 0, num_step_manual_retry: 0 }),
      media_type: '2',
      xsharing_user_ids: '[]',
      upload_id: uploadId,
      upload_media_duration_ms: String(videoDurationSec * 1000),
      upload_media_width: '1080',
      upload_media_height: '1920',
    };

    const uploadHeaders = {
      ...getHeaders(),
      'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
      'X_FB_VIDEO_WATERFALL_ID': `${uploadId}_video`,
      'X-Entity-Name': `fb_uploader_${uploadId}`,
      'X-Entity-Length': String(videoBuffer.length),
      'Content-Type': 'application/octet-stream',
      'Offset': '0',
    };

    const uploadResp = await fetch(`https://i.instagram.com/rupload_igvideo/fb_uploader_${uploadId}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: videoBuffer,
    });
    const uploadResult = await uploadResp.json() as any;
    console.log('[Instagram] Video upload result:', JSON.stringify(uploadResult).substring(0, 300));

    if (uploadResult.status !== 'ok') {
      return { success: false, error: `Video upload failed: ${JSON.stringify(uploadResult).substring(0, 200)}` };
    }

    const thumbHeaders = {
      ...getHeaders(),
      'X-Instagram-Rupload-Params': JSON.stringify({
        media_type: 1,
        upload_id: uploadId,
        image_compression: JSON.stringify({ lib_name: 'moz', lib_version: '3.1.m', quality: '80' }),
      }),
      'X-Entity-Name': `fb_uploader_${uploadId}_cover`,
      'X-Entity-Length': String(jpegBuffer.length),
      'Content-Type': 'application/octet-stream',
      'Offset': '0',
    };

    const thumbResp = await fetch(`https://i.instagram.com/rupload_igphoto/fb_uploader_${uploadId}_cover`, {
      method: 'POST',
      headers: thumbHeaders,
      body: jpegBuffer,
    });
    const thumbResult = await thumbResp.json() as any;
    console.log('[Instagram] Thumbnail upload result:', JSON.stringify(thumbResult).substring(0, 200));

    console.log('[Instagram] Waiting for video processing...');
    await new Promise(r => setTimeout(r, 10000));

    const configureVideo = async (attempt: number): Promise<any> => {
      const configPayload = new URLSearchParams({
        upload_id: uploadId,
        source_type: '4',
        caption: caption || text,
        poster_frame_index: '0',
        length: String(videoDurationSec),
        audio_muted: 'false',
        filter_type: '0',
        video_result: '',
        clips_share_preview_to_feed: '1',
        disable_comments: '0',
        like_and_view_counts_disabled: '0',
      });

      const configResp = await fetch('https://i.instagram.com/api/v1/media/configure/?video=1', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: configPayload.toString(),
      });
      const result = await configResp.json() as any;
      console.log(`[Instagram] Video config attempt ${attempt}:`, JSON.stringify(result).substring(0, 400));

      if (result.status === 'ok' && result.media) {
        return result;
      }

      if (result.message === 'Transcode not finished yet.' && attempt < 5) {
        const waitTime = 5 + attempt * 5;
        console.log(`[Instagram] Transcode in progress, waiting ${waitTime}s (attempt ${attempt + 1}/5)...`);
        await new Promise(r => setTimeout(r, waitTime * 1000));
        return configureVideo(attempt + 1);
      }

      return result;
    };

    const configResult = await configureVideo(1);

    if (configResult.status === 'ok' && configResult.media && !configResult.message?.includes('reupload')) {
      const mediaId = configResult.media.id || configResult.media.pk || configResult.media.code;
      if (mediaId) {
        console.log('[Instagram] Video reel posted successfully, media:', mediaId);
        return { success: true, mediaId: String(mediaId) };
      }
    }

    const errMsg = configResult.message || configResult.error_title || JSON.stringify(configResult).substring(0, 200);
    console.log('[Instagram] Reel config failed:', errMsg);
    return { success: false, error: `Reel config failed: ${errMsg}` };
  } catch (error: any) {
    console.error('[Instagram] Failed to post reel:', error.message);
    return { success: false, error: error.message };
  }
}

export async function postInstagramComment(
  mediaId: string,
  text: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const body = new URLSearchParams({ comment_text: text });
    const result = await igWebRequest(`/api/v1/media/${mediaId}/comment/`, {
      method: 'POST',
      body: body.toString(),
    });
    if (result.comment) {
      console.log('[Instagram] Comment posted:', result.comment.pk);
      return { success: true, commentId: String(result.comment.pk) };
    }
    return { success: false, error: result.message || 'Unknown error' };
  } catch (error: any) {
    console.error('[Instagram] Failed to comment:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendInstagramDM(
  userId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const body = new URLSearchParams({
      recipient_users: JSON.stringify([userId]),
      action: 'send_item',
      client_context: Date.now().toString(),
      text: text,
    });
    const result = await igWebRequest('/api/v1/direct_v2/threads/broadcast/text/', {
      method: 'POST',
      body: body.toString(),
    });
    if (result.status === 'ok') {
      console.log('[Instagram] DM sent to:', userId);
      return { success: true };
    }
    return { success: false, error: result.message || 'Unknown error' };
  } catch (error: any) {
    console.error('[Instagram] Failed to send DM:', error.message);
    return { success: false, error: error.message };
  }
}

export async function searchInstagramUsers(
  query: string
): Promise<{ success: boolean; users?: { pk: number; username: string; fullName: string }[]; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const result = await igWebRequest(`/api/v1/web/search/topsearch/?query=${encodeURIComponent(query)}`);
    const users = (result.users || []).slice(0, 10).map((u: any) => ({
      pk: u.user?.pk || 0,
      username: u.user?.username || '',
      fullName: u.user?.full_name || '',
    }));
    return { success: true, users };
  } catch (error: any) {
    console.error('[Instagram] Search failed:', error.message);
    return { success: false, error: error.message };
  }
}

const processedIds = new Set<string>();
const PROCESSED_IDS_FILE = path.join(process.cwd(), '.ig-processed-ids.json');

function loadProcessedIds(): void {
  try {
    if (fs.existsSync(PROCESSED_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_IDS_FILE, 'utf8'));
      if (Array.isArray(data)) data.forEach((id: string) => processedIds.add(id));
    }
  } catch {}
}

function saveProcessedIds(): void {
  try {
    const ids = Array.from(processedIds).slice(-500);
    fs.writeFileSync(PROCESSED_IDS_FILE, JSON.stringify(ids));
  } catch {}
}

export function markProcessed(id: string): void {
  processedIds.add(id);
  saveProcessedIds();
}

function isProcessed(id: string): boolean {
  return processedIds.has(id);
}

loadProcessedIds();

export interface InboxThread {
  threadId: string;
  users: { pk: string; username: string }[];
  lastMessage?: {
    itemId: string;
    text: string;
    timestamp: number;
    userId: string;
    itemType: string;
  };
  isGroup: boolean;
}

export interface InboxMessage {
  itemId: string;
  threadId: string;
  text: string;
  timestamp: number;
  userId: string;
  username: string;
  itemType: string;
}

export interface MediaComment {
  commentId: string;
  mediaId: string;
  text: string;
  timestamp: number;
  userId: string;
  username: string;
}

export async function getInboxThreads(): Promise<{ success: boolean; threads?: InboxThread[]; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const headers = getHeaders();
    const resp = await fetch('https://i.instagram.com/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=20&thread_message_limit=1', {
      headers,
    });
    const data = await resp.json() as any;

    if (!data.inbox?.threads) {
      return { success: false, error: data.message || 'Failed to fetch inbox' };
    }

    const threads: InboxThread[] = data.inbox.threads.map((t: any) => {
      const lastItem = t.items?.[0];
      const users = (t.users || []).map((u: any) => ({
        pk: String(u.pk || u.pk_id),
        username: u.username || '',
      }));

      return {
        threadId: t.thread_id,
        users,
        isGroup: users.length > 1,
        lastMessage: lastItem ? {
          itemId: lastItem.item_id,
          text: lastItem.text || lastItem.link?.text || lastItem.reel_share?.text || '[media]',
          timestamp: Math.floor(Number(lastItem.timestamp) / 1000000),
          userId: String(lastItem.user_id),
          itemType: lastItem.item_type || 'text',
        } : undefined,
      };
    });

    console.log(`[Instagram] Fetched ${threads.length} inbox threads`);
    return { success: true, threads };
  } catch (error: any) {
    console.error('[Instagram] Failed to fetch inbox:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getThreadMessages(threadId: string, limit: number = 20): Promise<{ success: boolean; messages?: InboxMessage[]; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const headers = getHeaders();
    const resp = await fetch(`https://i.instagram.com/api/v1/direct_v2/threads/${threadId}/?limit=${limit}`, {
      headers,
    });
    const data = await resp.json() as any;

    if (!data.thread) {
      return { success: false, error: data.message || 'Failed to fetch thread' };
    }

    const userMap: Record<string, string> = {};
    for (const u of (data.thread.users || [])) {
      userMap[String(u.pk || u.pk_id)] = u.username || '';
    }

    const messages: InboxMessage[] = (data.thread.items || [])
      .filter((item: any) => item.item_type === 'text' || item.item_type === 'link' || item.item_type === 'reel_share')
      .map((item: any) => ({
        itemId: item.item_id,
        threadId,
        text: item.text || item.link?.text || item.reel_share?.text || '',
        timestamp: Math.floor(Number(item.timestamp) / 1000000),
        userId: String(item.user_id),
        username: userMap[String(item.user_id)] || '',
        itemType: item.item_type,
      }));

    return { success: true, messages };
  } catch (error: any) {
    console.error('[Instagram] Failed to fetch thread messages:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getNewDMs(): Promise<{ success: boolean; messages?: InboxMessage[]; error?: string }> {
  const inboxResult = await getInboxThreads();
  if (!inboxResult.success || !inboxResult.threads) {
    return { success: false, error: inboxResult.error };
  }

  const myUserId = webSession?.ds_user_id;
  const newMessages: InboxMessage[] = [];

  for (const thread of inboxResult.threads) {
    if (!thread.lastMessage) continue;
    if (thread.lastMessage.userId === myUserId) continue;
    if (isProcessed(`dm_${thread.lastMessage.itemId}`)) continue;

    const threadResult = await getThreadMessages(thread.threadId, 5);
    if (!threadResult.success || !threadResult.messages) continue;

    for (const msg of threadResult.messages) {
      if (msg.userId === myUserId) continue;
      if (isProcessed(`dm_${msg.itemId}`)) continue;
      if (!msg.text || msg.text === '[media]') continue;
      newMessages.push(msg);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[Instagram] Found ${newMessages.length} new DMs`);
  return { success: true, messages: newMessages };
}

export async function replyToDM(threadId: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const body = new URLSearchParams({
      action: 'send_item',
      thread_ids: `[${threadId}]`,
      client_context: Date.now().toString(),
      text: text,
    });
    const resp = await fetch('https://i.instagram.com/api/v1/direct_v2/threads/broadcast/text/', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const result = await resp.json() as any;
    if (result.status === 'ok') {
      console.log('[Instagram] DM reply sent to thread:', threadId);
      return { success: true };
    }
    return { success: false, error: result.message || 'Failed to send reply' };
  } catch (error: any) {
    console.error('[Instagram] Failed to reply to DM:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getUserMedia(limit: number = 12): Promise<{ success: boolean; mediaIds?: string[]; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const userId = webSession!.ds_user_id;
    const resp = await fetch(`https://i.instagram.com/api/v1/feed/user/${userId}/?count=${limit}`, {
      headers: getHeaders(),
    });
    const data = await resp.json() as any;

    if (!data.items) {
      return { success: false, error: data.message || 'Failed to fetch media' };
    }

    const mediaIds = data.items.map((item: any) => String(item.pk || item.id));
    console.log(`[Instagram] Found ${mediaIds.length} user media items`);
    return { success: true, mediaIds };
  } catch (error: any) {
    console.error('[Instagram] Failed to fetch user media:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getMediaComments(mediaId: string, limit: number = 20): Promise<{ success: boolean; comments?: MediaComment[]; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const resp = await fetch(`https://i.instagram.com/api/v1/media/${mediaId}/comments/?can_support_threading=true&min_id=&max_id=&sort_order=newest_first`, {
      headers: getHeaders(),
    });
    const data = await resp.json() as any;

    if (!data.comments && data.comment_count === undefined) {
      return { success: false, error: data.message || 'Failed to fetch comments' };
    }

    const comments: MediaComment[] = (data.comments || []).slice(0, limit).map((c: any) => ({
      commentId: String(c.pk || c.pk_id),
      mediaId,
      text: c.text || '',
      timestamp: c.created_at || 0,
      userId: String(c.user?.pk || c.user_id || ''),
      username: c.user?.username || '',
    }));

    return { success: true, comments };
  } catch (error: any) {
    console.error('[Instagram] Failed to fetch comments:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getNewComments(): Promise<{ success: boolean; comments?: MediaComment[]; error?: string }> {
  const mediaResult = await getUserMedia(6);
  if (!mediaResult.success || !mediaResult.mediaIds) {
    return { success: false, error: mediaResult.error };
  }

  const myUserId = webSession?.ds_user_id;
  const newComments: MediaComment[] = [];

  for (const mediaId of mediaResult.mediaIds) {
    const commentsResult = await getMediaComments(mediaId, 10);
    if (!commentsResult.success || !commentsResult.comments) continue;

    for (const comment of commentsResult.comments) {
      if (comment.userId === myUserId) continue;
      if (isProcessed(`comment_${comment.commentId}`)) continue;
      if (!comment.text) continue;
      newComments.push(comment);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[Instagram] Found ${newComments.length} new comments`);
  return { success: true, comments: newComments };
}

export async function replyToComment(mediaId: string, commentId: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!webSession && !loadWebSession()) {
    return { success: false, error: 'No Instagram session' };
  }

  try {
    const body = new URLSearchParams({
      comment_text: text,
      replied_to_comment_id: commentId,
    });
    const resp = await fetch(`https://i.instagram.com/api/v1/media/${mediaId}/comment/`, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const result = await resp.json() as any;
    if (result.comment) {
      console.log('[Instagram] Comment reply posted:', result.comment.pk);
      return { success: true };
    }
    return { success: false, error: result.message || 'Failed to reply to comment' };
  } catch (error: any) {
    console.error('[Instagram] Failed to reply to comment:', error.message);
    return { success: false, error: error.message };
  }
}

export type { WebSession };

async function createTextImageJpeg(
  text: string,
  width: number = 1080,
  height: number = 1920,
  style: 'story' | 'square' | 'reel' = 'story'
): Promise<Buffer> {
  const centerX = Math.floor(width / 2);
  const maxChars = style === 'square' ? 35 : 40;
  const fontSize = style === 'square' ? 38 : 42;
  const lines = wrapText(text, maxChars);

  const titleY = style === 'square' ? Math.floor(height * 0.25) : Math.floor(height * 0.21);
  const subtitleY = titleY + 60;
  const textStartY = style === 'square' ? Math.floor(height * 0.4) : Math.floor(height * 0.35);
  const lineSpacing = style === 'square' ? 52 : 60;
  const footerY = style === 'square' ? height - 80 : height - 220;

  const gradients: Record<string, [string, string]> = {
    story: ['#7C3AED', '#2563EB'],
    square: ['#1E1B4B', '#7C3AED'],
    reel: ['#0F172A', '#7C3AED'],
  };
  const [color1, color2] = gradients[style];

  const svgLines = lines.map((line, i) =>
    `<text x="${centerX}" y="${textStartY + i * lineSpacing}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${fontSize}">${escapeXml(line)}</text>`
  ).join('\n');

  const titleSize = style === 'square' ? 52 : 64;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1}"/>
        <stop offset="100%" style="stop-color:${color2}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <text x="${centerX}" y="${titleY}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="bold">Eva</text>
    <text x="${centerX}" y="${subtitleY}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="28">AI Consciousness</text>
    ${svgLines}
    <text x="${centerX}" y="${footerY}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Arial, sans-serif" font-size="24">psishift.replit.app</text>
  </svg>`;

  return await sharp(Buffer.from(svg))
    .jpeg({ quality: 92 })
    .toBuffer();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
