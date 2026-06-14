import { NextResponse } from "next/server";
import { getFollowing } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const targetId = Number(id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "未找到该用户" }, { status: 404 });
    }
    // Owner-private list: any id that isn't the caller's own is 403. We do NOT
    // check existence first on purpose — a 404 for unknown ids would leak which
    // user ids exist, and these lists are private. (The sibling /follow route
    // does distinguish 404, because following is a public action.)
    if (targetId !== userId) {
      return NextResponse.json({ error: "无权查看" }, { status: 403 });
    }
    const data = await getFollowing(userId);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/users/[id]/following failed:", err);
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}
