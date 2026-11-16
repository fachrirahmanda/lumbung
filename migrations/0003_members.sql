-- Who may sign in besides the superadmin (the superadmin is set by the SUPERADMIN_EMAIL secret, not stored here).
-- Only active members can sign in. Roles: admin (sees members, deletes files) or user (uploads and downloads files).
CREATE TABLE members (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  invited_by TEXT,
  created_at INTEGER NOT NULL
);
