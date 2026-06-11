import { notFound } from "next/navigation";
import Link from "next/link";
import { getBeanWithVisits } from "@/lib/queries";
import {
  BREW_METHODS,
  PROCESSING_METHODS,
  ROAST_LEVELS,
  formatVisitDate,
  optionLabel,
} from "@/lib/terms";
import { RatingBeans } from "@/components/RatingBeans";

export const dynamic = "force-dynamic";

export default async function BeanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const beanId = Number(id);
  if (!Number.isInteger(beanId) || beanId <= 0) {
    notFound();
  }
  const bean = await getBeanWithVisits(beanId);

  if (!bean) {
    notFound();
  }

  const tags =
    bean.tasting_notes_tags
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];
  const visits = bean.visits;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/beans"
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; 返回咖啡豆库
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
                烘焙商
              </p>
              <p className="text-sm font-medium text-espresso">{bean.roaster}</p>
            </div>
          )}
          {bean.farm && (
            <div>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                庄园
              </p>
              <p className="text-sm font-medium text-espresso">{bean.farm}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
              处理法
            </p>
            <p className="text-sm font-medium text-espresso">
              {optionLabel(PROCESSING_METHODS, bean.processing_method)}
            </p>
          </div>
          <div>
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
              烘焙度
            </p>
            <p className="text-sm font-medium text-espresso">
              {optionLabel(ROAST_LEVELS, bean.roast_level)}
            </p>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider mb-2">
              风味标签
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
              风味描述
            </p>
            <p className="text-sm text-warm-gray leading-relaxed">
              {bean.tasting_notes_freetext}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
        包含此豆的探店记录（{visits.length}）
      </h2>

      {visits.length === 0 ? (
        <p className="text-warm-gray text-center py-8">
          还没有探店记录用过这支豆。
        </p>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
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
                    {visit.cafe_city} &middot; {formatVisitDate(visit.visit_date)}{" "}
                    &middot; {optionLabel(BREW_METHODS, visit.brew_method)}
                  </p>
                </div>
                <div className="text-right">
                  <RatingBeans rating={visit.rating_overall} />
                  <p className="text-xs text-warm-gray mt-1">
                    {visit.visited_by} 记录
                  </p>
                </div>
              </div>
              {visit.notes && (
                <p className="text-sm text-warm-gray leading-relaxed">
                  {visit.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
