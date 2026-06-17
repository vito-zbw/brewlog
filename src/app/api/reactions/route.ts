import { NextRequest, NextResponse } from "next/server";
import {
  addReaction,
  removeReaction,
  getReactionSummary,
  socialEntityExists,
  socialEntityOwner,
  isSocialResourceType,
  createNotification,
} from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    const type = body?.resourceType;
    const resourceId = Number(body?.resourceId);
    if (!isSocialResourceType(type) || !Number.isInteger(resourceId) || resourceId <= 0) {
      return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
    }
    if (!(await socialEntityExists(type, resourceId))) {
      return NextResponse.json({ error: "未找到该内容" }, { status: 404 });
    }
    const { created } = await addReaction(userId, type, resourceId);
    if (created) {
      // Notify the resource owner on a genuine first-time like (skip self).
      // dedupe so a like→unlike→like cycle doesn't re-notify.
      const ownerId = await socialEntityOwner(type, resourceId);
      if (ownerId !== null && ownerId !== userId) {
        await createNotification({
          userId: ownerId,
          actorId: userId,
          eventType: "reaction",
          resourceType: type,
          resourceId,
          dedupe: true,
        });
      }
    }
    const summary = await getReactionSummary(type, resourceId, userId);
    return NextResponse.json({ data: summary });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/reactions failed:", err);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const params = request.nextUrl.searchParams;
    const type = params.get("type");
    const resourceId = Number(params.get("id"));
    if (!isSocialResourceType(type) || !Number.isInteger(resourceId) || resourceId <= 0) {
      return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
    }
    await removeReaction(userId, type, resourceId);
    const summary = await getReactionSummary(type, resourceId, userId);
    return NextResponse.json({ data: summary });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/reactions failed:", err);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
