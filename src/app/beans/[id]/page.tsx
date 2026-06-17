import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getBeanWithVisits, getSimilarBeans, listPhotos } from "@/lib/queries";
import { PROCESSING_METHODS, ROAST_LEVELS, optionLabel } from "@/lib/terms";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { VisitCard } from "@/components/VisitCard";
import { BeanCard } from "@/components/BeanCard";

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

  const photos = await listPhotos("bean", bean.id);
  const similarBeans = await getSimilarBeans(bean.id);
  const session = await auth();
  const isOwner = session?.user?.id === bean.user_id;

  const tags =
    bean.tasting_notes_tags
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) ?? [];
  const visits = bean.visits;
  const avgRating =
    visits.length > 0
      ? (
          visits.reduce((sum, v) => sum + v.rating_overall, 0) / visits.length
        ).toFixed(1)
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/beans"
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; 返回咖啡豆库
      </Link>

      <div
        data-testid="bean-detail"
        className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 mb-8"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
            {bean.name}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <ShareLinkButton />
            {isOwner && (
              <Link
                data-testid="bean-edit-link"
                href={`/beans/${bean.id}/edit`}
                className="px-3 py-1.5 border border-cream-dark rounded-lg text-sm text-espresso hover:bg-cream transition-colors"
              >
                编辑
              </Link>
            )}
          </div>
        </div>
        <p
          className={`text-warm-gray text-lg ${
            avgRating !== null ? "mb-2" : "mb-6"
          }`}
        >
          {bean.origin_country}
          {bean.origin_region ? `, ${bean.origin_region}` : ""}
        </p>
        {avgRating !== null && (
          <p
            data-testid="bean-community-stats"
            className="text-sm text-warm-gray mb-6"
          >
            共 {visits.length} 次品尝记录 · 平均评分 ☕ {avgRating} 分
          </p>
        )}

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

        <div className="mt-6">
          <h2 className="text-xs text-warm-gray/70 uppercase tracking-wider mb-2">
            照片
          </h2>
          {/* Photos are managed from the edit form now; detail page is view-only. */}
          <PhotoGallery photos={photos} canDelete={false} />
        </div>
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
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}

      {similarBeans.length > 0 && (
        <section data-testid="similar-beans" className="mt-10">
          <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
            相似咖啡豆 Similar Beans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similarBeans.map((b) => (
              <BeanCard key={b.id} bean={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
