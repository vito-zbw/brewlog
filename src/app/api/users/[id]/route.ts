import { NextResponse } from "next/server";
import { updateUserName, isNameTaken } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";
import { validateUsername } from "@/lib/username-validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    if (Number(id) !== userId) {
      return NextResponse.json({ error: "只能修改自己的资料" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const message = validateUsername(body.name);
    if (message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const name = (body.name as string).trim();
    if (await isNameTaken(name, userId)) {
      return NextResponse.json({ error: "该用户名已被使用" }, { status: 409 });
    }
    try {
      await updateUserName(userId, name);
    } catch (err) {
      // Lost race: another writer claimed the name; the unique index rejected us.
      if (err instanceof Error && /UNIQUE/i.test(err.message)) {
        return NextResponse.json({ error: "该用户名已被使用" }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ data: { id: userId, name } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("PATCH /api/users/[id] failed:", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
