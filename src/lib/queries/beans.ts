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

/** Number of visits that reference this bean (drives the delete-in-use guard). */
export async function countBeanVisits(id: number): Promise<number> {
  const row = firstRow<{ n: number }>(
    await db.execute({
      sql: "SELECT COUNT(*) AS n FROM visit_beans WHERE bean_id = ?",
      args: [id],
    })
  );
  return row?.n ?? 0;
}

/**
 * Hard-deletes a bean and its photo rows, returning the photo storage keys so
 * the caller can purge the underlying objects (storage I/O can't live inside
 * the DB transaction). visit_beans rows are removed defensively — callers must
 * already have verified the bean is unused (see countBeanVisits), so in normal
 * operation there are none. libsql does not enforce foreign keys, so every
 * dependent is removed explicitly (same reasoning as deleteVisit).
 */
export async function deleteBean(
  id: number
): Promise<{ photoKeys: string[] }> {
  const tx = await db.transaction("write");
  try {
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
    await tx.execute({
      sql: "DELETE FROM visit_beans WHERE bean_id = ?",
      args: [id],
    });
    await tx.execute({ sql: "DELETE FROM beans WHERE id = ?", args: [id] });
    await tx.commit();
    return { photoKeys };
  } finally {
    tx.close();
  }
}
