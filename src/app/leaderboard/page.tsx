import Link from "next/link";
import { getOriginLeaderboard, getCafeLeaderboard } from "@/lib/queries";
import type { LeaderboardEntry } from "@/types";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardCard({
  title,
  entries,
  unit,
  testId,
}: {
  title: string;
  entries: LeaderboardEntry[];
  unit: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="bg-white rounded-xl shadow-sm border border-cream-dark/50 p-6"
    >
      <h2 className="text-lg font-bold font-[Playfair_Display] text-espresso mb-4">
        {title}
      </h2>
      {entries.length === 0 ? (
        <p className="text-warm-gray text-sm">还没有数据</p>
      ) : (
        <ol className="divide-y divide-cream-dark/40">
          {entries.map((entry, index) => (
            <li
              key={entry.user_id}
              data-testid="leaderboard-row"
              className="flex items-center gap-3 py-3"
            >
              <span className="w-8 text-center text-lg shrink-0">
                {MEDALS[index] ?? (
                  <span className="text-sm font-semibold text-warm-gray">
                    {index + 1}
                  </span>
                )}
              </span>
              {entry.user_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entry.user_image}
                  alt={entry.user_name}
                  className="h-7 w-7 rounded-full shrink-0"
                />
              ) : (
                <span className="h-7 w-7 rounded-full bg-terracotta text-cream flex items-center justify-center text-xs font-semibold shrink-0">
                  {entry.user_name.charAt(0)}
                </span>
              )}
              <Link
                href={`/users/${entry.user_id}`}
                className="flex-1 font-medium text-espresso hover:text-terracotta truncate"
              >
                {entry.user_name}
              </Link>
              <span className="text-sm text-warm-gray shrink-0">
                {entry.value} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function LeaderboardPage() {
  const [origins, cafes] = await Promise.all([
    getOriginLeaderboard(),
    getCafeLeaderboard(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold font-[Playfair_Display] text-espresso">
        排行榜
      </h1>
      <p className="text-warm-gray mt-1 mb-8">看看谁探索得最远</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaderboardCard
          title="产地探索榜"
          entries={origins}
          unit="个产地"
          testId="leaderboard-origins"
        />
        <LeaderboardCard
          title="探店达人榜"
          entries={cafes}
          unit="家咖啡馆"
          testId="leaderboard-cafes"
        />
      </div>
    </div>
  );
}
