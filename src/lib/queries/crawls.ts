import { db } from "@/lib/db";
import type {
  Crawl,
  CrawlSummary,
  CrawlWithStops,
  NewCrawlInput,
  VisitWithDetails,
} from "@/types";
import { mapRows, firstRow } from "./util";
import { getVisitsByIds } from "./visits";

export async function listCrawls(): Promise<CrawlSummary[]> {
  const rs = await db.execute(
    `SELECT c.*, u.name AS user_name,
            (SELECT COUNT(*) FROM crawl_visits cv WHERE cv.crawl_id = c.id) AS stop_count
     FROM crawls c
     JOIN users u ON u.id = c.user_id
     ORDER BY c.crawl_date DESC, c.created_at DESC`
  );
  return mapRows<CrawlSummary>(rs);
}

export async function getCrawlWithStops(
  id: number
): Promise<CrawlWithStops | null> {
  const crawl = firstRow<Crawl & { user_name: string }>(
    await db.execute({
      sql: `SELECT c.*, u.name AS user_name
            FROM crawls c JOIN users u ON u.id = c.user_id
            WHERE c.id = ?`,
      args: [id],
    })
  );
  if (!crawl) return null;

  const order = mapRows<{ visit_id: number }>(
    await db.execute({
      sql: `SELECT visit_id FROM crawl_visits WHERE crawl_id = ? ORDER BY stop_order`,
      args: [id],
    })
  ).map((r) => r.visit_id);

  const visits = await getVisitsByIds(order);
  const byId = new Map(visits.map((v) => [v.id, v]));
  const stops = order
    .map((visitId) => byId.get(visitId))
    .filter((v): v is VisitWithDetails => v !== undefined);
  return { ...crawl, stops };
}

/** Visit ids that belong to the given user (ownership check for crawls). */
export async function filterOwnVisitIds(
  userId: number,
  visitIds: number[]
): Promise<number[]> {
  if (visitIds.length === 0) return [];
  const placeholders = visitIds.map(() => "?").join(",");
  const rs = await db.execute({
    sql: `SELECT id FROM visits WHERE user_id = ? AND id IN (${placeholders})`,
    args: [userId, ...visitIds],
  });
  return mapRows<{ id: number }>(rs).map((r) => r.id);
}

export async function createCrawl(input: NewCrawlInput): Promise<number> {
  const tx = await db.transaction("write");
  let crawlId: number;
  try {
    const rs = await tx.execute({
      sql: `INSERT INTO crawls (user_id, title, description, crawl_date)
            VALUES (?, ?, ?, ?)`,
      args: [
        input.user_id,
        input.title,
        input.description ?? null,
        input.crawl_date,
      ],
    });
    crawlId = Number(rs.lastInsertRowid);
    for (const [index, visitId] of input.visit_ids.entries()) {
      await tx.execute({
        sql: `INSERT INTO crawl_visits (crawl_id, visit_id, stop_order)
              VALUES (?, ?, ?)`,
        args: [crawlId, visitId, index + 1],
      });
    }
    await tx.commit();
  } finally {
    tx.close();
  }
  return crawlId;
}

export async function updateCrawl(
  id: number,
  input: Omit<NewCrawlInput, "user_id">
): Promise<void> {
  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: `UPDATE crawls SET title = ?, description = ?, crawl_date = ? WHERE id = ?`,
      args: [input.title, input.description ?? null, input.crawl_date, id],
    });
    await tx.execute({
      sql: "DELETE FROM crawl_visits WHERE crawl_id = ?",
      args: [id],
    });
    for (const [index, visitId] of input.visit_ids.entries()) {
      await tx.execute({
        sql: `INSERT INTO crawl_visits (crawl_id, visit_id, stop_order)
              VALUES (?, ?, ?)`,
        args: [id, visitId, index + 1],
      });
    }
    await tx.commit();
  } finally {
    tx.close();
  }
}

export async function deleteCrawl(id: number): Promise<void> {
  // crawl_visits rows go with it via ON DELETE CASCADE — but libsql may not
  // enforce FKs, so delete the join rows explicitly first.
  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: "DELETE FROM crawl_visits WHERE crawl_id = ?",
      args: [id],
    });
    // Phase 6 social rows attached to this crawl (manual cascade — no FK).
    await tx.execute({
      sql: "DELETE FROM comments WHERE resource_type = 'crawl' AND resource_id = ?",
      args: [id],
    });
    await tx.execute({
      sql: "DELETE FROM reactions WHERE resource_type = 'crawl' AND resource_id = ?",
      args: [id],
    });
    await tx.execute({
      sql: "DELETE FROM notifications WHERE resource_type = 'crawl' AND resource_id = ?",
      args: [id],
    });
    await tx.execute({ sql: "DELETE FROM crawls WHERE id = ?", args: [id] });
    await tx.commit();
  } finally {
    tx.close();
  }
}
