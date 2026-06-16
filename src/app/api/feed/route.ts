import { NextRequest, NextResponse } from "next/server";
import { getFeedVisits } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

// Login-gated, unlike the public-read GETs. The followed-set scope is derived
// ONLY from the session user id (requireUserId), never from a query param — so
// this can't be used to read someone else's feed. Returns one keyset page of
// the caller's activity feed plus an opaque cursor for the next page.
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const cursor = decodeCursor(request.nextUrl.searchParams.get("cursor"));
    const page = await getFeedVisits(userId, cursor);
    return NextResponse.json({
      data: page.visits,
      nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/feed failed:", err);
    return NextResponse.json({ error: "加载关注动态失败" }, { status: 500 });
  }
}
