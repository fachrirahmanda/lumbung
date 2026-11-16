-- Which app a file belongs to (silpasala, or a platform connected later) and, within it, which project.
-- `ref` is free text the app uses to find its own record (for example an issue number).
ALTER TABLE files RENAME COLUMN source TO app;
ALTER TABLE files ADD COLUMN project TEXT;
ALTER TABLE files ADD COLUMN ref TEXT;
CREATE INDEX files_scope ON files (app, project, created_at DESC);
