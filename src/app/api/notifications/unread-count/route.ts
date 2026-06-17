import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

// Lightweight poll target for the nav bell badge. Login-gated, session-scoped.
export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json({ data: { count: await getUnreadCount(userId) } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/notifications/unread-count failed:", err);
    return NextResponse.json({ error: "加载未读数失败" }, { status: 500 });
  }
}
