-- Apps that store files in Lumbung (Silpasala is built in with APP_TOKEN). Each app has its own token;
-- only a hash of the token is kept, so it is shown once, when created or replaced.
CREATE TABLE apps (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  rotated_at INTEGER,
  revoked_at INTEGER
);
