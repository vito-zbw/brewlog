// Client-side image downscaling shared by photo and avatar uploads. Renders
// through a canvas so full-resolution phone photos never reach storage.

import type { Photo, PhotoEntityType } from "@/types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片压缩失败"))),
      "image/jpeg",
      quality
    );
  });
}

export async function downscaleToJpeg(
  file: File,
  maxDimension: number,
  quality = 0.85
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const scale =
      Math.max(width, height) > maxDimension
        ? maxDimension / Math.max(width, height)
        : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("图片处理失败");
    // JPEG has no alpha — without a white base, transparent regions go black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await canvasToJpegBlob(canvas, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Downscales a picked image and uploads it for an entity via POST /api/photos.
 * Shared by the detail-page uploader and the inline new-bean flow. Throws a
 * Chinese error message on any non-OK response so callers can surface it.
 */
export async function uploadEntityPhoto(
  entityType: PhotoEntityType,
  entityId: number,
  file: File,
  caption?: string
): Promise<Photo> {
  const blob = await downscaleToJpeg(file, 1600);
  const formData = new FormData();
  formData.append("file", blob, "photo.jpg");
  formData.append("entity_type", entityType);
  formData.append("entity_id", String(entityId));
  if (caption && caption.trim()) formData.append("caption", caption.trim());

  const res = await fetch("/api/photos", { method: "POST", body: formData });
  const json = (await res.json().catch(() => null)) as {
    data?: Photo;
    error?: string;
  } | null;
  if (!res.ok || !json?.data) {
    throw new Error(json?.error ?? "上传失败，请重试。");
  }
  return json.data;
}
