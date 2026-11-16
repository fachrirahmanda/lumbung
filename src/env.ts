/** Bindings and secrets of the storage Worker. Secrets are set with `wrangler secret put` (see README). */
export interface Env {
  DB: D1Database;
  /** The one admin allowed to sign in. */
  ADMIN_EMAIL: string;
  /** Google OAuth client: the same one Silpasala uses, so files it created stay readable (drive.file scope). */
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** Encrypts the stored Drive token. Changing it disconnects Drive (the admin connects again). */
  SETTINGS_KEY?: string;
}
