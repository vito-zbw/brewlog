import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import {
  getUserById,
  getUserStats,
  getUserFavoriteBeans,
  getVisitsWithBeans,
  getFollowCounts,
  isFollowing,
} from "@/lib/queries";
import { formatVisitDate } from "@/lib/terms";
import { VisitCard } from "@/components/VisitCard";
import { FollowButton } from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  const user = await getUserById(userId);
  if (!user) {
    notFound();
  }

  const session = await auth();
  const viewerId =
    typeof session?.user?.id === "number" ? session.user.id : null;

  const [stats, favoriteBeans, visits, followCounts, viewerFollows] =
    await Promise.all([
      getUserStats(userId),
      getUserFavoriteBeans(userId),
      getVisitsWithBeans({ userId }),
      getFollowCounts(userId),
      viewerId !== null && viewerId !== userId
        ? isFollowing(viewerId, userId)
        : Promise.resolve(false),
    ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        data-testid="profile-header"
        className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6 mb-8 flex items-center gap-4"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-terracotta text-white flex items-center justify-center text-2xl font-bold font-[Playfair_Display]">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-[Playfair_Display] text-espresso">
            {user.name}
          </h1>
          <p className="text-warm-gray text-sm mt-1">
            加入于 {formatVisitDate(user.created_at)}
          </p>
          <p className="text-warm-gray text-sm mt-1">
            <span data-testid="follow-counts">
              {followCounts.following} 关注 · {followCounts.followers} 粉丝
            </span>
          </p>
        </div>
        {viewerId !== null && viewerId !== userId && (
          <FollowButton targetUserId={userId} initialFollowing={viewerFollows} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5 text-center">
          <p
            data-testid="profile-stat-beans"
            className="text-3xl font-bold text-terracotta font-[Playfair_Display]"
          >
            {stats.total_beans_tried}
          </p>
          <p className="text-warm-gray text-sm mt-1">尝过的豆子</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5 text-center">
          <p
            data-testid="profile-stat-cafes"
            className="text-3xl font-bold text-sage font-[Playfair_Display]"
          >
            {stats.total_cafes_visited}
          </p>
          <p className="text-warm-gray text-sm mt-1">去过的咖啡馆</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5 text-center">
          <p
            data-testid="profile-stat-visits"
            className="text-3xl font-bold text-espresso font-[Playfair_Display]"
          >
            {stats.total_visits}
          </p>
          <p className="text-warm-gray text-sm mt-1">探店次数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div
          data-testid="favorite-beans"
          className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5"
        >
          <h3 className="font-[Playfair_Display] font-semibold text-espresso mb-4">
            最爱的豆子
          </h3>
          {favoriteBeans.length === 0 ? (
            <p className="text-warm-gray text-sm">还没有记录</p>
          ) : (
            <ul className="space-y-3">
              {favoriteBeans.map((bean) => (
                <li
                  key={bean.id}
                  className="flex items-center justify-between text-sm"
                >
                  <Link
                    href={`/beans/${bean.id}`}
                    className="text-espresso font-medium hover:underline"
                  >
                    {bean.name}
                  </Link>
                  <span className="text-warm-gray">
                    {bean.times_logged} 次记录
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-5">
          <h3 className="font-[Playfair_Display] font-semibold text-espresso mb-4">
            最爱产地
          </h3>
          {stats.top_origins.length === 0 ? (
            <p className="text-warm-gray text-sm">还没有数据</p>
          ) : (
            <ul className="space-y-3">
              {stats.top_origins.map((origin) => (
                <li
                  key={origin.origin_country}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-espresso font-medium">
                    {origin.origin_country}
                  </span>
                  <span className="text-warm-gray">
                    ☕ {origin.avg_rating} 分 · {origin.visit_count} 次
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold font-[Playfair_Display] text-espresso mb-4">
        {viewerId === userId ? "我的" : "TA 的"}探店记录（{visits.length}）
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
