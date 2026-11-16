/** Bindings and secrets of the Lumbung Worker. Secrets are set with `wrangler secret put` (see README). */
export interface Env {
  DB: D1Database;
  /** The superadmin's Google account. Manages members and connects Google Drive. */
  SUPERADMIN_EMAIL: string;
  /** Google OAuth client: the same one Silpasala uses, so files it created stay readable (drive.file scope). */
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** Encrypts the stored Drive token. Changing it disconnects Drive (the superadmin connects again). */
  SETTINGS_KEY?: string;
  /** Token for the Silpasala app: it may only upload, download and delete its own files (app = silpasala). */
  APP_TOKEN?: string;
}
