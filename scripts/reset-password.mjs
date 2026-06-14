// Manually set or reset a user's email/password — the $0 stand-in for a
// "forgot password" email flow. Run by an operator with database access:
// the operator's identity is implicitly trusted, so this is the ONE safe
// place to write a password onto a pre-existing account (registration is not).
//
// Usage:
//   npm run reset-password -- <email> <new-password>
//   node scripts/reset-password.mjs <email> <new-password> [database-url]
// For a remote Turso URL, TURSO_AUTH_TOKEN must be set in the environment.
import { createClient } from "@libsql/client";
import { randomBytes, scryptSync } from "node:crypto";

const email = process.argv[2];
const password = process.argv[3];
const urlArg = process.argv[4];

if (!email || !password) {
  console.error(
    "Usage: node scripts/reset-password.mjs <email> <new-password> [database-url]"
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("reset-password: ABORT — password must be at least 8 characters.");
  process.exit(1);
}

const url = urlArg ?? process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";
if (!url.startsWith("file:") && !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "reset-password: ABORT — remote database URL without TURSO_AUTH_TOKEN in the environment."
  );
  process.exit(1);
}

// Must match src/lib/password.ts exactly: "scrypt$<saltHex>$<hashHex>", keylen 64.
function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const lowered = email.toLowerCase();
const rs = await db.execute({
  sql: "UPDATE users SET password_hash = ? WHERE email = ?",
  args: [hashPassword(password), lowered],
});

if (rs.rowsAffected === 0) {
  console.error(
    `reset-password: no user with email ${lowered} — ask them to register first.`
  );
  db.close();
  process.exit(1);
}

console.log(`reset-password: password updated for ${lowered} on ${url}`);
db.close();
