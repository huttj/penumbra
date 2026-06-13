-- Penumbra Layer 1 store. Annotations are persisted as full W3C Web Annotation
-- JSON in `data`; the other columns are denormalized for querying/indexing.

CREATE TABLE IF NOT EXISTS users (
  id      TEXT PRIMARY KEY,        -- e.g. "github:12345", "google:1098...", "email:a@b.com"
  name    TEXT,
  email   TEXT,
  avatar  TEXT,
  via     TEXT,                    -- github | google | email
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token   TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created TEXT NOT NULL,
  expires TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_links (
  token   TEXT PRIMARY KEY,
  email   TEXT NOT NULL,
  return_to TEXT,
  created TEXT NOT NULL,
  expires TEXT NOT NULL,
  used    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS annotations (
  id          TEXT PRIMARY KEY,    -- full URL id, e.g. https://api.x/annotations/<uuid>
  source      TEXT NOT NULL,       -- normalized page permalink the annotation targets
  creator_id  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',   -- active | resolved | orphaned
  doc_version TEXT,                -- content hash / version at creation time
  created     TEXT NOT NULL,
  updated     TEXT,
  data        TEXT NOT NULL        -- full W3C Annotation JSON
);

CREATE INDEX IF NOT EXISTS idx_anno_source ON annotations(source, status);
CREATE INDEX IF NOT EXISTS idx_anno_creator ON annotations(creator_id);
