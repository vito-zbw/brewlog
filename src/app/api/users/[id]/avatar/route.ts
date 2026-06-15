import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUserImage } from "@/lib/queries";
import {
  isSupportedImageType,
  savePhoto,
  photoPublicUrl,
  photoKeyFromUrl,
  deletePhotoObject,
} from "@/lib/storage";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 4 * 1024 * 1024; // client downscales first; Vercel caps bodies ~4.5MB

async function ownerId(params: Params["params"]): Promise<number | null> {
  const userId = await requireUserId();
  const { id } = await params;
  return Number(id) === userId ? userId : null;
}

/**
 * Points the user's avatar at `nextImage` (a stored URL, or null to reset to
 * default) and purges the previous custom upload from storage so removed and
 * replaced avatars don't pile up in R2. DB first, then best-effort purge —
 * mirroring the visit/photo deletion pattern: a purge failure leaves a logged
 * orphan, never a broken image reference. photoKeyFromUrl returns null for
 * OAuth/foreign URLs, so those are never touched.
 */
async function setAvatar(userId: number, nextImage: string | null): Promise<void> {
  const previous = await getUserById(userId);
  await updateUserImage(userId, nextImage);
  const oldKey = photoKeyFromUrl(previous?.image ?? null);
  if (oldKey && oldKey !== photoKeyFromUrl(nextImage)) {
    try {
      await deletePhotoObject(oldKey);
    } catch (err) {
      console.error(`avatar purge: orphaned storage object ${oldKey}:`, err);
    }
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await ownerId(params);
    if (userId === null) {
      return NextResponse.json({ error: "只能修改自己的资料" }, { status: 403 });
    }
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择图片" }, { status: 400 });
    }
    if (!isSupportedImageType(file.type)) {
      return NextResponse.json(
        { error: "仅支持 JPG、PNG、WebP 格式的图片" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "图片过大，请控制在 4MB 以内" },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = await savePhoto(buffer, file.type, "avatar");
    const image = photoPublicUrl(key);
    await setAvatar(userId, image);
    return NextResponse.json({ data: { image } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("POST /api/users/[id]/avatar failed:", err);
    return NextResponse.json({ error: "上传头像失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const userId = await ownerId(params);
    if (userId === null) {
      return NextResponse.json({ error: "只能修改自己的资料" }, { status: 403 });
    }
    await setAvatar(userId, null);
    return NextResponse.json({ data: { image: null } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/users/[id]/avatar failed:", err);
    return NextResponse.json({ error: "删除头像失败" }, { status: 500 });
  }
}
