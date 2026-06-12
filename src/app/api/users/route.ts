import { NextResponse } from "next/server";
import { listUsers } from "@/lib/queries";

// User list for filter dropdowns. Email addresses stay server-side.
export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json({
      data: users.map(({ id, name, image }) => ({ id, name, image })),
    });
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "加载用户失败" }, { status: 500 });
  }
}
