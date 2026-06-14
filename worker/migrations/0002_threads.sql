-- Comments vs emoji reactions, and author-acknowledgement of threads.
ALTER TABLE annotations ADD COLUMN kind TEXT NOT NULL DEFAULT 'comment';        -- comment | emoji
ALTER TABLE annotations ADD COLUMN acknowledged INTEGER NOT NULL DEFAULT 0;      -- author has read/ack'd
