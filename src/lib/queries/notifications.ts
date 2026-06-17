import { db } from "@/lib/db";
import type {
  NotificationCursor,
  NotificationEventType,
  NotificationsPage,
  NotificationView,
  SocialResourceType,
} from "@/types";
import { mapRows, firstRow } from "./util";

const DEFAULT_PAGE_SIZE = 20;

export interface NewNotificationInput {
  userId: number; // recipient
  eventType: NotificationEventType;
  actorId: number; // who triggered it
  resourceType?: SocialResourceType | null;
  resourceId?: number | null;
  dedupe?: boolean;
}

/**
 * Inserts a notification. Self-notification is skipped (also enforced by the
 * table CHECK). When `dedupe` is set (reactions and follows — repeatable
 * toggles), the row is inserted only if no matching (recipient, actor,
 * event_type, resource) notification already exists, so liking→unliking→liking
 * or re-following doesn't spam the inbox. Comments never dedupe — each comment
 * is a distinct event. `col IS ?` (not `=`) so the NULL resource columns of
 * follow/follow_back events match correctly.
 */
export async function createNotification(
  input: NewNotificationInput
): Promise<void> {
  if (input.actorId === input.userId) return;
  const resourceType = input.resourceType ?? null;
  const resourceId = input.resourceId ?? null;
  if (input.dedupe) {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, event_type, actor_id, resource_type, resource_id)
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (
              SELECT 1 FROM notifications
              WHERE user_id = ? AND actor_id = ? AND event_type = ?
                AND resource_type IS ? AND resource_id IS ?
            )`,
      args: [
        input.userId,
        input.eventType,
        input.actorId,
        resourceType,
        resourceId,
        input.userId,
        input.actorId,
        input.eventType,
        resourceType,
        resourceId,
      ],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, event_type, actor_id, resource_type, resource_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [input.userId, input.eventType, input.actorId, resourceType, resourceId],
    });
  }
}

/** One keyset page of `userId`'s notifications, newest first. */
export async function getNotifications(
  userId: number,
  cursor: NotificationCursor | null,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<NotificationsPage> {
  let sql = `SELECT n.*, u.name AS actor_name, u.image AS actor_image
             FROM notifications n JOIN users u ON u.id = n.actor_id
             WHERE n.user_id = ?`;
  const args: (string | number)[] = [userId];
  if (cursor) {
    // Keyset "older than the cursor" for (created_at DESC, id DESC).
    sql += " AND (n.created_at < ? OR (n.created_at = ? AND n.id < ?))";
    args.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  sql += " ORDER BY n.created_at DESC, n.id DESC LIMIT ?";
  args.push(pageSize + 1);

  const rows = mapRows<NotificationView>(await db.execute({ sql, args }));
  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? { createdAt: last.created_at, id: last.id } : null;
  return { notifications: page, nextCursor };
}

export async function getUnreadCount(userId: number): Promise<number> {
  return (
    firstRow<{ n: number }>(
      await db.execute({
        sql: "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
        args: [userId],
      })
    )?.n ?? 0
  );
}

/**
 * Removes the 'reaction' notification a like generated, when that like is
 * retracted (un-react). Precise: there is at most one reaction per
 * (actor, resource), so this matches exactly the one notification — no
 * over-delete. Also lets a later re-like re-notify (the dedupe in
 * createNotification keys on the same tuple, so a lingering row would otherwise
 * freeze the inbox entry).
 */
export async function removeReactionNotification(
  ownerId: number,
  actorId: number,
  resourceType: SocialResourceType,
  resourceId: number
): Promise<void> {
  await db.execute({
    sql: `DELETE FROM notifications
          WHERE user_id = ? AND actor_id = ? AND event_type = 'reaction'
            AND resource_type = ? AND resource_id = ?`,
    args: [ownerId, actorId, resourceType, resourceId],
  });
}

export async function markAllRead(userId: number): Promise<void> {
  await db.execute({
    sql: "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL",
    args: [userId],
  });
}

/**
 * Deletes one of the recipient's own notifications. Scoped by user_id in the
 * WHERE so it can only ever remove the caller's own row — returns false (→ 404)
 * when nothing matched, without revealing whether the id exists for someone else.
 */
export async function deleteNotification(
  id: number,
  userId: number
): Promise<boolean> {
  const rs = await db.execute({
    sql: "DELETE FROM notifications WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return rs.rowsAffected > 0;
}

/** Clears all of the recipient's notifications. */
export async function clearNotifications(userId: number): Promise<void> {
  await db.execute({
    sql: "DELETE FROM notifications WHERE user_id = ?",
    args: [userId],
  });
}
