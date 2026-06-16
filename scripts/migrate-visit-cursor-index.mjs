// Adds the composite index backing keyset pagination of the visit lists
// (/visits and /feed): (visit_date DESC, id DESC). Purely additive and
// idempotent (CREATE INDEX IF NOT EXISTS) — safe to run on any database, local
// or cloud, and a no-op on re-run. Obeys the migrate-first rule, though the new
// keyset queries return correct results without it (it only removes a sort
// step), so deploy ordering is not load-bearing here.
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-visit-cursor-index.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-visit-cursor-index: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

await db.executeMultiple(`
  CREATE INDEX IF NOT EXISTS idx_visits_date_id ON visits(visit_date DESC, id DESC);
`);

console.log(`migrate-visit-cursor-index: idx_visits_date_id ensured on ${url}`);
db.close();
