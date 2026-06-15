// Drops the now-unused cafes.website column. Idempotent: SQLite has no
// `DROP COLUMN IF EXISTS`, so we check PRAGMA table_info first and skip when
// the column is already gone. A bare DROP COLUMN is atomic on its own.
//
// ORDERING — this is a DESTRUCTIVE column drop, so it inverts the usual
// "migrate before push" rule: deploy the code that no longer references
// `website` FIRST, then run this. The previously deployed createCafe still
// INSERTs into `website`; dropping the column before that code is gone would
// 500 every café creation.
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-drop-cafe-website.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-drop-cafe-website: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const cols = await db.execute("PRAGMA table_info(cafes)");
if (!cols.rows.some((row) => row["name"] === "website")) {
  console.log(`migrate-drop-cafe-website: cafes.website already gone — nothing to do (${url}).`);
} else {
  await db.execute("ALTER TABLE cafes DROP COLUMN website");
  console.log(`migrate-drop-cafe-website: cafes.website dropped on ${url}`);
}
db.close();
