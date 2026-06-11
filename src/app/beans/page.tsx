"use client";

import { useEffect, useState } from "react";
import type { Bean } from "@/types";
import { PROCESSING_METHODS, ROAST_LEVELS } from "@/lib/terms";
import { BeanCard } from "@/components/BeanCard";

function extractTags(beans: Bean[]): string[] {
  return Array.from(
    new Set(
      beans.flatMap(
        (b) => b.tasting_notes_tags?.split(",").map((t) => t.trim()) ?? []
      )
    )
  ).sort();
}

export default function BeansPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState("");
  const [roastLevel, setRoastLevel] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 仅在首次加载时获取全部豆子，用于构建风味标签选项（不受筛选影响）
  useEffect(() => {
    const controller = new AbortController();
    async function loadTags() {
      try {
        const res = await fetch("/api/beans", { signal: controller.signal });
        if (!res.ok) return;
        const json: { data?: Bean[]; error?: string } = await res.json();
        setAllTags(extractTags(json.data ?? []));
      } catch {
        // 标签选项加载失败时保持为空，不影响列表展示
      }
    }
    loadTags();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (processing) params.set("processing", processing);
      if (roastLevel) params.set("roast_level", roastLevel);
      if (tag) params.set("tag", tag);

      try {
        const res = await fetch(`/api/beans?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`请求失败：${res.status}`);
        }
        const json: { data?: Bean[]; error?: string } = await res.json();
        setBeans(json.data ?? []);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("加载失败，请稍后重试。");
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, processing, roastLevel, tag]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        咖啡豆库
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索豆名、产地或烘焙商…"
            data-testid="bean-search"
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          />
          <select
            value={processing}
            onChange={(e) => setProcessing(e.target.value)}
            data-testid="bean-filter-processing"
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">全部处理法</option>
            {PROCESSING_METHODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={roastLevel}
            onChange={(e) => setRoastLevel(e.target.value)}
            data-testid="bean-filter-roast"
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">全部烘焙度</option>
            {ROAST_LEVELS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            data-testid="bean-filter-tag"
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">全部风味标签</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-warm-gray text-center py-12">加载中…</p>
      ) : error ? (
        <p className="text-warm-gray text-center py-12">{error}</p>
      ) : beans.length === 0 ? (
        <p className="text-warm-gray text-center py-12">
          没有找到符合条件的咖啡豆，试试调整筛选条件。
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {beans.map((bean) => (
            <BeanCard key={bean.id} bean={bean} />
          ))}
        </div>
      )}
    </div>
  );
}
