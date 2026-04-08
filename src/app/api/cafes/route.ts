import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Cafe, CafeWithStats } from "@/types";

export async function GET() {
  const db = getDb();

  const cafes = db
    .prepare(
      `SELECT c.*,
              AVG(v.rating_overall) as avg_rating,
              COUNT(v.id) as visit_count
       FROM cafes c
       LEFT JOIN visits v ON v.cafe_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all() as CafeWithStats[];

  return NextResponse.json({ data: cafes });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { name, city, country, latitude, longitude, website, created_by } =
    body;

  if (!name || !city || !country || latitude == null || longitude == null || !created_by) {
    return NextResponse.json(
      { error: "name, city, country, latitude, longitude, and created_by are required" },
      { status: 400 }
    );
  }

  const result = db
    .prepare(
      `INSERT INTO cafes (name, city, country, latitude, longitude, website, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, city, country, latitude, longitude, website ?? null, created_by);

  const cafe = db
    .prepare("SELECT * FROM cafes WHERE id = ?")
    .get(result.lastInsertRowid) as Cafe;

  return NextResponse.json({ data: cafe }, { status: 201 });
}
