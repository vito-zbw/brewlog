import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCrawlWithStops, getReactionSummary } from "@/lib/queries";
import { formatVisitDate } from "@/lib/terms";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { VisitCard } from "@/components/VisitCard";
import { EngagementSection } from "@/components/EngagementSection";

export const dynamic = "force-dynamic";

export default async function CrawlDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const crawlId = Number(id);
  if (!Number.isInteger(crawlId) || crawlId <= 0) {
    notFound();
  }

  const crawl = await getCrawlWithStops(crawlId);
  if (!crawl) {
    notFound();
  }

  const session = await auth();
  const currentUserId =
    typeof session?.user?.id === "number" ? session.user.id : null;
  const isOwner = currentUserId === crawl.user_id;
  const reaction = await getReactionSummary(
    "crawl",
    crawl.id,
    currentUserId ?? undefined
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/crawls"
        className="text-terracotta hover:underline text-sm mb-4 inline-block"
      >
        &larr; 返回咖啡之旅
      </Link>

      <div
        data-testid="crawl-detail"
        className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 sm:p-8 mb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
              {crawl.title}
            </h1>
            <p className="text-warm-gray text-sm mt-2">
              {formatVisitDate(crawl.crawl_date)} &middot;{" "}
              <Link
                href={`/users/${crawl.user_id}`}
                className="hover:underline"
              >
                {crawl.user_name}
              </Link>{" "}
              &middot; {crawl.stops.length} 站
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareLinkButton />
            {isOwner && (
              <Link
                data-testid="crawl-edit-link"
                href={`/crawls/${crawl.id}/edit`}
                className="px-3 py-1.5 border border-cream-dark rounded-lg text-sm text-espresso hover:bg-cream transition-colors"
              >
                编辑
              </Link>
            )}
          </div>
        </div>

        {crawl.description && (
          <p className="text-sm text-warm-gray leading-relaxed whitespace-pre-wrap mt-4">
            {crawl.description}
          </p>
        )}
      </div>

      <EngagementSection
        resourceType="crawl"
        resourceId={crawl.id}
        currentUserId={currentUserId}
        initialReaction={reaction}
      />

      <div className="space-y-6">
        {crawl.stops.map((stop, index) => (
          <div
            key={stop.id}
            data-testid="crawl-stop-card"
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <div className="shrink-0">
              <div className="h-10 w-10 rounded-full bg-terracotta text-white flex items-center justify-center text-lg font-bold font-[Playfair_Display]">
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <VisitCard visit={stop} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
