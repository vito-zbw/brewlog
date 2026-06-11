import { NextRequest, NextResponse } from "next/server";
import { getUserStats } from "@/lib/queries";
import { TEAM_MEMBERS } from "@/lib/terms";

export async function GET(request: NextRequest) {
  try {
    const user = request.nextUrl.searchParams.get("user");
    if (!user || !TEAM_MEMBERS.includes(user as (typeof TEAM_MEMBERS)[number])) {
      return NextResponse.json({ error: "用户参数无效" }, { status: 400 });
    }
    const stats = await getUserStats(user);
    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json({ error: "加载统计数据失败" }, { status: 500 });
  }
}
