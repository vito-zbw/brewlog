"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { downscaleToJpeg } from "@/lib/image-client";

interface AvatarUploadProps {
  userId: number;
  currentImage: string | null;
  name: string;
}

const AVATAR_MAX_DIMENSION = 400;

export function AvatarUpload({
  userId,
  currentImage,
  name,
}: AvatarUploadProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const blob = await downscaleToJpeg(file, AVATAR_MAX_DIMENSION);
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      const res = await fetch(`/api/users/${userId}/avatar`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        data?: { image: string };
        error?: string;
      };
      if (!res.ok || json.error || !json.data) {
        setError(json.error ?? "上传失败，请重试。");
        return;
      }
      router.refresh();
    } catch {
      setError("上传失败，请重试。");
    } finally {
      setBusy(false);
      input.value = "";
    }
  };

  const handleRemove = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/avatar`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { data?: unknown; error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "删除失败，请重试。");
        return;
      }
      router.refresh();
    } catch {
      setError("删除失败，请重试。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={name}
            data-testid="avatar-preview"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div
            data-testid="avatar-preview"
            className="h-16 w-16 rounded-full bg-terracotta text-white flex items-center justify-center text-2xl font-bold font-[Playfair_Display]"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`inline-flex items-center px-4 py-2 bg-sage text-cream text-sm rounded-lg transition-colors ${
              busy
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-sage-light cursor-pointer"
            }`}
          >
            {busy ? "处理中…" : "上传头像"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-testid="avatar-input"
              className="hidden"
              disabled={busy}
              onChange={handleChange}
            />
          </label>
          {currentImage && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              data-testid="avatar-remove"
              className="px-4 py-2 text-sm text-warm-gray hover:text-espresso transition-colors disabled:opacity-50"
            >
              恢复默认头像
            </button>
          )}
        </div>
      </div>
      {error && (
        <p data-testid="avatar-error" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
