import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Bean } from "@/types";

export async function GET(request: NextRequest) {
  const db = getDb();
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const processing = searchParams.get("processing");
  const roastLevel = searchParams.get("roast_level");
  const tag = searchParams.get("tag");

  let query = "SELECT * FROM beans WHERE 1=1";
  const params: string[] = [];

  if (search) {
    query += " AND (name LIKE ? OR origin_country LIKE ? OR roaster LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (processing) {
    query += " AND processing_method = ?";
    params.push(processing);
  }

  if (roastLevel) {
    query += " AND roast_level = ?";
    params.push(roastLevel);
  }

  if (tag) {
    query += " AND tasting_notes_tags LIKE ?";
    params.push(`%${tag}%`);
  }

  query += " ORDER BY created_at DESC";

  const beans = db.prepare(query).all(...params) as Bean[];
  return NextResponse.json({ data: beans });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const {
    name,
    origin_country,
    origin_region,
    farm,
    roaster,
    processing_method,
    roast_level,
    tasting_notes_tags,
    tasting_notes_freetext,
    created_by,
  } = body;

  if (!name || !origin_country || !created_by) {
    return NextResponse.json(
      { error: "name, origin_country, and created_by are required" },
      { status: 400 }
    );
  }

  const result = db
    .prepare(
      `INSERT INTO beans (name, origin_country, origin_region, farm, roaster, processing_method, roast_level, tasting_notes_tags, tasting_notes_freetext, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      origin_country,
      origin_region ?? null,
      farm ?? null,
      roaster ?? null,
      processing_method ?? "unknown",
      roast_level ?? "medium",
      tasting_notes_tags ?? null,
      tasting_notes_freetext ?? null,
      created_by
    );

  const bean = db
    .prepare("SELECT * FROM beans WHERE id = ?")
    .get(result.lastInsertRowid) as Bean;

  return NextResponse.json({ data: bean }, { status: 201 });
}
