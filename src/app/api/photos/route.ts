import { NextRequest, NextResponse } from "next/server";
import { createPhoto, entityExists } from "@/lib/queries";
import { isSupportedImageType, savePhoto } from "@/lib/storage";
import type { PhotoEntityType } from "@/types";

const MAX_BYTES = 4 * 1024 * 1024; // client downscales first; Vercel caps bodies at ~4.5MB
const ENTITY_TYPES: PhotoEntityType[] = ["bean", "cafe", "visit"];

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const file = form.get("file");
    const entityType = form.get("entity_type");
    const entityId = Number(form.get("entity_id"));
    const createdBy = form.get("created_by");
    const caption = form.get("caption");

    if (!(file instanceof File) || typeof createdBy !== "string" || !createdBy) {
      return NextResponse.json(
        { error: "照片和记录人为必填项" },
        { status: 400 }
      );
    }
    if (
      typeof entityType !== "string" ||
      !ENTITY_TYPES.includes(entityType as PhotoEntityType) ||
      !Number.isInteger(entityId) ||
      entityId <= 0
    ) {
      return NextResponse.json({ error: "关联对象无效" }, { status: 400 });
    }
    if (!(await entityExists(entityType as PhotoEntityType, entityId))) {
      return NextResponse.json({ error: "关联对象不存在" }, { status: 404 });
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
    const key = await savePhoto(
      buffer,
      file.type,
      entityType as PhotoEntityType
    );
    const photo = await createPhoto({
      entity_type: entityType as PhotoEntityType,
      entity_id: entityId,
      storage_key: key,
      content_type: file.type,
      caption: typeof caption === "string" && caption ? caption : null,
      created_by: createdBy,
    });
    return NextResponse.json({ data: photo }, { status: 201 });
  } catch (err) {
    console.error("POST /api/photos failed:", err);
    return NextResponse.json({ error: "上传照片失败" }, { status: 500 });
  }
}
