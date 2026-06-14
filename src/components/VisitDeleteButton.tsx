"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VisitDeleteButton({ visitId }: { visitId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm("确定删除这条探店记录吗？此操作不可撤销。")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visitId}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "删除失败，请重试");
        return;
      }
      // The visit is gone — go back to the list and refresh its cached data.
      router.push("/visits");
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
        data-testid="visit-delete"
        className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {deleting ? "删除中…" : "删除"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
