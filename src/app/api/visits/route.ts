import { NextRequest, NextResponse } from "next/server";
import { getVisitsWithBeans, createVisit } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { validateVisitBody } from "@/lib/visit-validation";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = params.get("limit");
    const visits = await getVisitsWithBeans({
      cafeId: params.get("cafe_id") ? Number(params.get("cafe_id")) : undefined,
      userId: params.get("user_id") ? Number(params.get("user_id")) : undefined,
      beanId: params.get("bean_id") ? Number(params.get("bean_id")) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json({ data: visits });
  } catch (err) {
    console.error("GET /api/visits failed:", err);
    return NextResponse.json({ error: "加载探店记录失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const invalid = validateVisitBody(body);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    const visit = await createVisit({
      ...body,
      cafe_id: Number(body.cafe_id),
      user_id: userId,
    });
    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/visits failed:", err);
    return NextResponse.json({ error: "创建探店记录失败" }, { status: 500 });
  }
}
