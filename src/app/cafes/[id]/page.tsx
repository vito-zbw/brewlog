import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCafe,
  getCafeCommunityStats,
  getVisitsWithBeans,
} from "@/lib/queries";
import { formatVisitDate } from "@/lib/terms";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { VisitCard } from "@/components/VisitCard";

export const dynamic = "force-dynamic";

export default async function CafeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cafeId = Number(id);
  if (!Number.isInteger(cafeId) || cafeId <= 0) {
    notFound();
  }
  const cafe = await getCafe(cafeId);

  if (!cafe) {
    notFound();
  }

  const [visits, stats] = await Promise.all([
    getVisitsWithBeans({ cafeId }),
    getCafeCommunityStats(cafeId),
  ]);

  // getVisitsWithBeans orders by visit_date DESC, so visits[0] is the newest.
  const lastVisitDate = visits.length > 0 ? visits[0].visit_date : null;

  const ratingItems = [
    { label: "总体", value: stats.avg_overall },
    { label: "豆子", value: stats.avg_bean_quality },
    { label: "咖啡师", value: stats.avg_barista_skill },
    { label: "环境", value: stats.avg_ambiance },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/cafes"
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; 返回地图
      </Link>

      <div
        data-testid="cafe-detail"
        className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 mb-8"
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
            {cafe.name}
          </h1>
          <ShareLinkButton />
        </div>
        <p className="text-warm-gray text-lg mb-2">
          {cafe.city}, {cafe.country}
        </p>

        {stats.visit_count > 0 && (
          <div data-testid="cafe-community-stats" className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ratingItems.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                    {label}
                  </p>
                  <p className="text-sm font-medium text-espresso">
                    ☕ {value} 分
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-warm-gray mt-3">
              {stats.visit_count} 次探店
              {lastVisitDate && (
                <> · 最近到访 {formatVisitDate(lastVisitDate)}</>
              )}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
        探店记录（{visits.length}）
      </h2>
      {visits.length === 0 ? (
        <p className="text-warm-gray text-center py-8">还没有探店记录。</p>
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
