import { db } from "@/lib/db";
import type { Bean, UserExport, VisitWithDetails } from "@/types";
import { mapRows } from "./util";
import { getVisitsWithBeans } from "./visits";
import { getUserById } from "./users";

/**
 * A user's own visits + beans for self-service export. Reuses the existing
 * read queries (no new tables). One-shot, non-paginated — a single download,
 * not an interactive feed (the sanctioned exception to the keyset rule).
 * `exportedAt` is stamped by the caller (route) to keep this clock-free.
 */
export async function getUserExport(
  userId: number
): Promise<Pick<UserExport, "user" | "visits" | "beans">> {
  const user = await getUserById(userId);
  const visits = await getVisitsWithBeans({ userId });
  const beans = mapRows<Bean>(
    await db.execute({
      sql: "SELECT * FROM beans WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    })
  );
  return {
    user: { id: userId, name: user?.name ?? "" },
    visits,
    beans,
  };
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Quote when the cell contains a comma, quote, or newline; double inner quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flattens visits to a CSV table (one row per visit; beans joined by "; "). */
export function visitsToCsv(visits: VisitWithDetails[]): string {
  const header = [
    "visit_date",
    "cafe_name",
    "cafe_city",
    "brew_method",
    "rating_overall",
    "rating_bean_quality",
    "rating_barista_skill",
    "rating_ambiance",
    "beans",
    "notes",
  ];
  const rows = visits.map((v) =>
    [
      v.visit_date,
      v.cafe_name,
      v.cafe_city,
      v.brew_method,
      v.rating_overall,
      v.rating_bean_quality,
      v.rating_barista_skill,
      v.rating_ambiance,
      v.beans.map((b) => b.name).join("; "),
      v.notes ?? "",
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}
