import { NextRequest, NextResponse } from "next/server";
import {
  getVisitWithBeans,
  deleteVisit,
  updateVisit,
  existingBeanIds,
} from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { deletePhotoObject } from "@/lib/storage";
import { validateVisitBody } from "@/lib/visit-validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visitId = Number(id);
    if (!Number.isInteger(visitId) || visitId <= 0) {
      return NextResponse.json({ error: "未找到该探店记录" }, { status: 404 });
    }
    const visit = await getVisitWithBeans(visitId);
    if (!visit) {
      return NextResponse.json({ error: "未找到该探店记录" }, { status: 404 });
    }
    return NextResponse.json({ data: visit });
  } catch (err) {
    console.error("GET /api/visits/[id] failed:", err);
    return NextResponse.json({ error: "加载探店记录失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const visitId = Number(id);
    if (!Number.isInteger(visitId) || visitId <= 0) {
      return NextResponse.json({ error: "未找到该探店记录" }, { status: 404 });
    }
    const visit = await getVisitWithBeans(visitId);
    if (!visit) {
      return NextResponse.json({ error: "未找到该探店记录" }, { status: 404 });
    }
    if (visit.user_id !== userId) {
      return NextResponse.json(
        { error: "只能删除自己的探店记录" },
        { status: 403 }
      );
    }
    const { photoKeys } = await deleteVisit(visitId);
    // Best-effort object purge (mirrors /api/photos/[id]); DB rows already gone.
    for (const key of photoKeys) {
      try {
        await deletePhotoObject(key);
      } catch (storageErr) {
        console.error(
          `DELETE /api/visits/${visitId}: orphaned storage object ${key}:`,
          storageErr
        );
      }
    }
    return NextResponse.json({ data: { id: visitId } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/visits/[id] failed:", err);
    return NextResponse.json({ error: "删除探店记录失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const visitId = Number(id);
    if (!Number.isInteger(visitId) || visitId <= 0) {
      return NextResponse.json({ error: "未找到该探店记录" }, { status: 404 });
    }
    const existing = await getVisitWithBeans(visitId);
    if (!existing) {
      return NextResponse.json({ error: "未找到该探店记录" }, { status: 404 });
    }
    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: "只能编辑自己的探店记录" },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const invalid = validateVisitBody(body);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    const beanIds: number[] = Array.isArray(body.bean_ids) ? body.bean_ids : [];
    if (beanIds.length > 0) {
      const existing = await existingBeanIds(beanIds);
      if (existing.length !== new Set(beanIds).size) {
        return NextResponse.json({ error: "咖啡豆不存在" }, { status: 400 });
      }
    }
    const { photoKeys } = await updateVisit(visitId, {
      cafe_id: Number(body.cafe_id),
      visit_date: body.visit_date,
      brew_method: body.brew_method,
      rating_overall: body.rating_overall,
      rating_bean_quality: body.rating_bean_quality,
      rating_barista_skill: body.rating_barista_skill,
      rating_ambiance: body.rating_ambiance,
      notes: body.notes ?? null,
      bean_ids: Array.isArray(body.bean_ids) ? body.bean_ids : [],
    });
    // Re-pointing the visit to another café can orphan the old one; purge its
    // photo objects best-effort (mirrors DELETE), DB rows already gone.
    for (const key of photoKeys) {
      try {
        await deletePhotoObject(key);
      } catch (storageErr) {
        console.error(
          `PUT /api/visits/${visitId}: orphaned storage object ${key}:`,
          storageErr
        );
      }
    }
    return NextResponse.json({ data: { id: visitId } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("PUT /api/visits/[id] failed:", err);
    return NextResponse.json({ error: "更新探店记录失败" }, { status: 500 });
  }
}
