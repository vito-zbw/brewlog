import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Bean, VisitWithDetails } from "@/types";

interface VisitRow {
  id: number;
  cafe_id: number;
  visited_by: string;
  visit_date: string;
  brew_method: string;
  rating_overall: number;
  rating_bean_quality: number;
  rating_barista_skill: number;
  rating_ambiance: number;
  notes: string | null;
  created_at: string;
  cafe_name: string;
  cafe_city: string;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const searchParams = request.nextUrl.searchParams;
  const cafeId = searchParams.get("cafe_id");
  const visitedBy = searchParams.get("visited_by");
  const beanId = searchParams.get("bean_id");

  let query = `
    SELECT v.*, c.name as cafe_name, c.city as cafe_city
    FROM visits v
    JOIN cafes c ON c.id = v.cafe_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (cafeId) {
    query += " AND v.cafe_id = ?";
    params.push(Number(cafeId));
  }

  if (visitedBy) {
    query += " AND v.visited_by = ?";
    params.push(visitedBy);
  }

  if (beanId) {
    query += " AND v.id IN (SELECT visit_id FROM visit_beans WHERE bean_id = ?)";
    params.push(Number(beanId));
  }

  query += " ORDER BY v.visit_date DESC, v.created_at DESC";

  const visits = db.prepare(query).all(...params) as VisitRow[];

  const visitsWithBeans: VisitWithDetails[] = visits.map((visit) => {
    const beans = db
      .prepare(
        `SELECT b.* FROM beans b
         JOIN visit_beans vb ON vb.bean_id = b.id
         WHERE vb.visit_id = ?`
      )
      .all(visit.id) as Bean[];

    return { ...visit, beans };
  });

  return NextResponse.json({ data: visitsWithBeans });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const {
    cafe_id,
    visited_by,
    visit_date,
    brew_method,
    rating_overall,
    rating_bean_quality,
    rating_barista_skill,
    rating_ambiance,
    notes,
    bean_ids,
  } = body;

  if (
    !cafe_id ||
    !visited_by ||
    !visit_date ||
    !brew_method ||
    !rating_overall ||
    !rating_bean_quality ||
    !rating_barista_skill ||
    !rating_ambiance
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const insertVisit = db.prepare(
    `INSERT INTO visits (cafe_id, visited_by, visit_date, brew_method, rating_overall, rating_bean_quality, rating_barista_skill, rating_ambiance, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertVisitBean = db.prepare(
    `INSERT INTO visit_beans (visit_id, bean_id) VALUES (?, ?)`
  );

  const transaction = db.transaction(() => {
    const result = insertVisit.run(
      cafe_id,
      visited_by,
      visit_date,
      brew_method,
      rating_overall,
      rating_bean_quality,
      rating_barista_skill,
      rating_ambiance,
      notes ?? null
    );

    const visitId = result.lastInsertRowid;

    if (Array.isArray(bean_ids)) {
      for (const beanId of bean_ids) {
        insertVisitBean.run(visitId, beanId);
      }
    }

    return visitId;
  });

  const visitId = transaction();

  const visit = db
    .prepare(
      `SELECT v.*, c.name as cafe_name, c.city as cafe_city
       FROM visits v JOIN cafes c ON c.id = v.cafe_id
       WHERE v.id = ?`
    )
    .get(visitId) as VisitRow;

  const beans = db
    .prepare(
      `SELECT b.* FROM beans b
       JOIN visit_beans vb ON vb.bean_id = b.id
       WHERE vb.visit_id = ?`
    )
    .all(visitId) as Bean[];

  return NextResponse.json(
    { data: { ...visit, beans } as VisitWithDetails },
    { status: 201 }
  );
}
