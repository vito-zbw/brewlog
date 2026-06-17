import { NextResponse } from "next/server";
import { deleteNotification } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// Dismiss one of the caller's own notifications. Owner-scoped in the query, so a
// non-owner (or unknown id) gets 404 — never reveals another user's rows.
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const notificationId = Number(id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return NextResponse.json({ error: "未找到该通知" }, { status: 404 });
    }
    const deleted = await deleteNotification(notificationId, userId);
    if (!deleted) {
      return NextResponse.json({ error: "未找到该通知" }, { status: 404 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/notifications/[id] failed:", err);
    return NextResponse.json({ error: "删除通知失败" }, { status: 500 });
  }
}
