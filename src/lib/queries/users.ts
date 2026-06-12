import { db } from "@/lib/db";
import type { Bean, User } from "@/types";
import { mapRows, firstRow } from "./util";

export interface FavoriteBean extends Bean {
  times_logged: number;
}

export async function getUserById(id: number): Promise<User | null> {
  return firstRow<User>(
    await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] })
  );
}

export async function getUserByName(name: string): Promise<User | null> {
  return firstRow<User>(
    await db.execute({
      sql: "SELECT * FROM users WHERE name = ? ORDER BY id LIMIT 1",
      args: [name],
    })
  );
}

export async function listUsers(): Promise<User[]> {
  return mapRows<User>(await db.execute("SELECT * FROM users ORDER BY id"));
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
