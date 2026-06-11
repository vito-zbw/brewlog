import { notFound } from "next/navigation";
import Link from "next/link";
import { getCafe, getVisitsWithBeans, listPhotos } from "@/lib/queries";
import { formatVisitDate } from "@/lib/terms";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PhotoUpload } from "@/components/PhotoUpload";
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

  const visits = await getVisitsWithBeans({ cafeId });
  const photos = await listPhotos("cafe", cafeId);

  const maxRating =
    visits.length > 0 ? Math.max(...visits.map((v) => v.rating_overall)) : null;
  // getVisitsWithBeans orders by visit_date DESC, so visits[0] is the newest.
  const lastVisitDate = visits.length > 0 ? visits[0].visit_date : null;

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
        <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-2">
          {cafe.name}
        </h1>
        <p className="text-warm-gray text-lg mb-2">
          {cafe.city}, {cafe.country}
        </p>
        {cafe.website && (
          <a
            href={cafe.website}
            target="_blank"
            rel="noreferrer"
            className="text-terracotta hover:underline text-sm inline-block mb-2"
          >
            官网
          </a>
        )}

        {visits.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                最高评分
              </p>
              <p className="text-sm font-medium text-espresso">{maxRating}/5</p>
            </div>
            <div>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                探店次数
              </p>
              <p className="text-sm font-medium text-espresso">
                {visits.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-warm-gray/70 uppercase tracking-wider">
                最近到访
              </p>
              <p className="text-sm font-medium text-espresso">
                {lastVisitDate ? formatVisitDate(lastVisitDate) : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
        照片
      </h2>
      <div className="mb-8 space-y-4">
        <PhotoUpload entityType="cafe" entityId={cafeId} />
        <PhotoGallery photos={photos} />
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
