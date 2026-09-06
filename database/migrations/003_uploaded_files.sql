-- 003_uploaded_files.sql — store uploaded images in the database so they
-- survive redeploys/restarts of ephemeral hosting filesystems.

CREATE TABLE IF NOT EXISTS uploaded_files (
  path        TEXT PRIMARY KEY,
  mime        TEXT NOT NULL,
  bytes       BYTEA NOT NULL,
  size_bytes  INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
