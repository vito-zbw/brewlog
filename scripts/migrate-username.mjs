// Adds a case-insensitive UNIQUE index on users.name. Idempotent
// (CREATE ... IF NOT EXISTS) and atomic — aborts BEFORE any write if existing
// data has case-insensitive duplicate names (the index would otherwise fail).
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-username.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-username: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const dupes = await db.execute(
  "SELECT lower(name) AS n, COUNT(*) AS c FROM users GROUP BY n HAVING c > 1"
);
if (dupes.rows.length > 0) {
  console.error(
    "migrate-username: ABORT — case-insensitive duplicate names exist; resolve them first:"
  );
  for (const row of dupes.rows) console.error(`  "${row.n}" x ${row.c}`);
  db.close();
  process.exit(1);
}

await db.executeMultiple(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_nocase ON users(name COLLATE NOCASE);"
);

console.log(`migrate-username: idx_users_name_nocase ensured on ${url}`);
db.close();
