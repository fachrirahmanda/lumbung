# Lumbung

A file storage Worker on Cloudflare. Files are kept in Google Drive. People sign in with Google, only invited accounts can get in, and the files are managed on a simple page. Other apps (such as Silpasala) use the file API.

## Roles

| Role | Files | Settings |
| --- | --- | --- |
| **Superadmin** (the `SUPERADMIN_EMAIL` account) | Upload, download, delete | Connect and disconnect Google Drive; add, remove, disable and change roles of members |
| **Admin** | Upload, download, delete | See Google Drive status and the member list |
| **User** | Upload, download | None |

Only the superadmin and active members can sign in. Anyone else sees "not invited".

## Setup

1. Create the database and put its id in `wrangler.jsonc`:

   ```bash
   npx wrangler d1 create lumbung
   ```

2. Create a Google OAuth client, or reuse the one from the app that created the files (see below). Add these redirect URIs:

   - `http://localhost:8788/auth/callback` (local development)
   - `https://<your-worker>.workers.dev/auth/callback` (production)

3. Set the secrets:

   ```bash
   npx wrangler secret put SUPERADMIN_EMAIL
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

5. Sign in as the superadmin, then connect Google Drive under Settings.

### Adding members

The superadmin adds members under Settings → Members, choosing a role. The superadmin account itself is not stored in the database; it comes from the `SUPERADMIN_EMAIL` secret.

### Adding an app

Each app that stores files here is added under Settings → Apps by the superadmin: give it a name and a code (lowercase letters, digits, `-` or `_`). Lumbung shows the app's token once, when it is created, and keeps only its hash. The app sends the token as `Authorization: Bearer <token>`, and its files are filed under its code.

- An app can only list, upload, download and delete its own files.
- **New token** replaces the token; the old one stops working at once. **Revoke** stops the token, and the files stay.
- Silpasala is built in: its token is the `APP_TOKEN` secret (`wrangler secret put APP_TOKEN`), and it is shown in Settings but not managed there.

### Reusing an existing OAuth client

Google only lets an app see Drive files it created itself, so files uploaded through one OAuth client are not visible to another. To keep older files readable, use the same client ID and secret as the app that created them, and add this Worker's redirect URIs to that client.

## Local development

```bash
cp .dev.vars.example .dev.vars   # fill in the values; never commit this file
npm run db:migrate:local
npm run dev                      # http://localhost:8788
```

## API

All `/api/*` routes need a signed-in person with the role listed.

| Method | Path | Role | What it does |
| --- | --- | --- | --- |
| `GET` | `/api/me` | user | The signed-in person and their role |
| `GET` | `/api/drive` | admin | Whether Drive is connected, and as which account |
| `POST` | `/api/drive/disconnect` | superadmin | Disconnects Drive and revokes the token |
| `GET` | `/api/members` | admin | The members and the superadmin |
| `POST` | `/api/members` | superadmin | Adds or re-enables a member: `{ "email", "role" }` |
| `PATCH` | `/api/members/:email` | superadmin | Changes `role` (`admin` or `user`) or `status` (`active` or `disabled`) |
| `DELETE` | `/api/members/:email` | superadmin | Removes a member and signs them out |
| `GET` | `/api/apps` | admin | The apps, their file counts and status (tokens are never shown) |
| `POST` | `/api/apps` | superadmin | Adds an app: `{ "name", "slug" }`. Returns its token once |
| `POST` | `/api/apps/:slug/rotate` | superadmin | A new token for the app. Returns it once |
| `POST` | `/api/apps/:slug/revoke` | superadmin | Stops the app's token |
| `GET` | `/api/files` | user, or an app token | Files, newest first. Filter with `?app=` and `?project=` |
| `POST` | `/api/files` | user, or an app token | Upload. The body is the file. See the headers below |
| `GET` | `/api/files/:id` | user, or an app token | Download |
| `DELETE` | `/api/files/:id` | admin, or an app token | Move to the trash (removed from Drive after 30 days) |

Upload headers:

- `content-type`: the file's type
- `x-file-name`: the file name, URL-encoded
- `x-app`: the app the file belongs to (default `storage`). An app token always uploads as its own app
- `x-project`: the project within that app (optional)
- `x-ref`: the app's own reference, such as an issue key (optional)

App and project names may contain only letters, digits, `-` and `_` (up to 40 characters). Files are limited to 100 MB.

## Security notes

- Secrets live in Cloudflare (`wrangler secret put`), never in this repository. `.dev.vars` and `.wrangler/` are git-ignored.
- The Drive refresh token is encrypted at rest with a key derived from `SETTINGS_KEY`.
- Session cookies are `HttpOnly`, `Secure` and `SameSite=Lax`. Sessions store only a hash of the token.
- A member's role is read on every request, and disabling or removing a member signs them out.
