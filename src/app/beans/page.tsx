"use client";

import { useEffect, useState, useCallback } from "react";
import type { Bean } from "@/types";
import { PROCESSING_METHODS, ROAST_LEVELS } from "@/types";
import { BeanCard } from "@/components/BeanCard";

export default function BeansPage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState("");
  const [roastLevel, setRoastLevel] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBeans = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (processing) params.set("processing", processing);
    if (roastLevel) params.set("roast_level", roastLevel);
    if (tag) params.set("tag", tag);

    const res = await fetch(`/api/beans?${params.toString()}`);
    const json = await res.json();
    setBeans(json.data);
    setLoading(false);
  }, [search, processing, roastLevel, tag]);

  useEffect(() => {
    const timer = setTimeout(fetchBeans, 300);
    return () => clearTimeout(timer);
  }, [fetchBeans]);

  const allTags = Array.from(
    new Set(
      beans.flatMap(
        (b) => b.tasting_notes_tags?.split(",").map((t) => t.trim()) ?? []
      )
    )
  ).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        Bean Library
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, origin, or roaster..."
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          />
          <select
            value={processing}
            onChange={(e) => setProcessing(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">All processing methods</option>
            {PROCESSING_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={roastLevel}
            onChange={(e) => setRoastLevel(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">All roast levels</option>
            {ROAST_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">All tasting notes</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-warm-gray text-center py-12">Loading beans...</p>
      ) : beans.length === 0 ? (
        <p className="text-warm-gray text-center py-12">
          No beans found. Try adjusting your filters.
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
