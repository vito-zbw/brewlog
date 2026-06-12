import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCrawlWithStops, getVisitsWithBeans } from "@/lib/queries";
import { CrawlForm } from "@/components/CrawlForm";

export const dynamic = "force-dynamic";

export default async function EditCrawlPage({
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

  // src/proxy.ts already gates /crawls/[id]/edit behind login; this is defensive.
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "number") {
    redirect("/login");
  }
  // Non-owners get the same 404 as a missing crawl — don't leak ownership.
  if (crawl.user_id !== userId) {
    notFound();
  }

  const visits = await getVisitsWithBeans({ userId });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        编辑咖啡之旅
      </h1>
      <CrawlForm
        visits={visits}
        initial={{
          id: crawl.id,
          title: crawl.title,
          description: crawl.description ?? "",
          crawl_date: crawl.crawl_date,
          visit_ids: crawl.stops.map((s) => s.id),
        }}
      />
    </div>
  );
}
