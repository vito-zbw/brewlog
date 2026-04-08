import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Bean, VisitWithDetails } from "@/types";
import { RatingBeans } from "@/components/RatingBeans";

interface StatsRow {
  total_beans: number;
  total_cafes: number;
  total_visits: number;
}

interface VisitRow {
  id: number;
  cafe_id: number;
  visited_by: string;
  visit_date: string;
  brew_method: string;
  rating_overall: number;
  rating_bean_quality: number;
  rating_barista_skill: number;
  rating_ambiance: number;
  notes: string | null;
  created_at: string;
  cafe_name: string;
  cafe_city: string;
}

export const dynamic = "force-dynamic";

export default function Home() {
  const db = getDb();

  const stats = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM beans) as total_beans,
        (SELECT COUNT(*) FROM cafes) as total_cafes,
        (SELECT COUNT(*) FROM visits) as total_visits`
    )
    .get() as StatsRow;

  const recentVisits = db
    .prepare(
      `SELECT v.*, c.name as cafe_name, c.city as cafe_city
       FROM visits v
       JOIN cafes c ON c.id = v.cafe_id
       ORDER BY v.visit_date DESC, v.created_at DESC
       LIMIT 3`
    )
    .all() as VisitRow[];

  const visitsWithBeans: VisitWithDetails[] = recentVisits.map((visit) => {
    const beans = db
      .prepare(
        `SELECT b.* FROM beans b
         JOIN visit_beans vb ON vb.bean_id = b.id
         WHERE vb.visit_id = ?`
      )
      .all(visit.id) as Bean[];
    return { ...visit, beans };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-[Playfair_Display] text-espresso mb-2">
          Welcome to BrewLog
        </h1>
        <p className="text-warm-gray text-lg">
          Your specialty coffee discovery journal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 text-center">
          <p className="text-4xl font-bold text-terracotta font-[Playfair_Display]">
            {stats.total_beans}
          </p>
          <p className="text-warm-gray mt-1">Beans Cataloged</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 text-center">
          <p className="text-4xl font-bold text-sage font-[Playfair_Display]">
            {stats.total_cafes}
          </p>
          <p className="text-warm-gray mt-1">Cafes Visited</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 text-center">
          <p className="text-4xl font-bold text-espresso font-[Playfair_Display]">
            {stats.total_visits}
          </p>
          <p className="text-warm-gray mt-1">Visits Logged</p>
        </div>
      </div>

      <div className="flex gap-4 justify-center mb-12">
        <Link
          href="/visits/new"
          className="px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl font-medium transition-colors shadow-sm"
        >
          Log a Visit
        </Link>
        <Link
          href="/beans"
          className="px-6 py-3 bg-espresso hover:bg-espresso-light text-cream rounded-xl font-medium transition-colors shadow-sm"
        >
          Browse Beans
        </Link>
        <Link
          href="/map"
          className="px-6 py-3 bg-sage hover:bg-sage-light text-cream rounded-xl font-medium transition-colors shadow-sm"
        >
          View Map
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-6">
          Latest Visits
        </h2>
        <div className="space-y-4">
          {visitsWithBeans.map((visit) => {
            const formattedDate = new Date(visit.visit_date).toLocaleDateString(
              "en-SG",
              { year: "numeric", month: "short", day: "numeric" }
            );
            return (
              <div
                key={visit.id}
                className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-[Playfair_Display] font-semibold text-espresso text-lg">
                      {visit.cafe_name}
                    </h3>
                    <p className="text-warm-gray text-sm">
                      {visit.cafe_city} &middot; {formattedDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <RatingBeans rating={visit.rating_overall} />
                    <p className="text-xs text-warm-gray mt-1">
                      by {visit.visited_by}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-espresso/10 text-espresso font-medium">
                    {visit.brew_method}
                  </span>
                  {visit.beans.map((bean) => (
                    <Link
                      key={bean.id}
                      href={`/beans/${bean.id}`}
                      className="text-xs px-2 py-0.5 rounded-full bg-sage/10 text-sage font-medium hover:bg-sage/20 transition-colors"
                    >
                      {bean.name}
                    </Link>
                  ))}
                </div>
                {visit.notes && (
                  <p className="text-sm text-warm-gray leading-relaxed line-clamp-2">
                    {visit.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
