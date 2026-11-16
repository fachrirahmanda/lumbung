import { HTTPException } from 'hono/http-exception';
import type { Env } from './env';
import { base64url, now } from './util';

// Google Drive as the file store. An admin connects one Google account (scope drive.file: the app
// only sees files it created). Its refresh token is kept in app_settings, encrypted with a key
// derived from SETTINGS_KEY.

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'Lumbung';

type Settings = { refresh_token?: string; folder_id?: string; email?: string; connected_at?: string };

// ---------- settings ----------

async function getSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare("SELECT key, value FROM app_settings WHERE key LIKE 'drive.%'").all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key.slice('drive.'.length), r.value]));
}

function putSettings(db: D1Database, values: Settings) {
  return db.batch(
    Object.entries(values).map(([k, v]) =>
      db.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(`drive.${k}`, v, now()),
    ),
  );
}

export async function driveStatus(env: Env) {
  const s = await getSettings(env.DB);
  return { connected: !!s.refresh_token, email: s.email ?? null, folderId: s.folder_id ?? null, connectedAt: s.connected_at ? Number(s.connected_at) : null };
}

export async function disconnectDrive(env: Env) {
  const s = await getSettings(env.DB);
  if (s.refresh_token) {
    // Revoke at Google too, so the token is useless even if it leaked.
    const token = await decrypt(env, s.refresh_token).catch(() => null);
    if (token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {});
  }
  await env.DB.prepare("DELETE FROM app_settings WHERE key LIKE 'drive.%'").run();
  cached = null;
}

// ---------- secret encryption ----------

/** The key material: SETTINGS_KEY, falling back to the Google client secret so local development works without it. */
const secretOf = (env: Env) => env.SETTINGS_KEY || env.GOOGLE_CLIENT_SECRET;

async function key(env: Env, info: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretOf(env)), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new TextEncoder().encode('lumbung'), info: new TextEncoder().encode(info) },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(env: Env, text: string, info = 'drive-refresh-token') {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env, info), new TextEncoder().encode(text)));
  const out = new Uint8Array(iv.length + data.length);
  out.set(iv);
  out.set(data, iv.length);
  return base64url(out);
}

async function decrypt(env: Env, value: string, info = 'drive-refresh-token') {
  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, await key(env, info), bytes.slice(12));
  return new TextDecoder().decode(plain);
}

// ---------- access token ----------

let cached: { token: string; expires: number } | null = null;

const notConnected = () => new HTTPException(503, { message: 'Google Drive is not connected yet. Connect it on this page first.' });

async function accessToken(env: Env) {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const s = await getSettings(env.DB);
  if (!s.refresh_token) throw notConnected();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: await decrypt(env, s.refresh_token),
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    console.error('drive token refresh failed', res.status, await res.text());
    throw new HTTPException(503, { message: 'Google Drive access expired or was revoked. Connect it again on this page.' });
  }
  const { access_token, expires_in } = await res.json<{ access_token: string; expires_in: number }>();
  cached = { token: access_token, expires: Date.now() + expires_in * 1000 };
  return access_token;
}

async function drive(env: Env, url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${await accessToken(env)}` } });
}

// ---------- connect (OAuth code from the callback) ----------

export async function connectDrive(env: Env, code: string, verifier: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${await res.text()}`);
  const tokens = await res.json<{ access_token: string; refresh_token?: string; expires_in: number; scope: string }>();
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Try connecting again.');
  if (!tokens.scope.split(' ').includes(DRIVE_SCOPE)) throw new Error('Drive permission was not granted.');
  const profile = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } })).json<{ email?: string }>();

  await disconnectDrive(env).catch(() => {});
  cached = { token: tokens.access_token, expires: Date.now() + tokens.expires_in * 1000 };
  await putSettings(env.DB, { refresh_token: await encrypt(env, tokens.refresh_token), email: profile.email ?? '', connected_at: String(now()) });
  await ensureFolder(env);
}

/** The folder files go in; recreated if someone deleted it in Drive. */
async function ensureFolder(env: Env, force = false) {
  const s = await getSettings(env.DB);
  if (s.folder_id && !force) return s.folder_id;
  const res = await drive(env, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', description: 'Files from Lumbung. Deleting files here breaks the links to them.' }),
  });
  if (!res.ok) throw new HTTPException(502, { message: `Could not create the Drive folder (${res.status})` });
  const { id } = await res.json<{ id: string }>();
  await putSettings(env.DB, { folder_id: id });
  return id;
}

// ---------- files ----------

/** Drive's one-request (multipart) upload takes up to 5 MB; bigger files use a resumable upload. */
const MULTIPART_MAX = 4.5 * 1024 * 1024;

export async function uploadFile(env: Env, name: string, type: string, data: ArrayBuffer) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const folder = await ensureFolder(env, attempt > 0);
    if (data.byteLength > MULTIPART_MAX) {
      const id = await uploadResumable(env, { name, parents: [folder], mimeType: type }, type, data);
      if (id === null && attempt === 0) continue;
      if (id) return id;
      throw new HTTPException(502, { message: 'Upload to Google Drive failed' });
    }
    const boundary = `st-${crypto.randomUUID()}`;
    const meta = JSON.stringify({ name, parents: [folder], mimeType: type });
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`,
      data,
      `\r\n--${boundary}--`,
    ]);
    const res = await drive(env, `${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body });
    if (res.ok) return (await res.json<{ id: string }>()).id;
    // The folder was removed in Drive: make a new one and try once more.
    if (res.status === 404 && attempt === 0) continue;
    console.error('drive upload failed', res.status, await res.text());
    throw new HTTPException(502, { message: `Upload to Google Drive failed (${res.status})` });
  }
  throw new HTTPException(502, { message: 'Upload to Google Drive failed' });
}

/** Two steps: open an upload session with the metadata, then send the bytes. null = folder missing. */
async function uploadResumable(env: Env, meta: { name: string; parents: string[]; mimeType: string }, type: string, data: ArrayBuffer) {
  const start = await drive(env, `${UPLOAD}/files?uploadType=resumable&fields=id`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': type, 'x-upload-content-length': String(data.byteLength) },
    body: JSON.stringify(meta),
  });
  if (start.status === 404) return null;
  const session = start.headers.get('location');
  if (!start.ok || !session) {
    console.error('drive resumable start failed', start.status, await start.text());
    throw new HTTPException(502, { message: `Upload to Google Drive failed (${start.status})` });
  }
  const res = await drive(env, session, { method: 'PUT', headers: { 'content-type': type }, body: data });
  if (!res.ok) {
    console.error('drive resumable upload failed', res.status, await res.text());
    throw new HTTPException(502, { message: `Upload to Google Drive failed (${res.status})` });
  }
  return (await res.json<{ id: string }>()).id;
}

export async function downloadFile(env: Env, fileId: string) {
  const res = await drive(env, `${API}/files/${encodeURIComponent(fileId)}?alt=media`);
  if (res.status === 404) return null;
  if (!res.ok) throw new HTTPException(502, { message: `Could not load the file from Google Drive (${res.status})` });
  return res;
}

/** Deletes files in Drive. Returns the ids that are gone (deleted now, or already missing). */
export async function deleteFiles(env: Env, fileIds: string[]): Promise<string[]> {
  const gone: string[] = [];
  for (const id of fileIds) {
    const res = await drive(env, `${API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    if (res && (res.ok || res.status === 404)) gone.push(id);
  }
  return gone;
}
