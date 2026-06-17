import { NextRequest, NextResponse } from "next/server";
import { listBeans, createBean } from "@/lib/queries";
import { validateBeanBody } from "@/lib/bean-validation";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const beans = await listBeans({
      search: params.get("search") ?? undefined,
      processing: params.get("processing") ?? undefined,
      roastLevel: params.get("roast_level") ?? undefined,
      tag: params.get("tag") ?? undefined,
      originCountry: params.get("origin") ?? undefined,
      roaster: params.get("roaster") ?? undefined,
    });
    return NextResponse.json({ data: beans });
  } catch (err) {
    console.error("GET /api/beans failed:", err);
    return NextResponse.json({ error: "加载咖啡豆失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const invalid = validateBeanBody(body);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    const bean = await createBean({ ...body, user_id: userId });
    return NextResponse.json({ data: bean }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/beans failed:", err);
    return NextResponse.json({ error: "创建咖啡豆失败" }, { status: 500 });
  }
}
