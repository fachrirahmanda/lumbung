-- Deleting a file marks it here first; the file is removed from Drive after 30 days (see the scheduled purge).
ALTER TABLE files ADD COLUMN deleted_at INTEGER;
CREATE INDEX files_live ON files (deleted_at);
