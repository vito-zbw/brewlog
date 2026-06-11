// Applies schema.sql (and optionally seed.sql) to the database.
// Usage: node scripts/init-db.mjs [url] [--seed] [--reset]
//   url       overrides TURSO_DATABASE_URL (default file:./data/brewlog.db)
//   --seed    also apply seed.sql
//   --reset   delete the local db file first (file: URLs only)
import { createClient } from "@libsql/client";
import { readFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const urlArg = args.find((a) => !a.startsWith("--"));
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";

if (flags.has("--reset")) {
  if (!url.startsWith("file:")) {
    console.error("--reset is only supported for file: URLs (never a cloud database)");
    process.exit(1);
  }
  const filePath = url.slice("file:".length);
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(filePath + suffix, { force: true });
  }
}

if (url.startsWith("file:")) {
  mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
}

const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

await db.executeMultiple(readFileSync("schema.sql", "utf-8"));
if (flags.has("--seed")) {
  // seed.sql is not idempotent (hardcoded ids) and executeMultiple is not
  // transactional — refuse to seed a non-empty database.
  const existing = await db.execute("SELECT COUNT(*) AS n FROM beans");
  if (Number(existing.rows[0]["n"]) > 0) {
    console.error(
      "init-db: refusing to seed — beans table already has rows. " +
        "Use `npm run db:reset` for a clean local database, or clear the cloud database manually."
    );
    process.exit(1);
  }
  await db.executeMultiple(readFileSync("seed.sql", "utf-8"));
}

console.log(`init-db: schema${flags.has("--seed") ? " + seed" : ""} applied to ${url}`);
db.close();
