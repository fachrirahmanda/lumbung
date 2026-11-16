-- Storage worker schema. Google Drive holds the bytes; this holds the settings and the file list.

-- Drive connection and other settings: drive.refresh_token (encrypted), drive.folder_id, drive.email, drive.connected_at.
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Signed-in admin sessions. Only a hash of the token is stored.
CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- One row per stored file. `source` says who put it there (this app, or a connected platform later).
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  drive_file_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'storage',
  uploaded_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX files_created ON files (created_at DESC);
