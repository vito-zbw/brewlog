import { NextResponse } from "next/server";
import { follow, unfollow, getUserById } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

async function resolveTarget(params: Params["params"]): Promise<number | null> {
  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId) || targetId <= 0) return null;
  return (await getUserById(targetId)) ? targetId : null;
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const targetId = await resolveTarget(params);
    if (targetId === null) {
      return NextResponse.json({ error: "未找到该用户" }, { status: 404 });
    }
    if (targetId === userId) {
      return NextResponse.json({ error: "不能关注自己" }, { status: 400 });
    }
    await follow(userId, targetId);
    return NextResponse.json({ data: { following: true } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/users/[id]/follow failed:", err);
    return NextResponse.json({ error: "关注失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const targetId = await resolveTarget(params);
    if (targetId === null) {
      return NextResponse.json({ error: "未找到该用户" }, { status: 404 });
    }
    await unfollow(userId, targetId);
    return NextResponse.json({ data: { following: false } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/users/[id]/follow failed:", err);
    return NextResponse.json({ error: "取消关注失败" }, { status: 500 });
  }
}
