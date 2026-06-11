"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PhotoDeleteButton({ photoId }: { photoId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("确定删除这张照片吗？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="删除照片"
      data-testid="photo-delete-button"
      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-espresso/60 text-cream text-xs leading-none hover:bg-espresso transition-colors disabled:opacity-50"
    >
      ✕
    </button>
  );
}
