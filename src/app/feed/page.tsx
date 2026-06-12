import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeedVisits } from "@/lib/queries";
import { VisitCard } from "@/components/VisitCard";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await auth();
  if (typeof session?.user?.id !== "number") redirect("/login");

  const visits = await getFeedVisits(session.user.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso mb-6">
        关注动态
      </h1>

      {visits.length === 0 ? (
        <div
          data-testid="feed-empty"
          className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-8 text-center"
        >
          <p className="text-warm-gray mb-6">
            关注好友后，他们的探店动态会出现在这里。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/leaderboard"
              className="px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              去排行榜认识大家
            </Link>
            <Link
              href="/visits"
              className="px-6 py-3 rounded-xl border border-cream-dark text-espresso text-sm font-medium hover:bg-cream transition-colors"
            >
              浏览探店记录
            </Link>
          </div>
        </div>
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
