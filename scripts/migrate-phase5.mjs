// Adds the Phase 5 users.password_hash column (site-wide email/password
// login) to an existing database. Purely additive and idempotent: SQLite has
// no `ADD COLUMN IF NOT EXISTS`, so we check PRAGMA table_info first and skip
// when the column is already present. A bare ADD COLUMN is atomic on its own.
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-phase5.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-phase5: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const cols = await db.execute("PRAGMA table_info(users)");
if (cols.rows.some((row) => row["name"] === "password_hash")) {
  console.log(`migrate-phase5: users.password_hash already present — nothing to do (${url}).`);
} else {
  await db.execute("ALTER TABLE users ADD COLUMN password_hash TEXT");
  console.log(`migrate-phase5: users.password_hash added on ${url}`);
}
db.close();
