-- Track when each response was last flushed (committed) to the repo, so the
-- periodic flush only commits docs that actually changed.
ALTER TABLE responses ADD COLUMN flushed TEXT;
