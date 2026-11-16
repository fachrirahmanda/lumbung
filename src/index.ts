import { type Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { DRIVE_SCOPE, connectDrive, deleteFiles, disconnectDrive, downloadFile, driveStatus, uploadFile } from './drive';
import type { Env } from './env';
import { PAGE } from './page';
import { base64url, now, randomToken, sha256 } from './util';

// Lumbung: files kept in Google Drive. Only the superadmin and the members listed in D1 can sign in.
// Silpasala (and, later, other platforms) use the /api/files routes; the page is for people with an account.

type AppEnv = { Bindings: Env };
type Ctx = Context<AppEnv>;
const app = new Hono<AppEnv>();

type Role = 'user' | 'admin' | 'superadmin';
type Me = { email: string; role: Role };
const RANK: Record<Role, number> = { user: 1, admin: 2, superadmin: 3 };

const SESSION_COOKIE = 'lb_session';
const OAUTH_COOKIE = 'lb_oauth';
const SESSION_TTL = 30 * 24 * 3600 * 1000;
/** Largest file accepted, in bytes. */
const MAX_UPLOAD = 100 * 1024 * 1024;
/** Days a deleted file stays in the trash before it is removed from Drive. */
const TRASH_DAYS = 30;

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error('lumbung error', err);
  return c.json({ error: 'Something went wrong' }, 500);
});

// ---------- who is signed in ----------

const superadmin = (env: Env) => env.SUPERADMIN_EMAIL.toLowerCase();

/** The role of an email: the superadmin, an active member, or nobody. */
async function roleOf(env: Env, email: string): Promise<Me | null> {
  if (email === superadmin(env)) return { email, role: 'superadmin' };
  const row = await env.DB.prepare("SELECT role FROM members WHERE email = ? AND status = 'active'").bind(email).first<{ role: 'user' | 'admin' }>();
  return row ? { email, role: row.role } : null;
}

/** The signed-in person (with their current role), or null. */
async function currentMe(c: Ctx): Promise<Me | null> {
  const token = getCookieValue(c.req.raw, SESSION_COOKIE);
  if (!token) return null;
  const session = await c.env.DB.prepare('SELECT email FROM sessions WHERE id_hash = ? AND expires_at > ?').bind(await sha256(token), now()).first<{ email: string }>();
  if (!session) return null;
  return roleOf(c.env, session.email);
}

/** Requires a signed-in person with at least `min`. Roles: user < admin < superadmin. */
async function requireRole(c: Ctx, min: Role): Promise<Me> {
  const me = await currentMe(c);
  if (!me) throw new HTTPException(401, { message: 'Sign in first' });
  if (RANK[me.role] < RANK[min]) throw new HTTPException(403, { message: 'Your role cannot do this' });
  return me;
}

/** Reads one cookie from the request. */
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
  await requireRole(c, 'superadmin');
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
    const me = await currentMe(c);
    if (me?.role !== 'superadmin') return fail('signin');
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
  if (!info.email_verified) return fail('unverified');
  const me = await roleOf(c.env, email);
  if (!me) {
    const member = await c.env.DB.prepare('SELECT status FROM members WHERE email = ?').bind(email).first<{ status: string }>();
    return fail(member?.status === 'disabled' ? 'disabled' : 'not_invited');
  }

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

// ---------- me, Drive ----------

app.get('/api/me', async (c) => {
  const me = await requireRole(c, 'user');
  return c.json(me);
});

app.get('/api/drive', async (c) => {
  await requireRole(c, 'admin');
  return c.json(await driveStatus(c.env));
});

app.post('/api/drive/disconnect', async (c) => {
  await requireRole(c, 'superadmin');
  await disconnectDrive(c.env);
  return c.json({ ok: true });
});

// ---------- members (superadmin manages, admins see) ----------

type MemberRow = { email: string; role: 'user' | 'admin'; status: string; invited_by: string | null; created_at: number };
const memberInfo = (r: MemberRow) => ({ email: r.email, role: r.role, status: r.status, invitedBy: r.invited_by, createdAt: r.created_at, fixed: false });

async function listMembers(env: Env) {
  const { results } = await env.DB.prepare('SELECT email, role, status, invited_by, created_at FROM members ORDER BY created_at').all<MemberRow>();
  // The superadmin is always first and cannot be changed or removed here.
  return [{ email: superadmin(env), role: 'superadmin', status: 'active', invitedBy: null, createdAt: null, fixed: true }, ...results.map(memberInfo)];
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const cleanEmail = (value: unknown) => {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!EMAIL.test(email)) throw new HTTPException(400, { message: 'Enter a valid email address' });
  return email;
};
const cleanRole = (value: unknown): 'user' | 'admin' => {
  if (value === 'user' || value === 'admin') return value;
  throw new HTTPException(400, { message: 'The role must be admin or user' });
};

app.get('/api/members', async (c) => {
  await requireRole(c, 'admin');
  return c.json(await listMembers(c.env));
});

app.post('/api/members', async (c) => {
  const me = await requireRole(c, 'superadmin');
  const body = await c.req.json<{ email?: unknown; role?: unknown }>().catch(() => ({}) as { email?: unknown; role?: unknown });
  const email = cleanEmail(body.email);
  if (email === superadmin(c.env)) throw new HTTPException(400, { message: 'That is the superadmin account' });
  const role = cleanRole(body.role);
  await c.env.DB.prepare(
    "INSERT INTO members (email, role, status, invited_by, created_at) VALUES (?, ?, 'active', ?, ?) ON CONFLICT (email) DO UPDATE SET role = excluded.role, status = 'active'",
  ).bind(email, role, me.email, now()).run();
  return c.json(await listMembers(c.env), 201);
});

app.patch('/api/members/:email', async (c) => {
  await requireRole(c, 'superadmin');
  const email = cleanEmail(c.req.param('email'));
  if (email === superadmin(c.env)) throw new HTTPException(400, { message: 'The superadmin cannot be changed here' });
  const body = await c.req.json<{ role?: unknown; status?: unknown }>().catch(() => ({}) as { role?: unknown; status?: unknown });
  if (body.role !== undefined) {
    const role = cleanRole(body.role);
    await c.env.DB.prepare('UPDATE members SET role = ? WHERE email = ?').bind(role, email).run();
  }
  if (body.status !== undefined) {
    if (body.status !== 'active' && body.status !== 'disabled') throw new HTTPException(400, { message: 'Status must be active or disabled' });
    await c.env.DB.prepare('UPDATE members SET status = ? WHERE email = ?').bind(body.status, email).run();
    // A disabled member is signed out everywhere.
    if (body.status === 'disabled') await c.env.DB.prepare('DELETE FROM sessions WHERE email = ?').bind(email).run();
  }
  return c.json(await listMembers(c.env));
});

app.delete('/api/members/:email', async (c) => {
  await requireRole(c, 'superadmin');
  const email = cleanEmail(c.req.param('email'));
  if (email === superadmin(c.env)) throw new HTTPException(400, { message: 'The superadmin cannot be removed' });
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE email = ?').bind(email),
    c.env.DB.prepare('DELETE FROM members WHERE email = ?').bind(email),
  ]);
  return c.json(await listMembers(c.env));
});

// ---------- apps (superadmin adds them; admins see them) ----------
// Each app that stores files has its own token, kept only as a hash. Silpasala is built in: its
// token is the APP_TOKEN secret (set with wrangler), so it is listed here but not managed.

const LEGACY_APP = 'silpasala';
const APP_SLUG = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const RESERVED_APPS = [LEGACY_APP, 'storage'];

type AppRow = { slug: string; name: string; created_by: string; created_at: number; rotated_at: number | null; revoked_at: number | null };

async function listApps(env: Env) {
  const { results } = await env.DB.prepare('SELECT slug, name, created_by, created_at, rotated_at, revoked_at FROM apps ORDER BY created_at').all<AppRow>();
  const { results: counts } = await env.DB.prepare('SELECT app, COUNT(*) AS n FROM files WHERE deleted_at IS NULL GROUP BY app').all<{ app: string; n: number }>();
  const filesOf = (slug: string) => counts.find((r) => r.app === slug)?.n ?? 0;
  const apps = results.map((r) => ({
    slug: r.slug, name: r.name, createdBy: r.created_by, createdAt: r.created_at, rotatedAt: r.rotated_at, revoked: r.revoked_at !== null, files: filesOf(r.slug), builtIn: false,
  }));
  const builtIn = env.APP_TOKEN ? [{ slug: LEGACY_APP, name: 'Silpasala', createdBy: null, createdAt: null, rotatedAt: null, revoked: false, files: filesOf(LEGACY_APP), builtIn: true }] : [];
  return [...builtIn, ...apps];
}

/** A new token: shown once to the superadmin, stored only as its SHA-256. */
const newAppToken = () => `lmb_${randomToken(32)}`;

app.get('/api/apps', async (c) => {
  await requireRole(c, 'admin');
  return c.json(await listApps(c.env));
});

app.post('/api/apps', async (c) => {
  const me = await requireRole(c, 'superadmin');
  const body = await c.req.json<{ slug?: unknown; name?: unknown }>().catch(() => ({}) as { slug?: unknown; name?: unknown });
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!APP_SLUG.test(slug)) throw new HTTPException(400, { message: 'The app code is 2 to 40 characters: lowercase letters, digits, - or _' });
  if (RESERVED_APPS.includes(slug)) throw new HTTPException(400, { message: 'That app code is reserved' });
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 60) throw new HTTPException(400, { message: 'Enter the app name (up to 60 characters)' });
  const taken = await c.env.DB.prepare('SELECT 1 FROM apps WHERE slug = ?').bind(slug).first();
  if (taken) throw new HTTPException(409, { message: 'An app with that code already exists' });
  const token = newAppToken();
  await c.env.DB.prepare('INSERT INTO apps (slug, name, token_hash, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(slug, name, await sha256(token), me.email, now())
    .run();
  return c.json({ token, apps: await listApps(c.env) }, 201);
});

/** A new token for an app (also turns a revoked app back on). The old token stops working at once. */
app.post('/api/apps/:slug/rotate', async (c) => {
  await requireRole(c, 'superadmin');
  const slug = c.req.param('slug');
  if (slug === LEGACY_APP) throw new HTTPException(400, { message: "Silpasala's token is the APP_TOKEN secret: change it with wrangler secret put" });
  const token = newAppToken();
  const res = await c.env.DB.prepare('UPDATE apps SET token_hash = ?, rotated_at = ?, revoked_at = NULL WHERE slug = ?').bind(await sha256(token), now(), slug).run();
  if (!res.meta.changes) throw new HTTPException(404, { message: 'No such app' });
  return c.json({ token, apps: await listApps(c.env) });
});

app.post('/api/apps/:slug/revoke', async (c) => {
  await requireRole(c, 'superadmin');
  const slug = c.req.param('slug');
  if (slug === LEGACY_APP) throw new HTTPException(400, { message: "Silpasala's token is the APP_TOKEN secret: change it with wrangler secret put" });
  const res = await c.env.DB.prepare('UPDATE apps SET revoked_at = ? WHERE slug = ? AND revoked_at IS NULL').bind(now(), slug).run();
  if (!res.meta.changes && !(await c.env.DB.prepare('SELECT 1 FROM apps WHERE slug = ?').bind(slug).first())) throw new HTTPException(404, { message: 'No such app' });
  return c.json({ apps: await listApps(c.env) });
});

// ---------- files ----------
// Two kinds of caller: a signed-in person (by role), or an app with its token (apps table, or
// APP_TOKEN for Silpasala). An app may only touch its own files (row.app = the app's code); its
// requests are checked before anything else.

/** Who a file request is: an app (its code), or a signed-in person (app null). */
type Who = { email: string; app: string | null };

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

/** The app a request's Bearer token belongs to (APP_TOKEN is Silpasala; others are in the apps table), or null. */
async function appOf(c: Ctx): Promise<string | null> {
  const header = c.req.header('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const given = header.slice(7);
  const expected = c.env.APP_TOKEN;
  if (expected) {
    const a = new TextEncoder().encode(given);
    const b = new TextEncoder().encode(expected);
    if (a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b)) return LEGACY_APP;
  }
  if (!given) return null;
  const row = await c.env.DB.prepare('SELECT slug FROM apps WHERE token_hash = ? AND revoked_at IS NULL').bind(await sha256(given)).first<{ slug: string }>();
  return row?.slug ?? null;
}

/** The file routes: an app with its token, or a signed-in person with at least `min`. */
async function requireFiles(c: Ctx, min: 'user' | 'admin'): Promise<Who> {
  const app = await appOf(c);
  if (app) return { email: `app:${app}`, app };
  const me = await requireRole(c, min);
  return { email: me.email, app: null };
}

/** An app sees only its own files. Others (and missing rows) answer 404. */
const appMayTouch = (who: Who, row: { app: string }) => who.app === null || row.app === who.app;

// Files of one app and project: GET /api/files?app=silpasala&project=WEB
app.get('/api/files', async (c) => {
  const who = await requireFiles(c, 'user');
  let appName = scopeOf(c.req.query('app'), 'app');
  const project = scopeOf(c.req.query('project'), 'project');
  if (who.app !== null) {
    if (appName && appName !== who.app) throw new HTTPException(403, { message: "This token reaches only its own app's files" });
    appName = who.app;
  }
  const where = ['deleted_at IS NULL', appName ? 'app = ?' : '', project ? 'project = ?' : ''].filter(Boolean);
  const sql = `SELECT id, name, content_type, size, app, project, ref, uploaded_by, created_at FROM files WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 500`;
  const { results } = await c.env.DB.prepare(sql).bind(...[appName, project].filter((v): v is string => !!v)).all<FileRow>();
  return c.json(results.map(fileInfo));
});

app.post('/api/files', async (c) => {
  const who = await requireFiles(c, 'user');
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
  let appName = scopeOf(c.req.header('x-app'), 'x-app') ?? 'storage';
  if (who.app !== null) {
    if (c.req.header('x-app') && appName !== who.app) throw new HTTPException(403, { message: "This token uploads only its own app's files" });
    appName = who.app;
  }
  const project = scopeOf(c.req.header('x-project') ?? undefined, 'x-project');
  const ref = (() => {
    const v = c.req.header('x-ref')?.trim();
    return v ? v.slice(0, 200) : null;
  })();
  const driveId = await uploadFile(c.env, name, type, data);
  const row: FileRow = { id: crypto.randomUUID(), name, content_type: type, size: data.byteLength, app: appName, project, ref, uploaded_by: who.email, created_at: now() };
  await c.env.DB.prepare('INSERT INTO files (id, name, content_type, size, drive_file_id, app, project, ref, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, row.name, row.content_type, row.size, driveId, row.app, row.project, row.ref, row.uploaded_by, row.created_at)
    .run();
  return c.json(fileInfo(row), 201);
});

app.get('/api/files/:id', async (c) => {
  const who = await requireFiles(c, 'user');
  const row = await c.env.DB.prepare('SELECT name, content_type, drive_file_id, app FROM files WHERE id = ? AND deleted_at IS NULL').bind(c.req.param('id')).first<{ name: string; content_type: string; drive_file_id: string; app: string }>();
  if (!row || !appMayTouch(who, row)) throw new HTTPException(404, { message: 'No such file' });
  const file = await downloadFile(c.env, row.drive_file_id);
  if (!file) throw new HTTPException(404, { message: 'This file is no longer in Google Drive' });
  const headers = new Headers({
    'content-type': row.content_type,
    'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    'cache-control': 'private, max-age=300',
    // Uploaded files never run as a page: no sniffing, no scripts, no styles.
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
  });
  return new Response(file.body, { headers });
});

/** Deleting marks the file; it is removed from Drive after 30 days (purgeTrash). */
app.delete('/api/files/:id', async (c) => {
  const who = await requireFiles(c, 'admin');
  const row = await c.env.DB.prepare('SELECT app FROM files WHERE id = ? AND deleted_at IS NULL').bind(c.req.param('id')).first<{ app: string }>();
  if (!row || !appMayTouch(who, row)) throw new HTTPException(404, { message: 'No such file' });
  await c.env.DB.prepare('UPDATE files SET deleted_at = ? WHERE id = ?').bind(now(), c.req.param('id')).run();
  return c.json({ ok: true });
});

/** Removes files deleted more than 30 days ago from Drive, then from the database. Files Drive could not remove stay for the next run. */
async function purgeTrash(env: Env) {
  const cutoff = now() - TRASH_DAYS * 24 * 3600 * 1000;
  const { results } = await env.DB.prepare('SELECT id, drive_file_id FROM files WHERE deleted_at IS NOT NULL AND deleted_at < ? LIMIT 200').bind(cutoff).all<{ id: string; drive_file_id: string }>();
  if (!results.length) return 0;
  const gone = await deleteFiles(env, results.map((r) => r.drive_file_id));
  const done = results.filter((r) => gone.includes(r.drive_file_id));
  if (done.length) await env.DB.batch(done.map((r) => env.DB.prepare('DELETE FROM files WHERE id = ?').bind(r.id)));
  return done.length;
}

// ---------- the page ----------

app.get('/', (c) => c.html(PAGE));

export default {
  fetch: app.fetch,
  /** Daily: empties the trash. */
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(purgeTrash(env).catch((err) => console.error('trash purge failed', err)));
  },
};
