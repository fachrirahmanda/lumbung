# Lumbung

A file storage Worker on Cloudflare. Files are kept in Google Drive. An admin signs in with Google, connects the Drive account, and manages the files on a simple page. Other apps (such as Silpasala) use the file API.

- **Storage:** Google Drive (scope `drive.file`: the app only sees files it created).
- **Metadata:** Cloudflare D1. Each file records its name, type, size, the app and project it belongs to, an optional reference from that app, and who uploaded it.
- **Access:** only the admin email (set as a secret) can sign in. Sessions are stored as hashes.

## Setup

1. Create the database and put its id in `wrangler.jsonc`:

   ```bash
   npx wrangler d1 create lumbung
   ```

2. Create a Google OAuth client (or reuse the one from the app that created the files, see below). Add these redirect URIs:

   - `http://localhost:8788/auth/callback` (local development)
   - `https://<your-worker>.workers.dev/auth/callback` (production)

3. Set the secrets:

   ```bash
   npx wrangler secret put ADMIN_EMAIL
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put SETTINGS_KEY
   ```

   `SETTINGS_KEY` is any long random string. It encrypts the stored Drive token.

4. Apply the migrations and deploy:

   ```bash
   npm install
   npm run db:migrate:remote
   npm run deploy
   ```

5. Open the Worker URL, sign in, and connect Google Drive.

### Reusing an existing OAuth client

Google only lets an app see Drive files it created itself, so files uploaded through one OAuth client are not visible to another. To keep older files readable, use the same client ID and secret as the app that created them, and add this Worker's redirect URIs to that client.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in the values; never commit this file
npm run db:migrate:local
npm run dev                      # http://localhost:8788
```

## API

All `/api/*` routes need an admin session (sign in first).

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/me` | The signed-in admin |
| `GET` | `/api/drive` | Whether Drive is connected, and as which account |
| `POST` | `/api/drive/disconnect` | Disconnects Drive and revokes the token |
| `GET` | `/api/files` | Files, newest first. Filter with `?app=` and `?project=` |
| `POST` | `/api/files` | Upload. The body is the file. See the headers below |
| `GET` | `/api/files/:id` | Download |
| `DELETE` | `/api/files/:id` | Delete the file here and in Drive |

Upload headers:

- `content-type`: the file's type
- `x-file-name`: the file name, URL-encoded
- `x-app`: the app the file belongs to (default `storage`)
- `x-project`: the project within that app (optional)
- `x-ref`: the app's own reference, such as an issue key (optional)

App and project names may contain only letters, digits, `-` and `_` (up to 40 characters). Files are limited to 100 MB.

## Security notes

- Secrets live in Cloudflare (`wrangler secret put`), never in this repository. `.dev.vars` and `.wrangler/` are git-ignored.
- The Drive refresh token is encrypted at rest with a key derived from `SETTINGS_KEY`.
- Session cookies are `HttpOnly`, `Secure` and `SameSite=Lax`.
