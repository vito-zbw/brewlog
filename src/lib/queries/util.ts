import type { ResultSet } from "@libsql/client";

// libsql rows carry both numeric indices and named properties and do not
// spread/serialize like plain objects — always convert at the query boundary.
export function mapRows<T>(rs: ResultSet): T[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of rs.columns) {
      obj[col] = row[col];
    }
    return obj as T;
  });
}

export function firstRow<T>(rs: ResultSet): T | null {
  const rows = mapRows<T>(rs);
  return rows[0] ?? null;
}

export function insertedId(rs: ResultSet): number {
  return Number(rs.lastInsertRowid);
}
