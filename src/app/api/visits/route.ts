import { NextRequest, NextResponse } from "next/server";
import { getVisitsWithBeans, createVisit } from "@/lib/queries";
import { BREW_METHODS } from "@/lib/terms";

function isValidRating(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = params.get("limit");
    const visits = await getVisitsWithBeans({
      cafeId: params.get("cafe_id") ? Number(params.get("cafe_id")) : undefined,
      visitedBy: params.get("visited_by") ?? undefined,
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
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    if (
      !body.cafe_id ||
      !body.visited_by ||
      !body.visit_date ||
      !body.brew_method ||
      !body.rating_overall ||
      !body.rating_bean_quality ||
      !body.rating_barista_skill ||
      !body.rating_ambiance
    ) {
      return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 });
    }
    if (!isPositiveInteger(Number(body.cafe_id))) {
      return NextResponse.json({ error: "咖啡馆参数无效" }, { status: 400 });
    }
    if (
      !isValidRating(body.rating_overall) ||
      !isValidRating(body.rating_bean_quality) ||
      !isValidRating(body.rating_barista_skill) ||
      !isValidRating(body.rating_ambiance)
    ) {
      return NextResponse.json(
        { error: "评分需为 1-5 的整数" },
        { status: 400 }
      );
    }
    if (
      body.bean_ids != null &&
      (!Array.isArray(body.bean_ids) || !body.bean_ids.every(isPositiveInteger))
    ) {
      return NextResponse.json({ error: "咖啡豆参数无效" }, { status: 400 });
    }
    if (!BREW_METHODS.some((o) => o.value === body.brew_method)) {
      return NextResponse.json({ error: "冲煮方式无效" }, { status: 400 });
    }
    const visit = await createVisit({ ...body, cafe_id: Number(body.cafe_id) });
    return NextResponse.json({ data: visit }, { status: 201 });
  } catch (err) {
    console.error("POST /api/visits failed:", err);
    return NextResponse.json({ error: "创建探店记录失败" }, { status: 500 });
  }
}
