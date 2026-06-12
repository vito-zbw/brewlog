import { db } from "@/lib/db";
import type {
  Cafe,
  CafeCommunityStats,
  CafeWithStats,
  NewCafeInput,
} from "@/types";
import { mapRows, firstRow, insertedId } from "./util";

export async function listCafesWithStats(): Promise<CafeWithStats[]> {
  // brew_methods (CSV of distinct methods) feeds the Phase 2 map filters.
  const rs = await db.execute(
    `SELECT c.*,
            MAX(v.rating_overall) AS max_rating,
            MAX(v.visit_date) AS last_visit_date,
            GROUP_CONCAT(DISTINCT v.brew_method) AS brew_methods,
            COUNT(v.id) AS visit_count
     FROM cafes c
     LEFT JOIN visits v ON v.cafe_id = c.id
     GROUP BY c.id
     ORDER BY c.name`
  );
  return mapRows<CafeWithStats>(rs);
}

export async function getCafe(id: number): Promise<Cafe | null> {
  return firstRow<Cafe>(
    await db.execute({ sql: "SELECT * FROM cafes WHERE id = ?", args: [id] })
  );
}

/** Community averages across all visits to a café (public café page). */
export async function getCafeCommunityStats(
  cafeId: number
): Promise<CafeCommunityStats> {
  const row = firstRow<CafeCommunityStats>(
    await db.execute({
      sql: `SELECT COUNT(*) AS visit_count,
                   ROUND(AVG(rating_overall), 1) AS avg_overall,
                   ROUND(AVG(rating_bean_quality), 1) AS avg_bean_quality,
                   ROUND(AVG(rating_barista_skill), 1) AS avg_barista_skill,
                   ROUND(AVG(rating_ambiance), 1) AS avg_ambiance
            FROM visits WHERE cafe_id = ?`,
      args: [cafeId],
    })
  );
  return (
    row ?? {
      visit_count: 0,
      avg_overall: null,
      avg_bean_quality: null,
      avg_barista_skill: null,
      avg_ambiance: null,
    }
  );
}

export async function createCafe(input: NewCafeInput): Promise<Cafe> {
  const rs = await db.execute({
    sql: `INSERT INTO cafes (name, city, country, latitude, longitude, website, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.name,
      input.city,
      input.country,
      input.latitude,
      input.longitude,
      input.website ?? null,
      input.user_id,
    ],
  });
  const cafe = await getCafe(insertedId(rs));
  if (!cafe) throw new Error("failed to load created cafe");
  return cafe;
}
