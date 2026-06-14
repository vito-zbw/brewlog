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
import { FollowCounts } from "@/components/FollowCounts";

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
          {viewerId === userId ? (
            <FollowCounts
              userId={userId}
              following={followCounts.following}
              followers={followCounts.followers}
            />
          ) : (
            <p className="text-warm-gray text-sm mt-1">
              <span data-testid="follow-counts">
                {followCounts.following} 关注 · {followCounts.followers} 粉丝
              </span>
            </p>
          )}
        </div>
        {viewerId !== null && viewerId !== userId && (
          <FollowButton targetUserId={userId} initialFollowing={viewerFollows} />
        )}
        {viewerId === userId && (
          <Link
            href="/settings"
            data-testid="profile-settings-link"
            aria-label="账号设置"
            title="账号设置"
            className="shrink-0 -mr-1 p-2 rounded-lg text-warm-gray hover:text-espresso hover:bg-cream transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </Link>
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
