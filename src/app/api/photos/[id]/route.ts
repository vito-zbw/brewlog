import { NextResponse } from "next/server";
import { deletePhoto, getPhoto } from "@/lib/queries";
import { deletePhotoObject } from "@/lib/storage";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const photoId = Number(id);
    if (!Number.isInteger(photoId) || photoId <= 0) {
      return NextResponse.json({ error: "未找到该照片" }, { status: 404 });
    }
    const photo = await getPhoto(photoId);
    if (!photo) {
      return NextResponse.json({ error: "未找到该照片" }, { status: 404 });
    }
    if (photo.user_id !== userId) {
      return NextResponse.json({ error: "只能删除自己上传的照片" }, { status: 403 });
    }
    await deletePhoto(photoId);
    // Row first, object second: a row pointing at a deleted object would be a
    // permanently broken image, while an orphaned object is just wasted
    // storage. Storage failures are logged, not surfaced — the photo is
    // already gone from the user's perspective.
    try {
      await deletePhotoObject(photo.storage_key);
    } catch (storageErr) {
      console.error(
        `DELETE /api/photos/${photoId}: orphaned storage object ${photo.storage_key}:`,
        storageErr
      );
    }
    return NextResponse.json({ data: { id: photoId } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("DELETE /api/photos/[id] failed:", err);
    return NextResponse.json({ error: "删除照片失败" }, { status: 500 });
  }
}
