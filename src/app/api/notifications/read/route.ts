import { NextResponse } from "next/server";
import { markAllRead } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

// Marks all of the caller's notifications read (session-scoped). Called when the
// /notifications page is viewed; clears the nav badge.
export async function POST() {
  try {
    const userId = await requireUserId();
    await markAllRead(userId);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/notifications/read failed:", err);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
