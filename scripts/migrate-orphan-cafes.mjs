// One-time cleanup of orphaned cafés — cafés referenced by zero visits.
// Cafés are only ever created alongside a visit (the inline "新增咖啡馆" path
// in the log-a-visit form), so a visit-less café is always an orphan, e.g.
// left behind when its visits were deleted before deleteVisit learned to
// garbage-collect the parent café. Removes each orphan's photo rows too and
// logs their storage keys — the underlying R2/disk objects (if any) must be
// purged out-of-band, since this script is DB-only.
//
// Idempotent: a re-run finds no orphans and writes nothing. Atomic: all
// deletes run inside a single write transaction.
//
// NOTE: seed.sql intentionally ships one visit-less café ("Something For
// Café") to demo the map's gray "no visits" pin. Running this against a
// freshly seeded database WILL remove it — that is expected; this script is
// meant for the real production database, not the e2e/test DB.
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-orphan-cafes.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-orphan-cafes: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const orphans = await db.execute(
  "SELECT id FROM cafes WHERE NOT EXISTS (SELECT 1 FROM visits WHERE visits.cafe_id = cafes.id)"
);
const ids = orphans.rows.map((r) => Number(r["id"]));

if (ids.length === 0) {
  console.log(`migrate-orphan-cafes: no orphan cafés — nothing to do (${url}).`);
  db.close();
} else {
  const placeholders = ids.map(() => "?").join(", ");
  const photos = await db.execute({
    sql: `SELECT storage_key FROM photos WHERE entity_type = 'cafe' AND entity_id IN (${placeholders})`,
    args: ids,
  });
  const photoKeys = photos.rows.map((r) => r["storage_key"]);

  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: `DELETE FROM photos WHERE entity_type = 'cafe' AND entity_id IN (${placeholders})`,
      args: ids,
    });
    await tx.execute({
      sql: `DELETE FROM cafes WHERE id IN (${placeholders})`,
      args: ids,
    });
    await tx.commit();
  } finally {
    tx.close();
  }

  console.log(
    `migrate-orphan-cafes: removed ${ids.length} orphan café(s) [${ids.join(", ")}] and ${photoKeys.length} café photo row(s) on ${url}.`
  );
  if (photoKeys.length > 0) {
    console.log("migrate-orphan-cafes: purge these storage objects out-of-band:");
    for (const k of photoKeys) console.log(`  ${k}`);
  }
  db.close();
}
