"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { Photo, PhotoEntityType } from "@/types";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

interface PhotoUploadProps {
  entityType: PhotoEntityType;
  entityId: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片压缩失败"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

// Downscale client-side so we never push full-resolution phone photos to R2.
async function downscaleToJpeg(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const scale =
      Math.max(width, height) > MAX_DIMENSION
        ? MAX_DIMENSION / Math.max(width, height)
        : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("图片处理失败");
    // JPEG has no alpha — without a white base, transparent PNG/WebP
    // regions encode as solid black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await canvasToJpegBlob(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PhotoUpload({ entityType, entityId }: PhotoUploadProps) {
  const [user] = useCurrentUser();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const blob = await downscaleToJpeg(file);
      const formData = new FormData();
      formData.append("file", blob, "photo.jpg");
      formData.append("entity_type", entityType);
      formData.append("entity_id", String(entityId));
      formData.append("created_by", user);
      if (caption.trim()) formData.append("caption", caption.trim());

      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { data?: Photo; error?: string };
      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "上传失败，请重试。");
        return;
      }
      setCaption("");
      router.refresh();
    } catch {
      setError("上传失败，请重试。");
    } finally {
      setUploading(false);
      // Reset so selecting the same file again re-triggers onChange.
      input.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex items-center px-4 py-2 bg-sage text-cream text-sm rounded-lg transition-colors ${
            uploading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-sage-light cursor-pointer"
          }`}
        >
          {uploading ? "上传中…" : "上传照片"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            data-testid="photo-upload-input"
            className="hidden"
            disabled={uploading}
            onChange={handleChange}
          />
        </label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="照片说明（选填）"
          data-testid="photo-caption-input"
          className="flex-1 min-w-40 px-3 py-2 text-sm border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        />
      </div>
      {error && (
        <div data-testid="photo-upload-error" className="text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
