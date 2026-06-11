import { NextRequest, NextResponse } from "next/server";
import { listBeans, createBean } from "@/lib/queries";
import { PROCESSING_METHODS, ROAST_LEVELS } from "@/lib/terms";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const beans = await listBeans({
      search: params.get("search") ?? undefined,
      processing: params.get("processing") ?? undefined,
      roastLevel: params.get("roast_level") ?? undefined,
      tag: params.get("tag") ?? undefined,
    });
    return NextResponse.json({ data: beans });
  } catch (err) {
    console.error("GET /api/beans failed:", err);
    return NextResponse.json({ error: "加载咖啡豆失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    if (!body.name || !body.origin_country || !body.created_by) {
      return NextResponse.json(
        { error: "豆名、产地国家和记录人为必填项" },
        { status: 400 }
      );
    }
    if (
      (body.processing_method != null &&
        !PROCESSING_METHODS.some((o) => o.value === body.processing_method)) ||
      (body.roast_level != null &&
        !ROAST_LEVELS.some((o) => o.value === body.roast_level))
    ) {
      return NextResponse.json(
        { error: "处理法或烘焙度无效" },
        { status: 400 }
      );
    }
    const bean = await createBean(body);
    return NextResponse.json({ data: bean }, { status: 201 });
  } catch (err) {
    console.error("POST /api/beans failed:", err);
    return NextResponse.json({ error: "创建咖啡豆失败" }, { status: 500 });
  }
}
