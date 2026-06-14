import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getVisitWithBeans, listPhotos } from "@/lib/queries";
import { BREW_METHODS, formatVisitDate, optionLabel } from "@/lib/terms";
import { RatingBeans } from "@/components/RatingBeans";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ShareLinkButton } from "@/components/ShareLinkButton";

export const dynamic = "force-dynamic";

export default async function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId) || visitId <= 0) {
    notFound();
  }
  const visit = await getVisitWithBeans(visitId);

  if (!visit) {
    notFound();
  }

  const photos = await listPhotos("visit", visitId);
  const session = await auth();
  const isOwner = session?.user?.id === visit.user_id;

  const ratings = [
    { label: "总体评分", value: visit.rating_overall },
    { label: "豆子品质", value: visit.rating_bean_quality },
    { label: "咖啡师水准", value: visit.rating_barista_skill },
    { label: "环境氛围", value: visit.rating_ambiance },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/visits"
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; 返回探店记录
      </Link>

      <div
        className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 mb-8"
        data-testid="visit-detail"
      >
        <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-2">
          <Link
            href={`/cafes/${visit.cafe_id}`}
            className="hover:text-terracotta transition-colors"
          >
            {visit.cafe_name}
          </Link>
        </h1>
        <p className="text-warm-gray text-sm mb-4">
          {visit.cafe_city} &middot; {formatVisitDate(visit.visit_date)} &middot;{" "}
          <Link
            href={`/users/${visit.user_id}`}
            className="hover:underline"
          >
            {visit.user_name} 记录
          </Link>
        </p>

        <div className="mb-6 flex items-center justify-between gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-espresso/10 text-espresso font-medium">
            {optionLabel(BREW_METHODS, visit.brew_method)}
          </span>
          <div className="flex items-center gap-2">
            <ShareLinkButton />
            {isOwner && (
              <Link
                data-testid="visit-edit-link"
                href={`/visits/${visitId}/edit`}
                className="px-3 py-1.5 border border-cream-dark rounded-lg text-sm text-espresso hover:bg-cream transition-colors"
              >
                编辑
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {ratings.map((rating) => (
            <div key={rating.label}>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider mb-1">
                {rating.label}
              </p>
              <p className="flex items-center gap-1.5">
                <RatingBeans rating={rating.value} size="sm" />
                <span className="text-sm font-medium text-espresso">
                  {rating.value}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <p className="text-xs text-warm-gray/70 uppercase tracking-wider mb-2">
            品尝的咖啡豆
          </p>
          {visit.beans.length === 0 ? (
            <p className="text-sm text-warm-gray">未记录咖啡豆</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visit.beans.map((bean) => (
                <Link
                  key={bean.id}
                  href={`/beans/${bean.id}`}
                  className="text-sm px-3 py-1 rounded-full bg-sage/10 text-sage font-medium hover:bg-sage/20 transition-colors"
                >
                  {bean.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {visit.notes && (
          <div>
            <p className="text-xs text-warm-gray/70 uppercase tracking-wider mb-2">
              备注
            </p>
            <p className="text-sm text-warm-gray leading-relaxed whitespace-pre-wrap">
              {visit.notes}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
        照片
      </h2>
      <div className="space-y-4">
        {isOwner && <PhotoUpload entityType="visit" entityId={visitId} />}
        <PhotoGallery photos={photos} currentUserId={session?.user?.id ?? null} />
      </div>
    </div>
  );
}
