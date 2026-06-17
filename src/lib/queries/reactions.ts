import { db } from "@/lib/db";
import type { ReactionSummary, SocialResourceType } from "@/types";
import { firstRow } from "./util";

/**
 * Adds the viewer's 👍 (idempotent via the composite PK). Returns whether a new
 * row was actually created, so the caller only fans out a notification on a
 * genuine first-time like (not a repeated POST).
 */
export async function addReaction(
  userId: number,
  type: SocialResourceType,
  id: number
): Promise<{ created: boolean }> {
  const rs = await db.execute({
    sql: `INSERT INTO reactions (user_id, resource_type, resource_id) VALUES (?, ?, ?)
          ON CONFLICT(user_id, resource_type, resource_id) DO NOTHING`,
    args: [userId, type, id],
  });
  return { created: rs.rowsAffected > 0 };
}

export async function removeReaction(
  userId: number,
  type: SocialResourceType,
  id: number
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM reactions WHERE user_id = ? AND resource_type = ? AND resource_id = ?",
    args: [userId, type, id],
  });
}

/** Total like count for a resource, plus whether `viewerId` has liked it. */
export async function getReactionSummary(
  type: SocialResourceType,
  id: number,
  viewerId?: number
): Promise<ReactionSummary> {
  const count =
    firstRow<{ n: number }>(
      await db.execute({
        sql: "SELECT COUNT(*) AS n FROM reactions WHERE resource_type = ? AND resource_id = ?",
        args: [type, id],
      })
    )?.n ?? 0;
  let reacted = false;
  if (viewerId !== undefined) {
    const r = await db.execute({
      sql: "SELECT 1 FROM reactions WHERE user_id = ? AND resource_type = ? AND resource_id = ?",
      args: [viewerId, type, id],
    });
    reacted = r.rows.length > 0;
  }
  return { count, reacted };
}
