import { NextRequest, NextResponse } from "next/server";
import { getNotifications, clearNotifications } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { decodeKeysetCursor, encodeKeysetCursor } from "@/lib/cursor";

// Login-gated, session-scoped (recipient = the session user, never a query
// param). One keyset page of the caller's notifications + an opaque cursor.
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const raw = decodeKeysetCursor(request.nextUrl.searchParams.get("cursor"));
    const cursor = raw ? { createdAt: raw.key, id: raw.id } : null;
    const page = await getNotifications(userId, cursor);
    return NextResponse.json({
      data: page.notifications,
      nextCursor: page.nextCursor
        ? encodeKeysetCursor({
            key: page.nextCursor.createdAt,
            id: page.nextCursor.id,
          })
        : null,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/notifications failed:", err);
    return NextResponse.json({ error: "加载通知失败" }, { status: 500 });
  }
}

// Clears all of the caller's notifications (session-scoped).
export async function DELETE() {
  try {
    const userId = await requireUserId();
    await clearNotifications(userId);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/notifications failed:", err);
    return NextResponse.json({ error: "清除通知失败" }, { status: 500 });
  }
}
