import { auth } from "@/auth";
import { db } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Session user id for API handlers; throws UnauthorizedError when logged out.
 * Also confirms the user row still exists — JWTs outlive account deletions,
 * and libsql does not enforce foreign keys, so a stale token would otherwise
 * write orphan rows.
 */
export async function requireUserId(): Promise<number> {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "number") throw new UnauthorizedError();
  const rs = await db.execute({
    sql: "SELECT 1 FROM users WHERE id = ?",
    args: [id],
  });
  if (rs.rows.length === 0) throw new UnauthorizedError();
  return id;
}
