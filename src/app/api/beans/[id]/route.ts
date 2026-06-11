import { NextResponse } from "next/server";
import { getBeanWithVisits } from "@/lib/queries";

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
