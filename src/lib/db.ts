import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "brewlog.db");
const SCHEMA_PATH = path.join(process.cwd(), "data", "schema.sql");
const SEED_PATH = path.join(process.cwd(), "data", "seed.sql");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const isNew = !fs.existsSync(DB_PATH);
  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  if (isNew) {
    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    dbInstance.exec(schema);

    if (fs.existsSync(SEED_PATH)) {
      const seed = fs.readFileSync(SEED_PATH, "utf-8");
      dbInstance.exec(seed);
    }
  }

  return dbInstance;
}
