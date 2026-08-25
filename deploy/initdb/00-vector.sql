-- The pgvector image ships the extension but does not enable it in every
-- database it creates. `prisma db push` fails with `type "vector" does not
-- exist` when this is left to chance. Runs once, on an empty data directory.
CREATE EXTENSION IF NOT EXISTS vector;
