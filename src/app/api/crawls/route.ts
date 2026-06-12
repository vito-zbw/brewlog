import { NextRequest, NextResponse } from "next/server";
import { createCrawl, filterOwnVisitIds, listCrawls } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { validateCrawlBody } from "@/lib/crawl-validation";

export async function GET() {
  try {
    const crawls = await listCrawls();
    return NextResponse.json({ data: crawls });
  } catch (err) {
    console.error("GET /api/crawls failed:", err);
    return NextResponse.json({ error: "加载咖啡之旅失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const invalid = validateCrawlBody(body);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    const visitIds = body.visit_ids as number[];
    const owned = await filterOwnVisitIds(userId, visitIds);
    if (owned.length !== visitIds.length) {
      return NextResponse.json(
        { error: "只能选择自己的探店记录" },
        { status: 400 }
      );
    }
    const crawlId = await createCrawl({
      user_id: userId,
      title: body.title.trim(),
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      crawl_date: body.crawl_date,
      visit_ids: visitIds,
    });
    return NextResponse.json({ data: { id: crawlId } }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/crawls failed:", err);
    return NextResponse.json({ error: "创建咖啡之旅失败" }, { status: 500 });
  }
}
