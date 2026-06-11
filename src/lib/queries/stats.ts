import { db } from "@/lib/db";
import type { BrewStat, OriginStat, UserStats } from "@/types";
import { mapRows, firstRow } from "./util";

export async function getUserStats(user: string): Promise<UserStats> {
  // "Beans tried" counts distinct beans across the user's visits — not beans
  // the user happened to create in the catalog.
  const totals = firstRow<{
    total_beans_tried: number;
    total_cafes_visited: number;
    total_visits: number;
  }>(
    await db.execute({
      sql: `SELECT
              (SELECT COUNT(DISTINCT vb.bean_id)
                 FROM visit_beans vb
                 JOIN visits v ON v.id = vb.visit_id
                WHERE v.visited_by = ?) AS total_beans_tried,
              (SELECT COUNT(DISTINCT cafe_id) FROM visits WHERE visited_by = ?) AS total_cafes_visited,
              (SELECT COUNT(*) FROM visits WHERE visited_by = ?) AS total_visits`,
      args: [user, user, user],
    })
  );

  // The inner DISTINCT collapses multi-bean visits to one row per
  // (visit, origin) — otherwise a visit tasting two beans from the same
  // country counts twice and double-weights the average.
  const topOrigins = mapRows<OriginStat>(
    await db.execute({
      sql: `SELECT origin_country,
                   ROUND(AVG(rating_overall), 1) AS avg_rating,
                   COUNT(*) AS visit_count
            FROM (SELECT DISTINCT v.id, v.rating_overall, b.origin_country
                  FROM visits v
                  JOIN visit_beans vb ON vb.visit_id = v.id
                  JOIN beans b ON b.id = vb.bean_id
                  WHERE v.visited_by = ?)
            GROUP BY origin_country
            ORDER BY avg_rating DESC, visit_count DESC, origin_country
            LIMIT 5`,
      args: [user],
    })
  );

  const brewBreakdown = mapRows<BrewStat>(
    await db.execute({
      sql: `SELECT brew_method, COUNT(*) AS count
            FROM visits
            WHERE visited_by = ?
            GROUP BY brew_method
            ORDER BY count DESC, brew_method`,
      args: [user],
    })
  );

  return {
    total_beans_tried: totals?.total_beans_tried ?? 0,
    total_cafes_visited: totals?.total_cafes_visited ?? 0,
    total_visits: totals?.total_visits ?? 0,
    top_origins: topOrigins,
    brew_breakdown: brewBreakdown,
  };
}
