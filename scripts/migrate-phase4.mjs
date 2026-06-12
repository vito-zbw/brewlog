// Adds the Phase 4 tables (follows, crawls, crawl_visits) to an existing
// database. Purely additive — safe to run on any Phase 3 database, local or
// cloud, and idempotent (CREATE ... IF NOT EXISTS throughout).
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-phase4.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-phase4: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL REFERENCES users(id),
      following_id INTEGER NOT NULL REFERENCES users(id),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id <> following_id)
  );
  CREATE TABLE IF NOT EXISTS crawls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      crawl_date DATE NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS crawl_visits (
      crawl_id INTEGER NOT NULL REFERENCES crawls(id) ON DELETE CASCADE,
      visit_id INTEGER NOT NULL REFERENCES visits(id),
      stop_order INTEGER NOT NULL,
      PRIMARY KEY (crawl_id, visit_id)
  );
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_crawls_user ON crawls(user_id);
`);

console.log(`migrate-phase4: follows/crawls/crawl_visits ensured on ${url}`);
db.close();
