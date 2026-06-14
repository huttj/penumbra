-- Response documents: one evolving markdown doc per (page, reader). The grown-up
-- form of a comment — quotes of the source text + the reader's own writing.
CREATE TABLE IF NOT EXISTS responses (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,        -- the page this responds to
  creator_id  TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',   -- markdown essay
  quotes      TEXT NOT NULL DEFAULT '[]', -- JSON: [{id, selector, text, dismissed}]
  source_sha  TEXT,                 -- repo commit SHA of the source when last edited
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | submitted
  created     TEXT NOT NULL,
  updated     TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_uniq ON responses(source, creator_id);
CREATE INDEX IF NOT EXISTS idx_responses_source ON responses(source);
