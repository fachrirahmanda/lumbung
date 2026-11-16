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
| `GET` | `/api/files` | user | Files, newest first. Filter with `?app=` and `?project=` |
| `POST` | `/api/files` | user | Upload. The body is the file. See the headers below |
| `GET` | `/api/files/:id` | user | Download |
| `DELETE` | `/api/files/:id` | admin | Delete the file here and in Drive |

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
- Session cookies are `HttpOnly`, `Secure` and `SameSite=Lax`. Sessions store only a hash of the token.
- A member's role is read on every request, and disabling or removing a member signs them out.
