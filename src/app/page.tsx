import Link from "next/link";
import { auth } from "@/auth";
import { getDashboardStats, getVisitsWithBeans } from "@/lib/queries";
import { Dashboard } from "@/components/Dashboard";
import { VisitCard } from "@/components/VisitCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [session, stats, recentVisits] = await Promise.all([
    auth(),
    getDashboardStats(),
    getVisitsWithBeans({ limit: 3 }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-[Playfair_Display] text-espresso mb-2">
          欢迎来到 BrewLog
        </h1>
        <p className="text-warm-gray text-lg">你的精品咖啡探店日志</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 text-center">
          <p
            data-testid="stat-beans"
            className="text-4xl font-bold text-terracotta font-[Playfair_Display]"
          >
            {stats.total_beans}
          </p>
          <p className="text-warm-gray mt-1">已收录咖啡豆</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 text-center">
          <p
            data-testid="stat-cafes"
            className="text-4xl font-bold text-sage font-[Playfair_Display]"
          >
            {stats.total_cafes}
          </p>
          <p className="text-warm-gray mt-1">收录的咖啡馆</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 text-center">
          <p
            data-testid="stat-visits"
            className="text-4xl font-bold text-espresso font-[Playfair_Display]"
          >
            {stats.total_visits}
          </p>
          <p className="text-warm-gray mt-1">探店次数</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-12">
        <Link
          href="/log"
          className="px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl font-medium transition-colors shadow-sm"
        >
          记录探店
        </Link>
        <Link
          href="/beans"
          className="px-6 py-3 bg-espresso hover:bg-espresso-light text-cream rounded-xl font-medium transition-colors shadow-sm"
        >
          浏览咖啡豆
        </Link>
        <Link
          href="/cafes"
          className="px-6 py-3 bg-sage hover:bg-sage-light text-cream rounded-xl font-medium transition-colors shadow-sm"
        >
          查看地图
        </Link>
      </div>

      <Dashboard userName={session?.user?.name ?? ""} />

      <div>
        <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-6">
          最新探店
        </h2>
        <div className="space-y-4">
          {recentVisits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      </div>
    </div>
  );
}
