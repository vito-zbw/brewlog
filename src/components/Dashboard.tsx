"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserStats } from "@/types";
import { BREW_METHODS, optionLabel } from "@/lib/terms";

interface StatsResponse {
  data?: UserStats;
  error?: string;
}

// userName is null for anonymous visitors — the section then invites them to
// log in instead of fetching the (session-only) stats API.
export function Dashboard({ userName }: { userName: string | null }) {
  const loggedIn = userName !== null;
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(loggedIn);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/stats", {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`请求失败：${res.status}`);
        }
        const body = (await res.json()) as StatsResponse;
        if (!body.data) {
          throw new Error(body.error ?? "缺少统计数据");
        }
        setStats(body.data);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-6">
          我的咖啡足迹
        </h2>
        <div
          data-testid="dashboard-login-prompt"
          className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 text-center"
        >
          <p className="text-warm-gray mb-4">登录后查看你的个人咖啡足迹。</p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  const maxCount =
    stats && stats.brew_breakdown.length > 0
      ? Math.max(...stats.brew_breakdown.map((b) => b.count))
      : 1;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso">
          我的咖啡足迹
        </h2>
        <span data-testid="dashboard-user" className="text-warm-gray text-sm">
          {userName}
        </span>
      </div>

      {loading ? (
        <p className="text-warm-gray text-center py-8">加载中…</p>
      ) : error || !stats ? (
        <p className="text-warm-gray text-center py-8">
          统计数据加载失败，请稍后重试。
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5 text-center">
              <p
                data-testid="stat-my-beans"
                className="text-3xl font-bold text-terracotta font-[Playfair_Display]"
              >
                {stats.total_beans_tried}
              </p>
              <p className="text-warm-gray text-sm mt-1">尝过的豆子</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5 text-center">
              <p
                data-testid="stat-my-cafes"
                className="text-3xl font-bold text-sage font-[Playfair_Display]"
              >
                {stats.total_cafes_visited}
              </p>
              <p className="text-warm-gray text-sm mt-1">去过的咖啡馆</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5 text-center">
              <p
                data-testid="stat-my-visits"
                className="text-3xl font-bold text-espresso font-[Playfair_Display]"
              >
                {stats.total_visits}
              </p>
              <p className="text-warm-gray text-sm mt-1">探店次数</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              data-testid="top-origins"
              className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
            >
              <h3 className="font-[Playfair_Display] font-semibold text-espresso mb-4">
                最爱产地
              </h3>
              {stats.top_origins.length === 0 ? (
                <p className="text-warm-gray text-sm">还没有数据</p>
              ) : (
                <ul className="space-y-3">
                  {stats.top_origins.map((origin) => (
                    <li
                      key={origin.origin_country}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-espresso font-medium">
                        {origin.origin_country}
                      </span>
                      <span className="text-warm-gray">
                        ☕ {origin.avg_rating} 分 · {origin.visit_count} 次
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              data-testid="brew-breakdown"
              className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
            >
              <h3 className="font-[Playfair_Display] font-semibold text-espresso mb-4">
                冲煮方式偏好
              </h3>
              {stats.brew_breakdown.length === 0 ? (
                <p className="text-warm-gray text-sm">还没有数据</p>
              ) : (
                <ul className="space-y-3">
                  {stats.brew_breakdown.map((brew) => (
                    <li
                      key={brew.brew_method}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="text-espresso w-36 shrink-0 truncate">
                        {optionLabel(BREW_METHODS, brew.brew_method)}
                      </span>
                      <div className="flex-1 bg-cream-dark/30 rounded h-2">
                        <div
                          className="bg-terracotta rounded h-2"
                          style={{ width: `${(brew.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-warm-gray w-6 text-right shrink-0">
                        {brew.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
