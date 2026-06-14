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
