import { db } from "@/lib/db";
import type {
  Bean,
  BeanWithVisits,
  NewBeanInput,
  UpdateBeanInput,
} from "@/types";
import { mapRows, firstRow, insertedId } from "./util";
import { getVisitsWithBeans } from "./visits";

export interface BeanFilters {
  search?: string;
  processing?: string;
  roastLevel?: string;
  tag?: string;
  originCountry?: string;
  roaster?: string;
}

export async function listBeans(filters: BeanFilters = {}): Promise<Bean[]> {
  let sql = "SELECT * FROM beans WHERE 1=1";
  const args: string[] = [];

  if (filters.search) {
    sql += " AND (name LIKE ? OR origin_country LIKE ? OR roaster LIKE ?)";
    const term = `%${filters.search}%`;
    args.push(term, term, term);
  }
  if (filters.processing) {
    sql += " AND processing_method = ?";
    args.push(filters.processing);
  }
  if (filters.roastLevel) {
    sql += " AND roast_level = ?";
    args.push(filters.roastLevel);
  }
  if (filters.tag) {
    sql += " AND tasting_notes_tags LIKE ?";
    args.push(`%${filters.tag}%`);
  }
  // Discrete origin/roaster controls use exact equality (vs. the free-text
  // `search` box's LIKE). Both apply together (AND) when set. Backed by
  // idx_beans_origin / idx_beans_roaster.
  if (filters.originCountry) {
    sql += " AND origin_country = ?";
    args.push(filters.originCountry);
  }
  if (filters.roaster) {
    sql += " AND roaster = ?";
    args.push(filters.roaster);
  }
  sql += " ORDER BY created_at DESC";

  return mapRows<Bean>(await db.execute({ sql, args }));
}

/**
 * Beans similar to the given one, by weighted attribute overlap. No similarity
 * table — scored in JS over the (small) catalog: same origin country (+3), same
 * roaster (+3), same roast level (+1), same processing method (+1), and each
 * shared tasting tag (+1, capped at +3). Returns the top `limit` with score > 0,
 * most-similar first. Candidates are pre-ordered created_at DESC and Array.sort
 * is stable, so recency breaks score ties.
 */
export async function getSimilarBeans(
  beanId: number,
  limit = 4
): Promise<Bean[]> {
  const target = await getBean(beanId);
  if (!target) return [];
  const candidates = mapRows<Bean>(
    await db.execute({
      sql: "SELECT * FROM beans WHERE id <> ? ORDER BY created_at DESC",
      args: [beanId],
    })
  );
  const targetTags = tagSet(target.tasting_notes_tags);
  return candidates
    .map((bean) => ({ bean, score: similarityScore(target, bean, targetTags) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.bean);
}

function tagSet(tags: string | null): Set<string> {
  return new Set(
    (tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  );
}

function similarityScore(
  target: Bean,
  other: Bean,
  targetTags: Set<string>
): number {
  let score = 0;
  if (other.origin_country === target.origin_country) score += 3;
  if (target.roaster && other.roaster === target.roaster) score += 3;
  if (other.roast_level === target.roast_level) score += 1;
  if (other.processing_method === target.processing_method) score += 1;
  let shared = 0;
  for (const tag of tagSet(other.tasting_notes_tags)) {
    if (targetTags.has(tag)) shared++;
  }
  return score + Math.min(shared, 3);
}

export async function getBean(id: number): Promise<Bean | null> {
  return firstRow<Bean>(
    await db.execute({ sql: "SELECT * FROM beans WHERE id = ?", args: [id] })
  );
}

/**
 * Of the given bean ids, the ones that actually exist. Used as a referential
 * pre-check before writing visit_beans rows: libsql does not enforce foreign
 * keys, so a visit POST/PUT carrying a non-existent bean id would otherwise
 * create orphan join rows. Mirror of crawls' filterOwnVisitIds pre-check.
 */
export async function existingBeanIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rs = await db.execute({
    sql: `SELECT id FROM beans WHERE id IN (${placeholders})`,
    args: ids,
  });
  return mapRows<{ id: number }>(rs).map((r) => r.id);
}

export async function getBeanWithVisits(
  id: number
): Promise<BeanWithVisits | null> {
  const bean = await getBean(id);
  if (!bean) return null;
  const visits = await getVisitsWithBeans({ beanId: id });
  return { ...bean, visits };
}

export async function createBean(input: NewBeanInput): Promise<Bean> {
  const rs = await db.execute({
    sql: `INSERT INTO beans (name, origin_country, origin_region, farm, roaster,
            processing_method, roast_level, tasting_notes_tags, tasting_notes_freetext, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.name,
      input.origin_country,
      input.origin_region ?? null,
      input.farm ?? null,
      input.roaster ?? null,
      input.processing_method ?? "Other",
      input.roast_level ?? "Medium",
      input.tasting_notes_tags ?? null,
      input.tasting_notes_freetext ?? null,
      input.user_id,
    ],
  });
  const bean = await getBean(insertedId(rs));
  if (!bean) throw new Error("failed to load created bean");
  return bean;
}

/**
 * Updates an existing bean's editable columns. Leaves user_id untouched —
 * ownership never moves (mirror of updateVisit).
 */
export async function updateBean(
  id: number,
  input: UpdateBeanInput
): Promise<void> {
  await db.execute({
    sql: `UPDATE beans SET name = ?, origin_country = ?, origin_region = ?,
            farm = ?, roaster = ?, processing_method = ?, roast_level = ?,
            tasting_notes_tags = ?, tasting_notes_freetext = ?
          WHERE id = ?`,
    args: [
      input.name,
      input.origin_country,
      input.origin_region ?? null,
      input.farm ?? null,
      input.roaster ?? null,
      input.processing_method ?? "Other",
      input.roast_level ?? "Medium",
      input.tasting_notes_tags ?? null,
      input.tasting_notes_freetext ?? null,
      id,
    ],
  });
}

/** Thrown by deleteBean when a visit still references the bean (maps to 409). */
export class BeanInUseError extends Error {
  constructor(public readonly count: number) {
    super(`bean is referenced by ${count} visit(s)`);
    this.name = "BeanInUseError";
  }
}

/**
 * Hard-deletes a bean and its photo rows, returning the photo storage keys so
 * the caller can purge the underlying objects (storage I/O can't live inside
 * the DB transaction).
 *
 * The "block if any visit references it" rule is enforced INSIDE the same
 * transaction as the delete: counting visit_beans here (rather than in a
 * separate pre-check) closes the TOCTOU window where a concurrent visit could
 * attach the bean between check and delete, so a delete can never strand a
 * visit. Throws BeanInUseError (rolling back) when the bean is still in use.
 *
 * libsql does not enforce foreign keys, so dependents are handled explicitly
 * (same reasoning as deleteVisit).
 */
export async function deleteBean(
  id: number
): Promise<{ photoKeys: string[] }> {
  const tx = await db.transaction("write");
  try {
    const inUse =
      firstRow<{ n: number }>(
        await tx.execute({
          sql: "SELECT COUNT(*) AS n FROM visit_beans WHERE bean_id = ?",
          args: [id],
        })
      )?.n ?? 0;
    if (inUse > 0) {
      throw new BeanInUseError(inUse);
    }

    const photoKeys = mapRows<{ storage_key: string }>(
      await tx.execute({
        sql: "SELECT storage_key FROM photos WHERE entity_type = 'bean' AND entity_id = ?",
        args: [id],
      })
    ).map((r) => r.storage_key);

    await tx.execute({
      sql: "DELETE FROM photos WHERE entity_type = 'bean' AND entity_id = ?",
      args: [id],
    });
    await tx.execute({ sql: "DELETE FROM beans WHERE id = ?", args: [id] });
    await tx.commit();
    return { photoKeys };
  } finally {
    tx.close();
  }
}
