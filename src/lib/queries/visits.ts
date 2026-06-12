import { db } from "@/lib/db";
import type { Bean, NewVisitInput, VisitWithDetails } from "@/types";
import { mapRows, firstRow } from "./util";

export interface VisitFilters {
  cafeId?: number;
  userId?: number;
  beanId?: number;
  limit?: number;
}

interface VisitBeanRow extends Bean {
  visit_id: number;
}

const VISIT_SELECT = `SELECT v.*, c.name AS cafe_name, c.city AS cafe_city, u.name AS user_name
                      FROM visits v
                      JOIN cafes c ON c.id = v.cafe_id
                      JOIN users u ON u.id = v.user_id`;

async function attachBeans(
  visits: Omit<VisitWithDetails, "beans">[]
): Promise<VisitWithDetails[]> {
  if (visits.length === 0) return [];
  // One IN(...) query for all visits instead of one query per visit.
  const ids = visits.map((v) => v.id);
  const placeholders = ids.map(() => "?").join(",");
  const rs = await db.execute({
    sql: `SELECT b.*, vb.visit_id FROM beans b
          JOIN visit_beans vb ON vb.bean_id = b.id
          WHERE vb.visit_id IN (${placeholders})`,
    args: ids,
  });
  const byVisit = new Map<number, Bean[]>();
  for (const row of mapRows<VisitBeanRow>(rs)) {
    const { visit_id, ...bean } = row;
    const list = byVisit.get(visit_id) ?? [];
    list.push(bean);
    byVisit.set(visit_id, list);
  }
  return visits.map((v) => ({ ...v, beans: byVisit.get(v.id) ?? [] }));
}

export async function getVisitsWithBeans(
  filters: VisitFilters = {}
): Promise<VisitWithDetails[]> {
  let sql = `${VISIT_SELECT} WHERE 1=1`;
  const args: (string | number)[] = [];

  if (filters.cafeId) {
    sql += " AND v.cafe_id = ?";
    args.push(filters.cafeId);
  }
  if (filters.userId) {
    sql += " AND v.user_id = ?";
    args.push(filters.userId);
  }
  if (filters.beanId) {
    sql += " AND v.id IN (SELECT visit_id FROM visit_beans WHERE bean_id = ?)";
    args.push(filters.beanId);
  }
  sql += " ORDER BY v.visit_date DESC, v.created_at DESC";
  if (filters.limit) {
    sql += " LIMIT ?";
    args.push(filters.limit);
  }

  const visits = mapRows<Omit<VisitWithDetails, "beans">>(
    await db.execute({ sql, args })
  );
  return attachBeans(visits);
}

export async function getVisitWithBeans(
  id: number
): Promise<VisitWithDetails | null> {
  const visit = firstRow<Omit<VisitWithDetails, "beans">>(
    await db.execute({ sql: `${VISIT_SELECT} WHERE v.id = ?`, args: [id] })
  );
  if (!visit) return null;
  const [withBeans] = await attachBeans([visit]);
  return withBeans;
}

/** Visits from users the given user follows, most recently logged first. */
export async function getFeedVisits(
  userId: number,
  limit = 50
): Promise<VisitWithDetails[]> {
  const visits = mapRows<Omit<VisitWithDetails, "beans">>(
    await db.execute({
      sql: `${VISIT_SELECT}
            WHERE v.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
            ORDER BY v.created_at DESC, v.visit_date DESC
            LIMIT ?`,
      args: [userId, limit],
    })
  );
  return attachBeans(visits);
}

/** Specific visits by id (crawl stops). */
export async function getVisitsByIds(
  ids: number[]
): Promise<VisitWithDetails[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const visits = mapRows<Omit<VisitWithDetails, "beans">>(
    await db.execute({
      sql: `${VISIT_SELECT} WHERE v.id IN (${placeholders})`,
      args: ids,
    })
  );
  return attachBeans(visits);
}

export async function createVisit(
  input: NewVisitInput
): Promise<VisitWithDetails> {
  const tx = await db.transaction("write");
  let visitId: number;
  try {
    const rs = await tx.execute({
      sql: `INSERT INTO visits (cafe_id, user_id, visit_date, brew_method,
              rating_overall, rating_bean_quality, rating_barista_skill, rating_ambiance, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        input.cafe_id,
        input.user_id,
        input.visit_date,
        input.brew_method,
        input.rating_overall,
        input.rating_bean_quality,
        input.rating_barista_skill,
        input.rating_ambiance,
        input.notes ?? null,
      ],
    });
    visitId = Number(rs.lastInsertRowid);
    for (const beanId of input.bean_ids ?? []) {
      await tx.execute({
        sql: "INSERT INTO visit_beans (visit_id, bean_id) VALUES (?, ?)",
        args: [visitId, beanId],
      });
    }
    await tx.commit();
  } finally {
    tx.close();
  }
  const visit = await getVisitWithBeans(visitId);
  if (!visit) throw new Error("failed to load created visit");
  return visit;
}

export async function getDashboardStats(): Promise<{
  total_beans: number;
  total_cafes: number;
  total_visits: number;
}> {
  const rs = await db.execute(
    `SELECT
       (SELECT COUNT(*) FROM beans) AS total_beans,
       (SELECT COUNT(*) FROM cafes) AS total_cafes,
       (SELECT COUNT(*) FROM visits) AS total_visits`
  );
  const row = firstRow<{
    total_beans: number;
    total_cafes: number;
    total_visits: number;
  }>(rs);
  return row ?? { total_beans: 0, total_cafes: 0, total_visits: 0 };
}
