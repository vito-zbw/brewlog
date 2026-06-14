import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Site-wide email/password auth (Phase 5). Hashes use Node's built-in scrypt:
// zero dependencies, no native build, and fine on Vercel's Node runtime. The
// stored value is self-describing — "scrypt$<saltHex>$<hashHex>" — so a future
// parameter change can stay verifiable against old hashes.
//
// IMPORTANT: this module imports node:crypto and must only be used from the
// Node runtime (src/auth.ts, API routes, server actions) — NEVER from the
// edge-safe src/auth.config.ts that src/proxy.ts loads at the edge.

const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// A fixed hash to verify against when no account (or no password) exists, so
// the "no such user" path costs the same scrypt work as a real check. Without
// it, login latency would reveal which emails are registered.
const DUMMY_HASH = hashPassword("brewlog-constant-timing-dummy");

export function verifyPassword(plain: string, stored: string | null): boolean {
  const valid = typeof stored === "string" && stored.startsWith("scrypt$");
  const usable = valid ? (stored as string) : DUMMY_HASH;
  const [, saltHex, hashHex] = usable.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(plain, Buffer.from(saltHex, "hex"), expected.length);
  const matches =
    expected.length === actual.length && timingSafeEqual(expected, actual);
  // Only a real stored hash can authenticate — never the dummy.
  return valid && matches;
}
