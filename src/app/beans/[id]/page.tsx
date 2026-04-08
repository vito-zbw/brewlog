import { getDb } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Bean, VisitWithDetails } from "@/types";
import { RatingBeans } from "@/components/RatingBeans";
import Link from "next/link";

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

export default async function BeanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const bean = db.prepare("SELECT * FROM beans WHERE id = ?").get(Number(id)) as
    | Bean
    | undefined;

  if (!bean) {
    notFound();
  }

  const tags = bean.tasting_notes_tags?.split(",").map((t) => t.trim()) ?? [];

  const visitRows = db
    .prepare(
      `SELECT v.*, c.name as cafe_name, c.city as cafe_city
       FROM visits v
       JOIN cafes c ON c.id = v.cafe_id
       JOIN visit_beans vb ON vb.visit_id = v.id
       WHERE vb.bean_id = ?
       ORDER BY v.visit_date DESC`
    )
    .all(bean.id) as VisitRow[];

  const visits: VisitWithDetails[] = visitRows.map((row) => {
    const beans = db
      .prepare(
        `SELECT b.* FROM beans b
         JOIN visit_beans vb ON vb.bean_id = b.id
         WHERE vb.visit_id = ?`
      )
      .all(row.id) as Bean[];
    return { ...row, beans };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/beans"
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; Back to Bean Library
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 mb-8">
        <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-2">
          {bean.name}
        </h1>
        <p className="text-warm-gray text-lg mb-6">
          {bean.origin_country}
          {bean.origin_region ? `, ${bean.origin_region}` : ""}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {bean.roaster && (
            <div>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                Roaster
              </p>
              <p className="text-sm font-medium text-espresso">{bean.roaster}</p>
            </div>
          )}
          {bean.farm && (
            <div>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                Farm
              </p>
              <p className="text-sm font-medium text-espresso">{bean.farm}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
              Processing
            </p>
            <p className="text-sm font-medium text-espresso">
              {bean.processing_method}
            </p>
          </div>
          <div>
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
              Roast Level
            </p>
            <p className="text-sm font-medium text-espresso">
              {bean.roast_level}
            </p>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider mb-2">
              Tasting Notes
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-cream-dark text-warm-gray text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {bean.tasting_notes_freetext && (
          <div>
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider mb-2">
              Description
            </p>
            <p className="text-sm text-warm-gray leading-relaxed">
              {bean.tasting_notes_freetext}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
        Visits featuring this bean ({visits.length})
      </h2>

      {visits.length === 0 ? (
        <p className="text-warm-gray text-center py-8">
          No visits have tried this bean yet.
        </p>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => {
            const formattedDate = new Date(
              visit.visit_date
            ).toLocaleDateString("en-SG", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            return (
              <div
                key={visit.id}
                className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-[Playfair_Display] font-semibold text-espresso">
                      {visit.cafe_name}
                    </h3>
                    <p className="text-warm-gray text-sm">
                      {visit.cafe_city} &middot; {formattedDate} &middot;{" "}
                      {visit.brew_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <RatingBeans rating={visit.rating_overall} />
                    <p className="text-xs text-warm-gray mt-1">
                      by {visit.visited_by}
                    </p>
                  </div>
                </div>
                {visit.notes && (
                  <p className="text-sm text-warm-gray leading-relaxed">
                    {visit.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
