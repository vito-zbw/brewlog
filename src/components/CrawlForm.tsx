"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VisitWithDetails } from "@/types";
import { formatVisitDate } from "@/lib/terms";

const inputClass =
  "w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm";
const cardClass = "bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6";
const headingClass = "text-lg font-[Playfair_Display] font-semibold text-espresso mb-4";
const labelClass = "block text-sm font-medium text-espresso mb-1";
const arrowClass =
  "px-2 py-0.5 rounded bg-cream-dark text-warm-gray hover:bg-cream-dark/80 disabled:opacity-40 transition-colors";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface CrawlFormProps {
  visits: VisitWithDetails[];
  initial?: {
    id: number;
    title: string;
    description: string;
    crawl_date: string;
    visit_ids: number[];
  };
}

export function CrawlForm({ visits, initial }: CrawlFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [crawlDate, setCrawlDate] = useState(initial?.crawl_date ?? todayLocal());
  const [selectedIds, setSelectedIds] = useState<number[]>(initial?.visit_ids ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const visitsById = new Map(visits.map((v) => [v.id, v]));
  const visitLabel = (v: VisitWithDetails) =>
    `${v.cafe_name} · ${formatVisitDate(v.visit_date)}`;

  const toggleVisit = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveStop = (index: number, delta: number) => {
    setSelectedIds((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("标题为必填项");
      return;
    }
    if (selectedIds.length === 0) {
      setError("请至少选择一条探店记录");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/crawls/${initial.id}` : "/api/crawls", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description,
          crawl_date: crawlDate,
          visit_ids: selectedIds,
        }),
      });
      const json = (await res.json()) as { data?: { id: number }; error?: string };
      const crawlId = json.data?.id ?? initial?.id;
      if (!res.ok || json.error || !crawlId) {
        setError(json.error ?? "保存失败，请稍后重试");
        return;
      }
      router.push(`/crawls/${crawlId}`);
    } catch {
      setError("保存失败，请检查网络后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    if (!window.confirm("确定删除这个咖啡之旅吗？此操作不可撤销。")) return;
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/crawls/${initial.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok || json.error) {
        setError(json.error ?? "删除失败，请重试");
        return;
      }
      router.push("/crawls");
    } catch {
      setError("删除失败，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={cardClass}>
        <h2 className={headingClass}>基本信息</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>标题</label>
            <input type="text" data-testid="crawl-title" value={title} placeholder="给这趟咖啡之旅起个名字"
              onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>描述（选填）</label>
            <textarea data-testid="crawl-description" value={description} rows={3}
              placeholder="这趟旅程有什么主题或亮点？"
              onChange={(e) => setDescription(e.target.value)} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>日期</label>
            <input type="date" data-testid="crawl-date" value={crawlDate}
              onChange={(e) => setCrawlDate(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={headingClass}>选择探店记录</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {visits.map((v) => (
            <label key={v.id} data-testid="crawl-visit-option"
              className="flex items-center gap-3 text-sm text-espresso px-3 py-2 rounded-lg hover:bg-cream/60 cursor-pointer">
              <input type="checkbox" checked={selectedIds.includes(v.id)}
                onChange={() => toggleVisit(v.id)} className="accent-terracotta" />
              <span>{visitLabel(v)}</span>
            </label>
          ))}
        </div>

        <h3 className="text-sm font-medium text-espresso mt-6 mb-2">行程顺序</h3>
        {selectedIds.length === 0 ? (
          <p className="text-sm text-warm-gray">还没有选择任何探店记录。</p>
        ) : (
          <ol className="space-y-2">
            {selectedIds.map((id, index) => {
              const v = visitsById.get(id);
              if (!v) return null;
              return (
                <li key={id} data-testid="crawl-stop"
                  className="flex items-center justify-between gap-3 text-sm text-espresso bg-cream/60 rounded-lg px-3 py-2">
                  <span>
                    <span className="text-terracotta font-medium mr-2">{index + 1}.</span>
                    {visitLabel(v)}
                  </span>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" data-testid="crawl-stop-up" aria-label="上移"
                      disabled={index === 0} onClick={() => moveStop(index, -1)} className={arrowClass}>
                      ↑
                    </button>
                    <button type="button" data-testid="crawl-stop-down" aria-label="下移"
                      disabled={index === selectedIds.length - 1} onClick={() => moveStop(index, 1)} className={arrowClass}>
                      ↓
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {error && (
        <div data-testid="crawl-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <button type="submit" data-testid="crawl-submit" disabled={saving}
        className="w-full py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50">
        {saving ? "保存中…" : "保存咖啡之旅"}
      </button>

      {initial && (
        <div className="flex justify-end border-t border-cream-dark/50 pt-4">
          <button type="button" data-testid="crawl-delete" disabled={deleting} onClick={handleDelete}
            className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {deleting ? "删除中…" : "删除咖啡之旅"}
          </button>
        </div>
      )}
    </form>
  );
}
