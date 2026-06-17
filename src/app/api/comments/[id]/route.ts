import { NextResponse } from "next/server";
import { getComment, deleteComment } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const commentId = Number(id);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json({ error: "未找到该评论" }, { status: 404 });
    }
    const comment = await getComment(commentId);
    if (!comment) {
      return NextResponse.json({ error: "未找到该评论" }, { status: 404 });
    }
    if (comment.user_id !== userId) {
      return NextResponse.json({ error: "无权删除该评论" }, { status: 403 });
    }
    await deleteComment(commentId);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/comments/[id] failed:", err);
    return NextResponse.json({ error: "删除评论失败" }, { status: 500 });
  }
}
