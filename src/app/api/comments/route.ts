import { NextRequest, NextResponse } from "next/server";
import {
  listComments,
  createComment,
  socialEntityExists,
  socialEntityOwner,
  isSocialResourceType,
  createNotification,
} from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

const MAX_BODY = 2000;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const type = params.get("type");
    const id = Number(params.get("id"));
    if (!isSocialResourceType(type) || !Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
    }
    return NextResponse.json({ data: await listComments(type, id) });
  } catch (err) {
    console.error("GET /api/comments failed:", err);
    return NextResponse.json({ error: "加载评论失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const type = body.resourceType;
    const resourceId = Number(body.resourceId);
    if (!isSocialResourceType(type) || !Number.isInteger(resourceId) || resourceId <= 0) {
      return NextResponse.json({ error: "请求参数错误" }, { status: 400 });
    }
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (text.length === 0) {
      return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: "评论内容过长" }, { status: 400 });
    }
    if (!(await socialEntityExists(type, resourceId))) {
      return NextResponse.json({ error: "未找到该内容" }, { status: 404 });
    }
    const comment = await createComment({
      resource_type: type,
      resource_id: resourceId,
      user_id: userId,
      body: text,
    });
    // Notify the resource owner (skip self-comments). Each comment is a
    // distinct event, so no dedupe.
    const ownerId = await socialEntityOwner(type, resourceId);
    if (ownerId !== null && ownerId !== userId) {
      await createNotification({
        userId: ownerId,
        actorId: userId,
        eventType: "comment",
        resourceType: type,
        resourceId,
      });
    }
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/comments failed:", err);
    return NextResponse.json({ error: "发表评论失败" }, { status: 500 });
  }
}
