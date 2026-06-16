"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Cafe, Bean as BeanType } from "@/types";
import { VisitFeed } from "@/components/VisitFeed";

interface UserOption {
  id: number;
  name: string;
}

function VisitsContent() {
  const searchParams = useSearchParams();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [beans, setBeans] = useState<BeanType[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [cafeFilter, setCafeFilter] = useState(searchParams.get("cafe_id") ?? "");
  const [personFilter, setPersonFilter] = useState("");
  const [beanFilter, setBeanFilter] = useState("");

  useEffect(() => {
    async function loadFilters() {
      try {
        const [cafesRes, beansRes, usersRes] = await Promise.all([
          fetch("/api/cafes"),
          fetch("/api/beans"),
          fetch("/api/users"),
        ]);
        if (!cafesRes.ok || !beansRes.ok || !usersRes.ok) {
          throw new Error("请求失败");
        }
        const cafesJson: { data?: Cafe[]; error?: string } = await cafesRes.json();
        const beansJson: { data?: BeanType[]; error?: string } = await beansRes.json();
        const usersJson: { data?: UserOption[]; error?: string } = await usersRes.json();
        setCafes(cafesJson.data ?? []);
        setBeans(beansJson.data ?? []);
        setUsers(usersJson.data ?? []);
      } catch {
        // 筛选项加载失败时保留默认的"所有…"选项，不影响页面
      }
    }
    loadFilters();
  }, []);

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
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
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

      <VisitFeed
        mode="filtered"
        endpoint="/api/visits"
        filters={{
          cafe_id: cafeFilter || undefined,
          user_id: personFilter || undefined,
          bean_id: beanFilter || undefined,
        }}
      />
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
