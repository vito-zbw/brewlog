import { db } from "@/lib/db";
import type { Comment, CommentView, SocialResourceType } from "@/types";
import { mapRows, firstRow, insertedId } from "./util";

/** All comments on a resource, oldest first. Flat + lightweight — no pagination. */
export async function listComments(
  type: SocialResourceType,
  id: number
): Promise<CommentView[]> {
  return mapRows<CommentView>(
    await db.execute({
      sql: `SELECT c.*, u.name AS user_name, u.image AS user_image
            FROM comments c JOIN users u ON u.id = c.user_id
            WHERE c.resource_type = ? AND c.resource_id = ?
            ORDER BY c.created_at ASC, c.id ASC`,
      args: [type, id],
    })
  );
}

/** Raw comment row (no author join) — used for the ownership check on delete. */
export async function getComment(id: number): Promise<Comment | null> {
  return firstRow<Comment>(
    await db.execute({ sql: "SELECT * FROM comments WHERE id = ?", args: [id] })
  );
}

export interface NewCommentInput {
  resource_type: SocialResourceType;
  resource_id: number;
  user_id: number;
  body: string;
}

export async function createComment(
  input: NewCommentInput
): Promise<CommentView> {
  const rs = await db.execute({
    sql: `INSERT INTO comments (resource_type, resource_id, user_id, body)
          VALUES (?, ?, ?, ?)`,
    args: [input.resource_type, input.resource_id, input.user_id, input.body],
  });
  const view = firstRow<CommentView>(
    await db.execute({
      sql: `SELECT c.*, u.name AS user_name, u.image AS user_image
            FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      args: [insertedId(rs)],
    })
  );
  if (!view) throw new Error("failed to load created comment");
  return view;
}

export async function deleteComment(id: number): Promise<void> {
  await db.execute({ sql: "DELETE FROM comments WHERE id = ?", args: [id] });
}
