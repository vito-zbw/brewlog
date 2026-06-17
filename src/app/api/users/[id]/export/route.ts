import { NextRequest, NextResponse } from "next/server";
import { getUserExport, visitsToCsv } from "@/lib/queries";
import { requireUserId, UnauthorizedError } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// The one non-public read: a user can export only their OWN data. Login-gated
// and self-scoped (Number(id) === session user). Returns a downloadable file
// (JSON bundle by default, or a flat visits CSV via ?format=csv).
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    if (Number(id) !== userId) {
      // Private read → 403 (not 404), never leak whether the id exists.
      return NextResponse.json({ error: "无权导出他人数据" }, { status: 403 });
    }

    const data = await getUserExport(userId);
    const stamp = new Date().toISOString().slice(0, 10);
    const format = request.nextUrl.searchParams.get("format") ?? "json";

    if (format === "csv") {
      // Lead with a UTF-8 BOM so Excel reads the Chinese columns correctly.
      const csv = "﻿" + visitsToCsv(data.visits);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="brewlog-export-${stamp}.csv"`,
        },
      });
    }

    const json = JSON.stringify(
      { exportedAt: new Date().toISOString(), ...data },
      null,
      2
    );
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="brewlog-export-${stamp}.json"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    console.error("GET /api/users/[id]/export failed:", err);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
