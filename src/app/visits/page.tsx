"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VisitWithDetails, Cafe, Bean as BeanType } from "@/types";
import { TEAM_MEMBERS } from "@/lib/terms";
import { VisitCard } from "@/components/VisitCard";

function VisitsContent() {
  const searchParams = useSearchParams();
  const [visits, setVisits] = useState<VisitWithDetails[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [beans, setBeans] = useState<BeanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cafeFilter, setCafeFilter] = useState(searchParams.get("cafe_id") ?? "");
  const [personFilter, setPersonFilter] = useState("");
  const [beanFilter, setBeanFilter] = useState("");

  useEffect(() => {
    async function loadFilters() {
      try {
        const [cafesRes, beansRes] = await Promise.all([
          fetch("/api/cafes"),
          fetch("/api/beans"),
        ]);
        if (!cafesRes.ok || !beansRes.ok) {
          throw new Error("请求失败");
        }
        const cafesJson: { data?: Cafe[]; error?: string } = await cafesRes.json();
        const beansJson: { data?: BeanType[]; error?: string } = await beansRes.json();
        setCafes(cafesJson.data ?? []);
        setBeans(beansJson.data ?? []);
      } catch {
        // 筛选项加载失败时保留默认的"所有…"选项，不影响页面
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadVisits() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (cafeFilter) params.set("cafe_id", cafeFilter);
      if (personFilter) params.set("visited_by", personFilter);
      if (beanFilter) params.set("bean_id", beanFilter);

      try {
        const res = await fetch(`/api/visits?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`请求失败：${res.status}`);
        }
        const json: { data?: VisitWithDetails[]; error?: string } = await res.json();
        setVisits(json.data ?? []);
      } catch {
        setVisits([]);
        setError("加载失败，请稍后重试。");
      } finally {
        setLoading(false);
      }
    }
    loadVisits();
  }, [cafeFilter, personFilter, beanFilter]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        探店记录
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            data-testid="visit-filter-person"
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">所有人</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            data-testid="visit-filter-cafe"
            value={cafeFilter}
            onChange={(e) => setCafeFilter(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">所有咖啡馆</option>
            {cafes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            data-testid="visit-filter-bean"
            value={beanFilter}
            onChange={(e) => setBeanFilter(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">所有咖啡豆</option>
            {beans.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-warm-gray text-center py-12">加载中…</p>
      ) : error ? (
        <p className="text-warm-gray text-center py-12">{error}</p>
      ) : visits.length === 0 ? (
        <p className="text-warm-gray text-center py-12">
          没有找到符合条件的探店记录，试试调整筛选条件。
        </p>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VisitsPage() {
  return (
    <Suspense fallback={<p className="text-warm-gray text-center py-12">加载中…</p>}>
      <VisitsContent />
    </Suspense>
  );
}
