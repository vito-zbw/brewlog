import { NextRequest, NextResponse } from "next/server";
import {
  deleteCrawl,
  filterOwnVisitIds,
  getCrawlWithStops,
  updateCrawl,
} from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { validateCrawlBody } from "@/lib/crawl-validation";

type Params = { params: Promise<{ id: string }> };

async function loadCrawl(params: Params["params"]) {
  const { id } = await params;
  const crawlId = Number(id);
  if (!Number.isInteger(crawlId) || crawlId <= 0) return null;
  return getCrawlWithStops(crawlId);
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const crawl = await loadCrawl(params);
    if (!crawl) {
      return NextResponse.json({ error: "未找到该咖啡之旅" }, { status: 404 });
    }
    return NextResponse.json({ data: crawl });
  } catch (err) {
    console.error("GET /api/crawls/[id] failed:", err);
    return NextResponse.json({ error: "加载咖啡之旅失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const crawl = await loadCrawl(params);
    if (!crawl) {
      return NextResponse.json({ error: "未找到该咖啡之旅" }, { status: 404 });
    }
    if (crawl.user_id !== userId) {
      return NextResponse.json(
        { error: "只能编辑自己的咖啡之旅" },
        { status: 403 }
      );
    }
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
    await updateCrawl(crawl.id, {
      title: body.title.trim(),
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      crawl_date: body.crawl_date,
      visit_ids: visitIds,
    });
    return NextResponse.json({ data: { id: crawl.id } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("PUT /api/crawls/[id] failed:", err);
    return NextResponse.json({ error: "更新咖啡之旅失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const crawl = await loadCrawl(params);
    if (!crawl) {
      return NextResponse.json({ error: "未找到该咖啡之旅" }, { status: 404 });
    }
    if (crawl.user_id !== userId) {
      return NextResponse.json(
        { error: "只能删除自己的咖啡之旅" },
        { status: 403 }
      );
    }
    await deleteCrawl(crawl.id);
    return NextResponse.json({ data: { id: crawl.id } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/crawls/[id] failed:", err);
    return NextResponse.json({ error: "删除咖啡之旅失败" }, { status: 500 });
  }
}
