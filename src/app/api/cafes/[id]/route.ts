import { NextResponse } from "next/server";
import {
  getCafe,
  getCafeCommunityStats,
  getVisitsWithBeans,
} from "@/lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cafeId = Number(id);
    if (!Number.isInteger(cafeId) || cafeId <= 0) {
      return NextResponse.json({ error: "未找到该咖啡馆" }, { status: 404 });
    }
    const cafe = await getCafe(cafeId);
    if (!cafe) {
      return NextResponse.json({ error: "未找到该咖啡馆" }, { status: 404 });
    }
    const [stats, visits] = await Promise.all([
      getCafeCommunityStats(cafeId),
      getVisitsWithBeans({ cafeId }),
    ]);
    return NextResponse.json({ data: { ...cafe, stats, visits } });
  } catch (err) {
    console.error("GET /api/cafes/[id] failed:", err);
    return NextResponse.json({ error: "加载咖啡馆失败" }, { status: 500 });
  }
}
