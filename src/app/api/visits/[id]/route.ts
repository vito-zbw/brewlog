import { NextResponse } from "next/server";
import { getVisitWithBeans } from "@/lib/queries";

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
