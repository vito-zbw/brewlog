import { db } from "@/lib/db";
import type {
  Bean,
  NewVisitInput,
  UpdateVisitInput,
  VisitCursor,
  VisitsPage,
  VisitWithDetails,
} from "@/types";
import { mapRows, firstRow } from "./util";

/** Default page size for keyset-paginated visit lists (/visits, /feed). */
export const DEFAULT_PAGE_SIZE = 20;

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

/**
 * Builds the SELECT + WHERE + ORDER BY shared by every visit list (no LIMIT).
 * Ordering is unified across all surfaces: `visit_date DESC, id DESC`. `id` is
 * a unique, monotonic tiebreaker, which both makes the ordering deterministic
 * for keyset pagination and keeps /feed and /visits showing the same visit in
 * the same spot. `followerId` (kept separate from filters.userId, which means
 * "authored by this user") restricts to the feed scope — visits by people the
 * follower follows.
 */
function buildVisitQuery(
  filters: VisitFilters,
  followerId: number | undefined,
  cursor: VisitCursor | null
): { sql: string; args: (string | number)[] } {
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
  if (followerId !== undefined) {
    sql +=
      " AND v.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)";
    args.push(followerId);
  }
  if (cursor) {
    // Keyset "older than the cursor" predicate for `visit_date DESC, id DESC`.
    // Explicit two-clause OR form (not SQLite row-value tuples, which compare
    // with ASC semantics and misbehave against DESC-ordered keys).
    sql += " AND (v.visit_date < ? OR (v.visit_date = ? AND v.id < ?))";
    args.push(cursor.visitDate, cursor.visitDate, cursor.id);
  }
  sql += " ORDER BY v.visit_date DESC, v.id DESC";
  return { sql, args };
}

/**
 * Full (unbounded, unless filters.limit is set) visit list. Signature and
 * `VisitWithDetails[]` return shape are unchanged for its existing callers —
 * including the crawl pickers, which need every selectable visit, not a page.
 * Only the ORDER BY tiebreaker changed (created_at → id) via buildVisitQuery.
 */
export async function getVisitsWithBeans(
  filters: VisitFilters = {}
): Promise<VisitWithDetails[]> {
  const { sql, args } = buildVisitQuery(filters, undefined, null);
  let finalSql = sql;
  const finalArgs = [...args];
  if (filters.limit) {
    finalSql += " LIMIT ?";
    finalArgs.push(filters.limit);
  }
  const visits = mapRows<Omit<VisitWithDetails, "beans">>(
    await db.execute({ sql: finalSql, args: finalArgs })
  );
  return attachBeans(visits);
}

/**
 * Core keyset pagination: fetches one extra row (pageSize + 1) to detect a
 * further page without a COUNT, derives nextCursor from the last kept row, and
 * attaches beans only to the returned page (so the IN(...) bind list is bounded
 * by pageSize, never by the total table size).
 */
async function fetchVisitsPage(
  filters: VisitFilters,
  followerId: number | undefined,
  cursor: VisitCursor | null,
  pageSize: number
): Promise<VisitsPage> {
  const { sql, args } = buildVisitQuery(filters, followerId, cursor);
  const rows = mapRows<Omit<VisitWithDetails, "beans">>(
    await db.execute({ sql: `${sql} LIMIT ?`, args: [...args, pageSize + 1] })
  );
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? { visitDate: last.visit_date, id: last.id } : null;
  return { visits: await attachBeans(pageRows), nextCursor };
}

/** One keyset page of the public visit timeline (optionally filtered). */
export function getVisitsPage(
  filters: VisitFilters,
  cursor: VisitCursor | null,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<VisitsPage> {
  return fetchVisitsPage(filters, undefined, cursor, pageSize);
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

/**
 * One keyset page of the activity feed: visits by people `userId` follows,
 * ordered by when the visit happened (visit_date DESC, id DESC) — aligned with
 * the public timeline so the same visit sits in the same place on both, and
 * paged so a busy followed set no longer silently hides older activity.
 */
export function getFeedVisits(
  userId: number,
  cursor: VisitCursor | null,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<VisitsPage> {
  return fetchVisitsPage({}, userId, cursor, pageSize);
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

/**
 * Updates an existing visit and replaces its bean set in one transaction
 * (mirror of updateCrawl). Leaves user_id untouched — ownership never moves.
 * If the edit moves the visit to a different café and the original café is
 * left with no visits, that now-orphaned café (and its photos) is garbage-
 * collected too — the same upward sweep as deleteVisit. Returns any café photo
 * storage keys to purge (empty unless a café was collected).
 */
export async function updateVisit(
  id: number,
  input: UpdateVisitInput
): Promise<{ photoKeys: string[] }> {
  const tx = await db.transaction("write");
  try {
    const oldCafeId =
      firstRow<{ cafe_id: number }>(
        await tx.execute({
          sql: "SELECT cafe_id FROM visits WHERE id = ?",
          args: [id],
        })
      )?.cafe_id ?? null;

    await tx.execute({
      sql: `UPDATE visits SET cafe_id = ?, visit_date = ?, brew_method = ?,
              rating_overall = ?, rating_bean_quality = ?,
              rating_barista_skill = ?, rating_ambiance = ?, notes = ?
            WHERE id = ?`,
      args: [
        input.cafe_id,
        input.visit_date,
        input.brew_method,
        input.rating_overall,
        input.rating_bean_quality,
        input.rating_barista_skill,
        input.rating_ambiance,
        input.notes ?? null,
        id,
      ],
    });
    await tx.execute({
      sql: "DELETE FROM visit_beans WHERE visit_id = ?",
      args: [id],
    });
    for (const beanId of input.bean_ids ?? []) {
      await tx.execute({
        sql: "INSERT INTO visit_beans (visit_id, bean_id) VALUES (?, ?)",
        args: [id, beanId],
      });
    }

    // Moving the visit to a different café can orphan the original one.
    const photoKeys =
      oldCafeId != null && oldCafeId !== input.cafe_id
        ? await gcCafeIfOrphaned(tx, oldCafeId)
        : [];

    await tx.commit();
    return { photoKeys };
  } finally {
    tx.close();
  }
}

/** A write-transaction handle, as returned by db.transaction("write"). */
type WriteTx = Awaited<ReturnType<typeof db.transaction>>;

/**
 * Garbage-collects a café that has no remaining visits. Cafés are only ever
 * created alongside a visit (the inline "新增咖啡馆" path in the log form), so a
 * visit-less café is always an orphan. Deletes the café and its photos inside
 * the caller's write transaction and returns the café's photo storage keys so
 * the caller can purge the underlying objects. No-op (returns []) if the café
 * still has visits. libsql does not enforce FKs, so this cascade is manual.
 */
async function gcCafeIfOrphaned(tx: WriteTx, cafeId: number): Promise<string[]> {
  const remaining = firstRow<{ n: number }>(
    await tx.execute({
      sql: "SELECT COUNT(*) AS n FROM visits WHERE cafe_id = ?",
      args: [cafeId],
    })
  );
  if (!remaining || remaining.n !== 0) return [];
  // Café photos can no longer be created (cafés have no photo UI; the API no
  // longer accepts entity_type='cafe'), but production may still hold rows from
  // before that capability was removed. Sweep any such legacy rows + their
  // storage objects here so a GC'd café leaves nothing orphaned. On fresh DBs
  // the schema CHECK forbids 'cafe', so this is simply a no-op there.
  const keys = mapRows<{ storage_key: string }>(
    await tx.execute({
      sql: "SELECT storage_key FROM photos WHERE entity_type = 'cafe' AND entity_id = ?",
      args: [cafeId],
    })
  ).map((r) => r.storage_key);
  await tx.execute({
    sql: "DELETE FROM photos WHERE entity_type = 'cafe' AND entity_id = ?",
    args: [cafeId],
  });
  await tx.execute({ sql: "DELETE FROM cafes WHERE id = ?", args: [cafeId] });
  return keys;
}

/**
 * Hard-deletes a visit and every dependent row (visit_beans join rows, the
 * visit's photos, and crawl_visits stops), then resequences the remaining
 * stops of any affected crawl to a dense 1..n order. If this was the parent
 * café's last visit, the now-orphaned café (and its photos) is removed too —
 * cafés are only ever created alongside a visit, so a visit-less café is
 * always an orphan. Returns the deleted visit's photo storage keys (plus any
 * café photo keys) so the caller can purge the underlying objects (storage
 * I/O can't live inside the DB transaction).
 *
 * libsql does not enforce foreign keys, so every dependent is removed
 * explicitly rather than relying on ON DELETE CASCADE — same reasoning as
 * deleteCrawl in ./crawls. The manual cascade now also sweeps *upward* to the
 * childless parent café, not just downward to children.
 */
export async function deleteVisit(
  id: number
): Promise<{ photoKeys: string[] }> {
  const tx = await db.transaction("write");
  try {
    const photoKeys = mapRows<{ storage_key: string }>(
      await tx.execute({
        sql: "SELECT storage_key FROM photos WHERE entity_type = 'visit' AND entity_id = ?",
        args: [id],
      })
    ).map((r) => r.storage_key);

    const crawlIds = mapRows<{ crawl_id: number }>(
      await tx.execute({
        sql: "SELECT crawl_id FROM crawl_visits WHERE visit_id = ?",
        args: [id],
      })
    ).map((r) => r.crawl_id);

    // Capture the parent café before the visit row is gone, so we can GC it
    // below if this delete leaves it with no visits.
    const cafeId =
      firstRow<{ cafe_id: number }>(
        await tx.execute({
          sql: "SELECT cafe_id FROM visits WHERE id = ?",
          args: [id],
        })
      )?.cafe_id ?? null;

    await tx.execute({
      sql: "DELETE FROM visit_beans WHERE visit_id = ?",
      args: [id],
    });
    await tx.execute({
      sql: "DELETE FROM photos WHERE entity_type = 'visit' AND entity_id = ?",
      args: [id],
    });
    await tx.execute({
      sql: "DELETE FROM crawl_visits WHERE visit_id = ?",
      args: [id],
    });

    // Renumber each affected crawl's remaining stops to a gap-free 1..n order.
    // Runs after the deleted visit's row is gone, so the correlated count
    // yields dense positions preserving the original order ([1,3,4] -> [1,2,3]).
    for (const crawlId of crawlIds) {
      await tx.execute({
        sql: `UPDATE crawl_visits
              SET stop_order = (
                SELECT COUNT(*) FROM crawl_visits cv2
                WHERE cv2.crawl_id = crawl_visits.crawl_id
                  AND cv2.stop_order <= crawl_visits.stop_order
              )
              WHERE crawl_id = ?`,
        args: [crawlId],
      });
    }

    await tx.execute({ sql: "DELETE FROM visits WHERE id = ?", args: [id] });

    // Upward sweep: if the café just lost its last visit, garbage-collect it
    // and its photos (their storage keys ride along in photoKeys for the
    // caller to purge). Runs after the visit row is gone so the count is exact.
    if (cafeId != null) {
      photoKeys.push(...(await gcCafeIfOrphaned(tx, cafeId)));
    }

    await tx.commit();
    return { photoKeys };
  } finally {
    tx.close();
  }
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
