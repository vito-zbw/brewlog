import { NextResponse } from "next/server";
import { getVisitWithBeans, deleteVisit } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { deletePhotoObject } from "@/lib/storage";

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
