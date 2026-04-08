"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VisitWithDetails, Cafe, Bean as BeanType } from "@/types";
import { TEAM_MEMBERS } from "@/types";
import { VisitCard } from "@/components/VisitCard";

function VisitsContent() {
  const searchParams = useSearchParams();
  const [visits, setVisits] = useState<VisitWithDetails[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [beans, setBeans] = useState<BeanType[]>([]);
  const [loading, setLoading] = useState(true);

  const [cafeFilter, setCafeFilter] = useState(searchParams.get("cafe_id") ?? "");
  const [personFilter, setPersonFilter] = useState("");
  const [beanFilter, setBeanFilter] = useState("");

  useEffect(() => {
    async function loadFilters() {
      const [cafesRes, beansRes] = await Promise.all([
        fetch("/api/cafes"),
        fetch("/api/beans"),
      ]);
      const cafesJson = await cafesRes.json();
      const beansJson = await beansRes.json();
      setCafes(cafesJson.data);
      setBeans(beansJson.data);
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function loadVisits() {
      setLoading(true);
      const params = new URLSearchParams();
      if (cafeFilter) params.set("cafe_id", cafeFilter);
      if (personFilter) params.set("visited_by", personFilter);
      if (beanFilter) params.set("bean_id", beanFilter);

      const res = await fetch(`/api/visits?${params.toString()}`);
      const json = await res.json();
      setVisits(json.data);
      setLoading(false);
    }
    loadVisits();
  }, [cafeFilter, personFilter, beanFilter]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        Visit History
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">All people</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={cafeFilter}
            onChange={(e) => setCafeFilter(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">All cafes</option>
            {cafes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={beanFilter}
            onChange={(e) => setBeanFilter(e.target.value)}
            className="px-4 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm"
          >
            <option value="">All beans</option>
            {beans.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-warm-gray text-center py-12">Loading visits...</p>
      ) : visits.length === 0 ? (
        <p className="text-warm-gray text-center py-12">
          No visits found. Try adjusting your filters.
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
    <Suspense fallback={<p className="text-warm-gray text-center py-12">Loading...</p>}>
      <VisitsContent />
    </Suspense>
  );
}
