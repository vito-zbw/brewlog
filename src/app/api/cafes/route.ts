import { NextRequest, NextResponse } from "next/server";
import { listCafesWithStats, createCafe } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const cafes = await listCafesWithStats();
    return NextResponse.json({ data: cafes });
  } catch (err) {
    console.error("GET /api/cafes failed:", err);
    return NextResponse.json({ error: "加载咖啡馆失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      typeof body.city !== "string" ||
      !body.city.trim() ||
      typeof body.country !== "string" ||
      !body.country.trim() ||
      body.latitude == null ||
      body.longitude == null
    ) {
      return NextResponse.json(
        { error: "店名、城市、国家和经纬度为必填项" },
        { status: 400 }
      );
    }
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json({ error: "经纬度无效" }, { status: 400 });
    }
    const cafe = await createCafe({
      ...body,
      name: body.name.trim(),
      city: body.city.trim(),
      country: body.country.trim(),
      latitude: lat,
      longitude: lng,
      user_id: userId,
    });
    return NextResponse.json({ data: cafe }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/cafes failed:", err);
    return NextResponse.json({ error: "创建咖啡馆失败" }, { status: 500 });
  }
}
