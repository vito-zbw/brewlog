import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { test, expect } from "../../helpers/fixtures";

// Verifies scripts/migrate-phase3.mjs data integrity — pure Node, no browser
// (no page/context fixture is requested, so Playwright never launches one).
// A throwaway LEGACY-shaped db (text created_by/visited_by, no users table)
// is built under data/, migrated by running the real script as a child
// process, then inspected with a fresh @libsql/client connection. The shared
// test.db / seed rows are never touched.

const DB_FILE = path.resolve("data/migration-test.db");
const DB_URL = `file:${DB_FILE}`;
const SCRIPT_PATH = path.resolve("scripts/migrate-phase3.mjs");

// From scripts/user-mapping.json (default entries).
const MAPPED_USER_NAMES = ["Baiwei", "Friend1", "Friend2"] as const;

// Legacy Phase 1-2 schema (the exact columns the migration's copy SELECTs
// read) plus a small fixture: 2 beans (Baiwei/Friend1), 1 cafe (Baiwei),
// 3 visits (Baiwei, Baiwei, Friend2), 2 visit_beans rows, 1 photo (Friend2).
const LEGACY_FIXTURE_SQL = `
  CREATE TABLE beans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    origin_country TEXT NOT NULL,
    origin_region TEXT,
    farm TEXT,
    roaster TEXT,
    processing_method TEXT NOT NULL DEFAULT 'Other',
    roast_level TEXT NOT NULL DEFAULT 'Medium',
    tasting_notes_tags TEXT,
    tasting_notes_freetext TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE cafes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    website TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id),
    visited_by TEXT NOT NULL,
    visit_date DATE NOT NULL,
    brew_method TEXT NOT NULL,
    rating_overall INTEGER NOT NULL CHECK(rating_overall BETWEEN 1 AND 5),
    rating_bean_quality INTEGER NOT NULL CHECK(rating_bean_quality BETWEEN 1 AND 5),
    rating_barista_skill INTEGER NOT NULL CHECK(rating_barista_skill BETWEEN 1 AND 5),
    rating_ambiance INTEGER NOT NULL CHECK(rating_ambiance BETWEEN 1 AND 5),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE visit_beans (
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    bean_id INTEGER NOT NULL REFERENCES beans(id),
    PRIMARY KEY (visit_id, bean_id)
  );
  CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('bean','cafe','visit')),
    entity_id INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    caption TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO beans (id, name, origin_country, origin_region, processing_method, roast_level, created_by)
    VALUES (1, 'Migration Bean A', 'Ethiopia', 'Yirgacheffe', 'Washed', 'Light', 'Baiwei');
  INSERT INTO beans (id, name, origin_country, processing_method, roast_level, created_by)
    VALUES (2, 'Migration Bean B', 'Colombia', 'Natural', 'Medium', 'Friend1');
  INSERT INTO cafes (id, name, city, country, latitude, longitude, created_by)
    VALUES (1, 'Migration Cafe', 'Guangzhou', 'China', 23.1291, 113.2644, 'Baiwei');
  INSERT INTO visits (id, cafe_id, visited_by, visit_date, brew_method,
                      rating_overall, rating_bean_quality, rating_barista_skill, rating_ambiance, notes)
    VALUES (1, 1, 'Baiwei', '2026-01-10', 'V60', 4, 4, 4, 4, 'first legacy visit'),
           (2, 1, 'Baiwei', '2026-02-15', 'Espresso', 5, 5, 4, 3, NULL),
           (3, 1, 'Friend2', '2026-03-20', 'Aeropress', 3, 3, 3, 3, 'friend2 legacy visit');
  INSERT INTO visit_beans (visit_id, bean_id) VALUES (1, 1), (2, 2);
  INSERT INTO photos (id, entity_type, entity_id, storage_key, content_type, created_by)
    VALUES (1, 'visit', 3, 'visits/migration-test.jpg', 'image/jpeg', 'Friend2');
`;

function removeDbFiles(): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${DB_FILE}${suffix}`, { force: true });
  }
}

function runMigration(): string {
  return execFileSync("node", [SCRIPT_PATH, DB_URL], { encoding: "utf-8" });
}

async function tableColumns(client: Client, table: string): Promise<string[]> {
  const rs = await client.execute(`PRAGMA table_info(${table})`);
  return rs.rows.map((row) => String(row["name"]));
}

async function countRows(client: Client, table: string): Promise<number> {
  const rs = await client.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(rs.rows[0]["n"]);
}

async function userIdFor(client: Client, name: string): Promise<number> {
  const rs = await client.execute({
    sql: "SELECT id FROM users WHERE name = ?",
    args: [name],
  });
  expect(rs.rows).toHaveLength(1);
  return Number(rs.rows[0]["id"]);
}

let db: Client | undefined;

function migratedDb(): Client {
  if (!db) throw new Error("beforeAll did not open the migrated db client");
  return db;
}

test.describe("phase3 migration — migrate-phase3.mjs data integrity", () => {
  test.beforeAll(async () => {
    removeDbFiles();
    const legacy = createClient({ url: DB_URL });
    try {
      await legacy.executeMultiple(LEGACY_FIXTURE_SQL);
    } finally {
      legacy.close();
    }

    const stdout = runMigration();
    expect(stdout).toContain("migrate-phase3: done.");

    db = createClient({ url: DB_URL });
  });

  test.afterAll(async () => {
    db?.close();
    db = undefined;
    removeDbFiles();
  });

  test("creates the users table with the 3 mapped users", async () => {
    const client = migratedDb();
    const rs = await client.execute("SELECT name FROM users ORDER BY name");
    const names = rs.rows.map((row) => String(row["name"]));
    expect(names).toEqual([...MAPPED_USER_NAMES]);
  });

  test("migrated tables have user_id and no legacy text column", async () => {
    const client = migratedDb();
    const legacyColumnByTable: Record<string, string> = {
      beans: "created_by",
      cafes: "created_by",
      visits: "visited_by",
      photos: "created_by",
    };
    for (const [table, legacyColumn] of Object.entries(legacyColumnByTable)) {
      const columns = await tableColumns(client, table);
      expect(columns, `${table} should gain user_id`).toContain("user_id");
      expect(
        columns,
        `${table} should drop ${legacyColumn}`
      ).not.toContain(legacyColumn);
    }
  });

  test("preserves every row in every table", async () => {
    const client = migratedDb();
    expect(await countRows(client, "beans")).toBe(2);
    expect(await countRows(client, "cafes")).toBe(1);
    expect(await countRows(client, "visits")).toBe(3);
    expect(await countRows(client, "visit_beans")).toBe(2);
    expect(await countRows(client, "photos")).toBe(1);
  });

  test("maps legacy names to the correct user_id on every row", async () => {
    const client = migratedDb();
    const baiweiId = await userIdFor(client, "Baiwei");
    const friend1Id = await userIdFor(client, "Friend1");
    const friend2Id = await userIdFor(client, "Friend2");

    const visits = await client.execute(
      "SELECT id, user_id FROM visits ORDER BY id"
    );
    const visitOwners = visits.rows.map((row) => [
      Number(row["id"]),
      Number(row["user_id"]),
    ]);
    expect(visitOwners).toEqual([
      [1, baiweiId],
      [2, baiweiId],
      [3, friend2Id],
    ]);

    const beans = await client.execute(
      "SELECT id, user_id FROM beans ORDER BY id"
    );
    const beanOwners = beans.rows.map((row) => [
      Number(row["id"]),
      Number(row["user_id"]),
    ]);
    expect(beanOwners).toEqual([
      [1, baiweiId],
      [2, friend1Id],
    ]);

    const cafe = await client.execute("SELECT user_id FROM cafes WHERE id = 1");
    expect(Number(cafe.rows[0]["user_id"])).toBe(baiweiId);

    const photo = await client.execute(
      "SELECT user_id FROM photos WHERE id = 1"
    );
    expect(Number(photo.rows[0]["user_id"])).toBe(friend2Id);
  });

  test("re-running the script is a no-op (idempotent)", async () => {
    // execFileSync throws on a non-zero exit code, so reaching the
    // assertions below proves the second run exited 0.
    const stdout = runMigration();
    expect(stdout).toContain("already migrated");

    const client = migratedDb();
    expect(await countRows(client, "users")).toBe(3);
    expect(await countRows(client, "visits")).toBe(3);
  });

  test("leaves zero orphaned user_id references", async () => {
    const client = migratedDb();
    for (const table of ["beans", "cafes", "visits", "photos"]) {
      const rs = await client.execute(
        `SELECT COUNT(*) AS n FROM ${table} WHERE user_id NOT IN (SELECT id FROM users)`
      );
      expect(Number(rs.rows[0]["n"]), `${table} has orphaned user_id`).toBe(0);
    }
  });
});
