import { NextResponse } from "next/server";
import { getUserStats } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

// Personal stats for the signed-in user (the dashboard). Other users' stats
// render server-side on their profile pages via getUserStats directly.
export async function GET() {
  try {
    const userId = await requireUserId();
    const stats = await getUserStats(userId);
    return NextResponse.json({ data: stats });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/stats failed:", err);
    return NextResponse.json({ error: "加载统计数据失败" }, { status: 500 });
  }
}
