import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getVisitsWithBeans } from "@/lib/queries";
import { CrawlForm } from "@/components/CrawlForm";

export const dynamic = "force-dynamic";

export default async function NewCrawlPage() {
  // src/proxy.ts already gates /crawls/new behind login; this is defensive.
  const session = await auth();
  const userId = session?.user?.id;
  if (typeof userId !== "number") {
    redirect("/login");
  }

  const visits = await getVisitsWithBeans({ userId });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        创建咖啡之旅
      </h1>
      {visits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 text-center">
          <p className="text-warm-gray mb-4">
            先去记录几次探店，再来串成咖啡之旅吧
          </p>
          <Link href="/log" className="text-terracotta font-medium hover:underline">
            去记录
          </Link>
        </div>
      ) : (
        <CrawlForm visits={visits} />
      )}
    </div>
  );
}
