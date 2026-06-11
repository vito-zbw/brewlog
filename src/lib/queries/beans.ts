import { db } from "@/lib/db";
import type { Bean, BeanWithVisits, NewBeanInput } from "@/types";
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
            processing_method, roast_level, tasting_notes_tags, tasting_notes_freetext, created_by)
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
      input.created_by,
    ],
  });
  const bean = await getBean(insertedId(rs));
  if (!bean) throw new Error("failed to load created bean");
  return bean;
}
