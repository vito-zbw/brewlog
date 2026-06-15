import { NextRequest, NextResponse } from "next/server";
import {
  getBean,
  getBeanWithVisits,
  updateBean,
  deleteBean,
  BeanInUseError,
} from "@/lib/queries";
import { validateBeanBody } from "@/lib/bean-validation";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { deletePhotoObject } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const beanId = Number(id);
    if (!Number.isInteger(beanId) || beanId <= 0) {
      return NextResponse.json({ error: "未找到该咖啡豆" }, { status: 404 });
    }
    const bean = await getBeanWithVisits(beanId);
    if (!bean) {
      return NextResponse.json({ error: "未找到该咖啡豆" }, { status: 404 });
    }
    return NextResponse.json({ data: bean });
  } catch (err) {
    console.error("GET /api/beans/[id] failed:", err);
    return NextResponse.json({ error: "加载咖啡豆失败" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const beanId = Number(id);
    if (!Number.isInteger(beanId) || beanId <= 0) {
      return NextResponse.json({ error: "未找到该咖啡豆" }, { status: 404 });
    }
    const existing = await getBean(beanId);
    if (!existing) {
      return NextResponse.json({ error: "未找到该咖啡豆" }, { status: 404 });
    }
    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: "只能编辑自己的咖啡豆" },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const invalid = validateBeanBody(body);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    await updateBean(beanId, {
      name: body.name,
      origin_country: body.origin_country,
      origin_region: body.origin_region ?? null,
      farm: body.farm ?? null,
      roaster: body.roaster ?? null,
      processing_method: body.processing_method ?? "Other",
      roast_level: body.roast_level ?? "Medium",
      tasting_notes_tags: body.tasting_notes_tags ?? null,
      tasting_notes_freetext: body.tasting_notes_freetext ?? null,
    });
    const bean = await getBean(beanId);
    // The endpoint promises a Bean on 200; never serialize { data: null }.
    if (!bean) throw new Error("failed to load updated bean");
    return NextResponse.json({ data: bean });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("PUT /api/beans/[id] failed:", err);
    return NextResponse.json({ error: "更新咖啡豆失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const beanId = Number(id);
    if (!Number.isInteger(beanId) || beanId <= 0) {
      return NextResponse.json({ error: "未找到该咖啡豆" }, { status: 404 });
    }
    const bean = await getBean(beanId);
    if (!bean) {
      return NextResponse.json({ error: "未找到该咖啡豆" }, { status: 404 });
    }
    if (bean.user_id !== userId) {
      return NextResponse.json(
        { error: "只能删除自己的咖啡豆" },
        { status: 403 }
      );
    }
    // Owner decision: refuse to delete a bean any visit still references, so a
    // delete never strands a visit. The atomic check lives inside deleteBean's
    // transaction (BeanInUseError → 409); the owner removes it from those
    // visits first.
    const { photoKeys } = await deleteBean(beanId);
    // Best-effort object purge (mirrors /api/visits/[id]); DB rows already gone.
    for (const key of photoKeys) {
      try {
        await deletePhotoObject(key);
      } catch (storageErr) {
        console.error(
          `DELETE /api/beans/${beanId}: orphaned storage object ${key}:`,
          storageErr
        );
      }
    }
    return NextResponse.json({ data: { id: beanId } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (err instanceof BeanInUseError) {
      return NextResponse.json(
        {
          error: `该咖啡豆被 ${err.count} 条探店记录使用，无法删除。请先在这些探店记录中移除它。`,
        },
        { status: 409 }
      );
    }
    console.error("DELETE /api/beans/[id] failed:", err);
    return NextResponse.json({ error: "删除咖啡豆失败" }, { status: 500 });
  }
}
