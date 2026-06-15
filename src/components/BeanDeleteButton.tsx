"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BeanDeleteButton({ beanId }: { beanId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm("确定删除这支咖啡豆吗？此操作不可撤销。")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/beans/${beanId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        // 409 = still referenced by visits; message tells the user what to do.
        setError(body.error ?? "删除失败，请重试");
        return;
      }
      router.push("/beans");
      router.refresh();
    } catch {
      setError("删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        data-testid="bean-delete"
        className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {deleting ? "删除中…" : "删除"}
      </button>
      {error && (
        <span data-testid="bean-delete-error" className="text-xs text-red-600 text-right max-w-xs">
          {error}
        </span>
      )}
    </div>
  );
}
