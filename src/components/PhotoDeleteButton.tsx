"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PhotoDeleteButton({ photoId }: { photoId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm("确定删除这张照片吗？")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "删除失败，请重试");
        return;
      }
      router.refresh();
    } catch {
      setError("删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="删除照片"
        title={error ?? undefined}
        data-testid="photo-delete-button"
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-espresso/60 text-cream text-xs leading-none hover:bg-espresso transition-colors disabled:opacity-50"
      >
        ✕
      </button>
      {error && (
        <span
          role="alert"
          className="absolute top-9 right-1.5 z-10 rounded bg-espresso/90 px-1.5 py-0.5 text-[10px] text-cream"
        >
          {error}
        </span>
      )}
    </>
  );
}
