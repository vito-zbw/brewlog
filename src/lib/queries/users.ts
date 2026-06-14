import { db } from "@/lib/db";
import type { Bean, User } from "@/types";
import { mapRows, firstRow } from "./util";

export interface FavoriteBean extends Bean {
  times_logged: number;
}

/** A user row including the password hash — for credential checks ONLY. */
export interface UserWithHash extends User {
  password_hash: string | null;
}

// Explicit column list (never SELECT *) so password_hash can never ride along
// into a User object that reaches the client. Only getUserByEmailWithHash
// below selects the hash, into a separate hash-bearing type.
const USER_COLUMNS = "id, email, name, image, created_at";

export async function getUserById(id: number): Promise<User | null> {
  return firstRow<User>(
    await db.execute({
      sql: `SELECT ${USER_COLUMNS} FROM users WHERE id = ?`,
      args: [id],
    })
  );
}

export async function getUserByName(name: string): Promise<User | null> {
  return firstRow<User>(
    await db.execute({
      sql: `SELECT ${USER_COLUMNS} FROM users WHERE name = ? ORDER BY id LIMIT 1`,
      args: [name],
    })
  );
}

export async function listUsers(): Promise<User[]> {
  return mapRows<User>(
    await db.execute(`SELECT ${USER_COLUMNS} FROM users ORDER BY id`)
  );
}

/** Looks up a user (with their password hash) by email, for credential auth. */
export async function getUserByEmailWithHash(
  email: string
): Promise<UserWithHash | null> {
  return firstRow<UserWithHash>(
    await db.execute({
      sql: "SELECT id, email, name, image, password_hash, created_at FROM users WHERE email = ?",
      args: [email.toLowerCase()],
    })
  );
}

/**
 * Creates a brand-new email/password account, returning its id — or null if
 * the email is already taken. Uses ON CONFLICT DO NOTHING so registration can
 * NEVER set a password on a pre-existing row (e.g. an OAuth user's email);
 * doing so would let an attacker claim someone else's account. Setting a
 * password on an existing account is only safe from a proven session.
 */
export async function createPasswordUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<number | null> {
  const rs = await db.execute({
    sql: `INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)
          ON CONFLICT(email) DO NOTHING
          RETURNING id`,
    args: [email.toLowerCase(), name, passwordHash],
  });
  const row = firstRow<{ id: number }>(rs);
  return row ? Number(row.id) : null;
}

/** The beans this user has logged most often across their visits. */
export async function getUserFavoriteBeans(
  userId: number,
  limit = 5
): Promise<FavoriteBean[]> {
  const rs = await db.execute({
    sql: `SELECT b.*, COUNT(*) AS times_logged
          FROM beans b
          JOIN visit_beans vb ON vb.bean_id = b.id
          JOIN visits v ON v.id = vb.visit_id
          WHERE v.user_id = ?
          GROUP BY b.id
          ORDER BY times_logged DESC, b.name
          LIMIT ?`,
    args: [userId, limit],
  });
  return mapRows<FavoriteBean>(rs);
}

/**
 * Links an OAuth sign-in to a user row by email, creating one on first
 * sign-in. Emails are normalized to lowercase (providers vary in casing and
 * SQLite UNIQUE is byte-sensitive — a case mismatch would split one person
 * into two accounts). The display name is only set on INSERT — OAuth profile
 * names must not overwrite curated names (dev login looks users up by name).
 * The avatar only updates when the provider supplies one.
 */
export async function upsertUserByEmail(
  email: string,
  name: string,
  image: string | null
): Promise<number> {
  const rs = await db.execute({
    sql: `INSERT INTO users (email, name, image) VALUES (?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET image = COALESCE(excluded.image, image)
          RETURNING id`,
    args: [email.toLowerCase(), name, image],
  });
  return Number(rs.rows[0]["id"]);
}
