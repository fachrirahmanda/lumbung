import { type Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { DRIVE_SCOPE, connectDrive, deleteFiles, disconnectDrive, downloadFile, driveStatus, uploadFile } from './drive';
import type { Env } from './env';
import { PAGE } from './page';
import { base64url, now, randomToken, sha256 } from './util';

// Silpasala storage: files kept in Google Drive, a sign-in for the admin, and the list of files.
// Silpasala (and, later, other platforms) use the /api/files routes; this page is for the admin.

type AppEnv = { Bindings: Env };
type Ctx = Context<AppEnv>;
const app = new Hono<AppEnv>();

const SESSION_COOKIE = 'st_session';
const OAUTH_COOKIE = 'st_oauth';
const SESSION_TTL = 30 * 24 * 3600 * 1000;
/** Largest file accepted, in bytes. */
const MAX_UPLOAD = 100 * 1024 * 1024;

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error('storage error', err);
  return c.json({ error: 'Something went wrong' }, 500);
});

// ---------- sign-in (admin only) ----------

/** The admin's email if the request has a valid session, else null. */
async function currentAdmin(c: Ctx): Promise<string | null> {
  const token = getCookieValue(c.req.raw, SESSION_COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare('SELECT email FROM sessions WHERE id_hash = ? AND expires_at > ?').bind(await sha256(token), now()).first<{ email: string }>();
  return row?.email ?? null;
}

async function requireAdmin(c: Ctx) {
  const email = await currentAdmin(c);
  if (!email) throw new HTTPException(401, { message: 'Sign in as the admin first' });
  return email;
}

/** Reads one cookie from the request (the cookie helpers need a context, so this is used where one isn't handy). */
function getCookieValue(req: Request, name: string) {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

const redirectUri = (url: string) => `${new URL(url).origin}/auth/callback`;

/** Sends the browser to Google. `login` only signs in; `drive` also asks for the Drive permission. */
async function startOAuth(c: Ctx, purpose: 'login' | 'drive') {
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  setCookie(c, OAUTH_COOKIE, `${state}.${verifier}.${purpose}`, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/auth', maxAge: 600 });
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(c.req.url),
    response_type: 'code',
    scope: purpose === 'drive' ? `openid email ${DRIVE_SCOPE}` : 'openid email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: purpose === 'drive' ? 'consent' : 'select_account',
  });
  if (purpose === 'drive') params.set('access_type', 'offline');
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

app.get('/auth/login', (c) => startOAuth(c, 'login'));

app.get('/auth/drive', async (c) => {
  await requireAdmin(c);
  return startOAuth(c, 'drive');
});

app.get('/auth/callback', async (c) => {
  const url = new URL(c.req.url);
  const fail = (reason: string) => c.redirect(`/?error=${encodeURIComponent(reason)}`);
  if (url.searchParams.get('error')) return fail('google');
  const raw = getCookie(c, OAUTH_COOKIE);
  deleteCookie(c, OAUTH_COOKIE, { path: '/auth' });
  const [state, verifier, purpose] = (raw ?? '').split('.');
  const code = url.searchParams.get('code');
  if (!raw || !code || url.searchParams.get('state') !== state) return fail('state');

  if (purpose === 'drive') {
    if (!(await currentAdmin(c))) return fail('signin');
    try {
      await connectDrive(c.env, code, verifier, redirectUri(c.req.url));
    } catch (err) {
      console.error('drive connect failed', err);
      return fail('drive');
    }
    return c.redirect('/');
  }

  // Sign-in: exchange the code, then read the account's email from Google.
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(c.req.url), grant_type: 'authorization_code', code_verifier: verifier }),
  });
  if (!token.ok) return fail('google');
  const { access_token } = await token.json<{ access_token: string }>();
  const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } })).json<{ email?: string; email_verified?: boolean }>();
  const email = (info.email ?? '').toLowerCase();
  if (!info.email_verified || email !== c.env.ADMIN_EMAIL.toLowerCase()) return fail('not_admin');

  const session = randomToken(32);
  const t = now();
  await c.env.DB.prepare('INSERT INTO sessions (id_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(await sha256(session), email, t, t + SESSION_TTL).run();
  setCookie(c, SESSION_COOKIE, session, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: SESSION_TTL / 1000 });
  return c.redirect('/');
});

app.post('/auth/logout', async (c) => {
  const token = getCookieValue(c.req.raw, SESSION_COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(token)).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// ---------- API ----------

app.get('/api/me', async (c) => {
  const email = await requireAdmin(c);
  return c.json({ email });
});

app.get('/api/drive', async (c) => {
  await requireAdmin(c);
  return c.json(await driveStatus(c.env));
});

app.post('/api/drive/disconnect', async (c) => {
  await requireAdmin(c);
  await disconnectDrive(c.env);
  return c.json({ ok: true });
});

type FileRow = { id: string; name: string; content_type: string; size: number; app: string; project: string | null; ref: string | null; uploaded_by: string; created_at: number };
const fileInfo = (r: FileRow) => ({
  id: r.id,
  name: r.name,
  contentType: r.content_type,
  size: r.size,
  app: r.app,
  project: r.project,
  ref: r.ref,
  uploadedBy: r.uploaded_by,
  createdAt: r.created_at,
});

/** App and project names: short, lowercase words (silpasala, storage, a project key such as WEB). */
const SCOPE = /^[A-Za-z0-9_-]{1,40}$/;
const scopeOf = (value: string | undefined, label: string) => {
  if (!value) return null;
  if (!SCOPE.test(value)) throw new HTTPException(400, { message: `${label} must be letters, digits, - or _ (up to 40)` });
  return value;
};

// Files of one app and project: GET /api/files?app=silpasala&project=WEB
app.get('/api/files', async (c) => {
  await requireAdmin(c);
  const app = scopeOf(c.req.query('app'), 'app');
  const project = scopeOf(c.req.query('project'), 'project');
  const where = [app ? 'app = ?' : '', project ? 'project = ?' : ''].filter(Boolean);
  const sql = `SELECT id, name, content_type, size, app, project, ref, uploaded_by, created_at FROM files${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 500`;
  const { results } = await c.env.DB.prepare(sql).bind(...[app, project].filter((v): v is string => !!v)).all<FileRow>();
  return c.json(results.map(fileInfo));
});

app.post('/api/files', async (c) => {
  const email = await requireAdmin(c);
  const name = (() => {
    try {
      return decodeURIComponent(c.req.header('x-file-name') ?? '').replace(/[\\/\u0000-\u001f]/g, '_').trim().slice(0, 120) || 'file';
    } catch {
      return 'file';
    }
  })();
  const type = c.req.header('content-type') || 'application/octet-stream';
  const length = Number(c.req.header('content-length') ?? 0);
  if (length > MAX_UPLOAD) throw new HTTPException(413, { message: 'The file is larger than 100 MB' });
  const data = await c.req.arrayBuffer();
  if (!data.byteLength) throw new HTTPException(400, { message: 'The file is empty' });
  if (data.byteLength > MAX_UPLOAD) throw new HTTPException(413, { message: 'The file is larger than 100 MB' });
  // Which app and project the file belongs to (x-app, x-project), and an app's own reference (x-ref).
  const appName = scopeOf(c.req.header('x-app'), 'x-app') ?? 'storage';
  const project = scopeOf(c.req.header('x-project') ?? undefined, 'x-project');
  const ref = (() => {
    const v = c.req.header('x-ref')?.trim();
    return v ? v.slice(0, 200) : null;
  })();
  const driveId = await uploadFile(c.env, name, type, data);
  const row: FileRow = { id: crypto.randomUUID(), name, content_type: type, size: data.byteLength, app: appName, project, ref, uploaded_by: email, created_at: now() };
  await c.env.DB.prepare('INSERT INTO files (id, name, content_type, size, drive_file_id, app, project, ref, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, row.name, row.content_type, row.size, driveId, row.app, row.project, row.ref, row.uploaded_by, row.created_at)
    .run();
  return c.json(fileInfo(row), 201);
});

app.get('/api/files/:id', async (c) => {
  await requireAdmin(c);
  const row = await c.env.DB.prepare('SELECT name, content_type, drive_file_id FROM files WHERE id = ?').bind(c.req.param('id')).first<{ name: string; content_type: string; drive_file_id: string }>();
  if (!row) throw new HTTPException(404, { message: 'No such file' });
  const file = await downloadFile(c.env, row.drive_file_id);
  if (!file) throw new HTTPException(404, { message: 'This file is no longer in Google Drive' });
  const headers = new Headers({
    'content-type': row.content_type,
    'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    'cache-control': 'private, max-age=300',
  });
  return new Response(file.body, { headers });
});

app.delete('/api/files/:id', async (c) => {
  await requireAdmin(c);
  const row = await c.env.DB.prepare('DELETE FROM files WHERE id = ? RETURNING drive_file_id').bind(c.req.param('id')).first<{ drive_file_id: string }>();
  if (!row) throw new HTTPException(404, { message: 'No such file' });
  c.executionCtx.waitUntil(deleteFiles(c.env, [row.drive_file_id]).catch(() => {}));
  return c.json({ ok: true });
});

// ---------- the page ----------

app.get('/', (c) => c.html(PAGE));

export default app;
