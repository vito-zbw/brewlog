import Link from "next/link";
import { auth } from "@/auth";
import { listCrawls } from "@/lib/queries";
import { formatVisitDate } from "@/lib/terms";

export const dynamic = "force-dynamic";

export default async function CrawlsPage() {
  const [session, crawls] = await Promise.all([auth(), listCrawls()]);
  const loggedIn = typeof session?.user?.id === "number";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
            咖啡之旅
          </h1>
          <p className="text-warm-gray mt-1">多店连刷的探店合集</p>
        </div>
        {loggedIn && (
          <Link
            href="/crawls/new"
            className="shrink-0 px-4 py-2 bg-terracotta text-white rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
          >
            + 创建咖啡之旅
          </Link>
        )}
      </div>

      {crawls.length === 0 ? (
        <div
          data-testid="crawls-empty"
          className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 text-center"
        >
          <p className="text-warm-gray">还没有咖啡之旅。</p>
          {loggedIn && (
            <Link
              href="/crawls/new"
              className="mt-6 inline-block px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              创建第一个咖啡之旅
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {crawls.map((crawl) => (
            <div
              key={crawl.id}
              data-testid="crawl-card"
              className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
            >
              <h2 className="font-[Playfair_Display] font-semibold text-espresso text-lg">
                <Link href={`/crawls/${crawl.id}`} className="hover:underline">
                  {crawl.title}
                </Link>
              </h2>
              <p className="text-warm-gray text-sm mt-1">
                {formatVisitDate(crawl.crawl_date)} &middot; {crawl.stop_count}{" "}
                站 &middot; {crawl.user_name}
              </p>
              {crawl.description && (
                <p className="text-sm text-warm-gray leading-relaxed line-clamp-2 mt-2">
                  {crawl.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
