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
  sql += " ORDER BY created_at DESC";

  return mapRows<Bean>(await db.execute({ sql, args }));
}

export async function getBean(id: number): Promise<Bean | null> {
  return firstRow<Bean>(
    await db.execute({ sql: "SELECT * FROM beans WHERE id = ?", args: [id] })
  );
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
