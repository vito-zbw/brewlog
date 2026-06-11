import { createClient } from "@libsql/client";

// Local dev and tests fall back to a file-based database so the app (and
// `next build`) never requires cloud credentials. Production sets
// TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (see docs/setup/turso-setup.md).
// Seeding is manual via `npm run db:seed` — never on app startup.
const url = process.env.TURSO_DATABASE_URL ?? "file:./data/brewlog.db";

export const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN
    ? { authToken: process.env.TURSO_AUTH_TOKEN }
    : {}),
});
