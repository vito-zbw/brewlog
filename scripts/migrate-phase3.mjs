// Migrates a Phase 1-2 database (text created_by/visited_by columns) to the
// Phase 3 shape (users table + user_id foreign keys), preserving all data
// and row ids. Fresh installs never need this — schema.sql already has the
// final shape.
//
// Usage: node --env-file-if-exists=.env.local scripts/migrate-phase3.mjs [url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
// BACK UP FIRST (copy the local db file, or `turso db shell brewlog .dump`).
// Edit scripts/user-mapping.json with real emails before running.
//
// Each table is rebuilt inside ONE write transaction (create + copy + verify
// + drop + rename), so a failure can never leave the database without a
// table. Already-migrated tables are skipped, making partial runs resumable.
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const urlArg = process.argv[2];
const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "migrate-phase3: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

// ---- 0. Load and validate the mapping --------------------------------------
const rawMapping = JSON.parse(readFileSync("scripts/user-mapping.json", "utf-8"));
delete rawMapping._comment;
const mapping = new Map();
for (const key of Object.keys(rawMapping)) {
  if (!Object.hasOwn(rawMapping, key)) continue;
  const entry = rawMapping[key];
  const email = typeof entry?.email === "string" ? entry.email.trim().toLowerCase() : "";
  if (!email.includes("@")) {
    console.error(`migrate-phase3: ABORT — mapping entry "${key}" has no valid email.`);
    process.exit(1);
  }
  mapping.set(key, { email, name: entry.name ?? key });
}
const emails = [...mapping.values()].map((m) => m.email);
if (new Set(emails).size !== emails.length) {
  console.error(
    "migrate-phase3: ABORT — duplicate emails in scripts/user-mapping.json would merge two people into one account."
  );
  process.exit(1);
}

async function tableExists(name) {
  const rs = await db.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [name],
  });
  return rs.rows.length > 0;
}

async function hasColumn(table, column) {
  const rs = await db.execute(`PRAGMA table_info(${table})`);
  return rs.rows.some((row) => row["name"] === column);
}

// ---- 1. Which tables still need migrating? (per-table idempotency) ---------
const CANDIDATES = [
  ["beans", "created_by"],
  ["cafes", "created_by"],
  ["visits", "visited_by"],
  ["photos", "created_by"],
];
const pending = [];
for (const [table, legacyColumn] of CANDIDATES) {
  if (!(await tableExists(table))) continue; // photos absent on pure Phase-1 DBs
  if (await hasColumn(table, legacyColumn)) pending.push([table, legacyColumn]);
}
if (pending.length === 0) {
  console.log("migrate-phase3: all tables already migrated — nothing to do.");
  process.exit(0);
}

// Mixed states (some tables migrated, some legacy) cannot happen via this
// script (the whole migration is one transaction) — refuse rather than guess.
const presentCandidates = [];
for (const [table] of CANDIDATES) {
  if (await tableExists(table)) presentCandidates.push(table);
}
if (pending.length !== presentCandidates.length) {
  console.error(
    "migrate-phase3: ABORT — mixed state: some tables already have user_id while others are legacy. Restore from backup and re-run."
  );
  process.exit(1);
}

// ---- 2. Pre-flight: every legacy name must be mapped ------------------------
const namesInDb = new Set();
for (const [table, column] of pending) {
  const rs = await db.execute(`SELECT DISTINCT ${column} AS n FROM ${table}`);
  for (const row of rs.rows) namesInDb.add(String(row["n"]));
}
const unmapped = [...namesInDb].filter((n) => !mapping.has(n));
if (unmapped.length > 0) {
  console.error(
    `migrate-phase3: ABORT — names with no entry in scripts/user-mapping.json: ${unmapped.join(", ")}`
  );
  process.exit(1);
}

// ---- 3. The migration — ONE transaction, FK-enforcement-agnostic ------------
// libsql may enforce foreign keys per connection (the local client defaults
// ON, and `PRAGMA foreign_keys` cannot change inside a transaction), and
// `defer_foreign_keys` still lets DROP TABLE fire ON DELETE CASCADE. So the
// rebuild never drops a referenced table: all rows are staged into
// constraint-free *_mig copies, originals are dropped children-before-parents,
// final tables are created parents-before-children, and rows are restored.
// One transaction means any failure rolls the database back untouched.
const FINAL_DDL = {
  beans: `CREATE TABLE beans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, origin_country TEXT NOT NULL, origin_region TEXT,
    farm TEXT, roaster TEXT,
    processing_method TEXT NOT NULL DEFAULT 'Other',
    roast_level TEXT NOT NULL DEFAULT 'Medium',
    tasting_notes_tags TEXT, tasting_notes_freetext TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  cafes: `CREATE TABLE cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, city TEXT NOT NULL, country TEXT NOT NULL,
    latitude REAL NOT NULL, longitude REAL NOT NULL, website TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  visits: `CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    visit_date DATE NOT NULL,
    brew_method TEXT NOT NULL,
    rating_overall INTEGER NOT NULL CHECK(rating_overall BETWEEN 1 AND 5),
    rating_bean_quality INTEGER NOT NULL CHECK(rating_bean_quality BETWEEN 1 AND 5),
    rating_barista_skill INTEGER NOT NULL CHECK(rating_barista_skill BETWEEN 1 AND 5),
    rating_ambiance INTEGER NOT NULL CHECK(rating_ambiance BETWEEN 1 AND 5),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  visit_beans: `CREATE TABLE visit_beans (
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    bean_id INTEGER NOT NULL REFERENCES beans(id),
    PRIMARY KEY (visit_id, bean_id)
  )`,
  photos: `CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('bean','cafe','visit')),
    entity_id INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    caption TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
};

const hasPhotos = presentCandidates.includes("photos");
const tx = await db.transaction("write");
try {
  // 3a. users table + rows from the mapping
  await tx.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    image TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  for (const { email, name } of mapping.values()) {
    await tx.execute({
      sql: "INSERT INTO users (email, name) VALUES (?, ?) ON CONFLICT(email) DO NOTHING",
      args: [email, name],
    });
  }
  const userIdByName = new Map();
  for (const [legacyName, { email }] of mapping.entries()) {
    const rs = await tx.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });
    userIdByName.set(legacyName, Number(rs.rows[0]["id"]));
  }
  const nameCase = (column) =>
    "CASE " +
    [...userIdByName.entries()]
      .map(([name, id]) => `WHEN ${column} = '${name.replaceAll("'", "''")}' THEN ${id}`)
      .join(" ") +
    " END";

  // 3b. Stage every row into constraint-free copies, capture counts
  const stageTables = ["visit_beans", ...presentCandidates];
  const counts = new Map();
  for (const t of stageTables) {
    await tx.execute(`DROP TABLE IF EXISTS ${t}_mig`);
    await tx.execute(`CREATE TABLE ${t}_mig AS SELECT * FROM ${t}`);
    counts.set(t, Number((await tx.execute(`SELECT COUNT(*) AS n FROM ${t}_mig`)).rows[0]["n"]));
  }

  // 3c. Drop originals, children before parents (never drops a referenced table)
  for (const t of ["visit_beans", "photos", "visits", "beans", "cafes"]) {
    if (t === "photos" && !hasPhotos) continue;
    await tx.execute(`DROP TABLE ${t}`);
  }

  // 3d. Recreate final tables parents-first and restore rows
  const restores = [
    ["beans", `INSERT INTO beans
       SELECT id, name, origin_country, origin_region, farm, roaster,
              processing_method, roast_level, tasting_notes_tags,
              tasting_notes_freetext, ${nameCase("created_by")}, created_at
       FROM beans_mig`],
    ["cafes", `INSERT INTO cafes
       SELECT id, name, city, country, latitude, longitude, website,
              ${nameCase("created_by")}, created_at
       FROM cafes_mig`],
    ["visits", `INSERT INTO visits
       SELECT id, cafe_id, ${nameCase("visited_by")}, visit_date, brew_method,
              rating_overall, rating_bean_quality, rating_barista_skill,
              rating_ambiance, notes, created_at
       FROM visits_mig`],
    ["visit_beans", "INSERT INTO visit_beans SELECT visit_id, bean_id FROM visit_beans_mig"],
    ...(hasPhotos
      ? [["photos", `INSERT INTO photos
           SELECT id, entity_type, entity_id, storage_key, content_type, caption,
                  ${nameCase("created_by")}, created_at
           FROM photos_mig`]]
      : []),
  ];
  for (const [t, restoreSql] of restores) {
    await tx.execute(FINAL_DDL[t]);
    await tx.execute(restoreSql);
    const after = Number((await tx.execute(`SELECT COUNT(*) AS n FROM ${t}`)).rows[0]["n"]);
    if (after !== counts.get(t)) {
      throw new Error(`${t} row count mismatch (${counts.get(t)} -> ${after})`);
    }
  }

  // 3e. Drop staging copies and recreate indexes
  for (const t of stageTables) {
    await tx.execute(`DROP TABLE ${t}_mig`);
  }
  for (const idxSql of [
    "CREATE INDEX idx_beans_origin ON beans(origin_country)",
    "CREATE INDEX idx_beans_roaster ON beans(roaster)",
    "CREATE INDEX idx_cafes_city ON cafes(city)",
    "CREATE INDEX idx_visits_cafe ON visits(cafe_id)",
    "CREATE INDEX idx_visits_date ON visits(visit_date DESC)",
    "CREATE INDEX idx_visits_user ON visits(user_id)",
    ...(hasPhotos ? ["CREATE INDEX idx_photos_entity ON photos(entity_type, entity_id)"] : []),
  ]) {
    await tx.execute(idxSql);
  }

  await tx.commit();
  for (const t of stageTables) {
    console.log(`migrate-phase3: ${t} rebuilt (${counts.get(t)} rows)`);
  }
  console.log(
    `migrate-phase3: done. Users: ${[...userIdByName.entries()]
      .map(([name, id]) => `${name}=#${id}`)
      .join(", ")}`
  );
} catch (err) {
  await tx.rollback().catch(() => {});
  console.error(
    `migrate-phase3: ABORT — ${err.message}. The transaction rolled back; the database is unchanged. Re-run after fixing the cause.`
  );
  process.exit(1);
} finally {
  tx.close();
}
db.close();
