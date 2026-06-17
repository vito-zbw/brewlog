// Adds the Phase 6 tables (comments, reactions, notifications) to an existing
// database. Purely additive — safe to run on any Phase 4/5 database, local or
// cloud, and idempotent (CREATE ... IF NOT EXISTS throughout). A failure leaves
// the database unchanged.
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-phase6.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-phase6: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL CHECK(resource_type IN ('visit','bean','crawl')),
      resource_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_comments_resource
      ON comments(resource_type, resource_id, created_at, id);

  CREATE TABLE IF NOT EXISTS reactions (
      user_id INTEGER NOT NULL REFERENCES users(id),
      resource_type TEXT NOT NULL CHECK(resource_type IN ('visit','bean','crawl')),
      resource_id INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, resource_type, resource_id)
  );
  CREATE INDEX IF NOT EXISTS idx_reactions_resource
      ON reactions(resource_type, resource_id);

  CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      event_type TEXT NOT NULL CHECK(event_type IN ('follow','follow_back','comment','reaction')),
      actor_id INTEGER NOT NULL REFERENCES users(id),
      resource_type TEXT CHECK(resource_type IN ('visit','bean','crawl')),
      resource_id INTEGER,
      read_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (actor_id <> user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON notifications(user_id, created_at DESC, id DESC);
`);

console.log(`migrate-phase6: comments/reactions/notifications ensured on ${url}`);
db.close();
