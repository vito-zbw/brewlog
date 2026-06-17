import { db } from "@/lib/db";
import type { SocialResourceType } from "@/types";

// Existence + ownership lookups for the polymorphic social objects that
// comments, reactions, and notifications attach to (visits, beans, crawls).
// Mirrors the photos.ts ENTITY_TABLES pattern: the table name comes ONLY from
// this fixed map keyed by the already-validated enum — never from request
// input — so the interpolation below can't be an injection vector. libsql does
// not enforce foreign keys, so these guards are how we keep social rows from
// pointing at nonexistent resources.

const SOCIAL_ENTITY_TABLES: Record<SocialResourceType, string> = {
  visit: "visits",
  bean: "beans",
  crawl: "crawls",
};

/** Runtime guard: is `x` one of the three valid social resource types? */
export function isSocialResourceType(x: unknown): x is SocialResourceType {
  return x === "visit" || x === "bean" || x === "crawl";
}

export async function socialEntityExists(
  type: SocialResourceType,
  id: number
): Promise<boolean> {
  const rs = await db.execute({
    sql: `SELECT 1 FROM ${SOCIAL_ENTITY_TABLES[type]} WHERE id = ? LIMIT 1`,
    args: [id],
  });
  return rs.rows.length > 0;
}

/** The owning user_id of a social resource, or null if it doesn't exist. */
export async function socialEntityOwner(
  type: SocialResourceType,
  id: number
): Promise<number | null> {
  const rs = await db.execute({
    sql: `SELECT user_id FROM ${SOCIAL_ENTITY_TABLES[type]} WHERE id = ? LIMIT 1`,
    args: [id],
  });
  if (rs.rows.length === 0) return null;
  return rs.rows[0].user_id as number;
}
