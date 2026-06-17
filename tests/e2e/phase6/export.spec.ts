import { test, expect } from "../../helpers/fixtures";

// Phase 6 data export: a user downloads their OWN visits + beans as JSON/CSV.
// Default session = Baiwei (user1).

interface ExportPayload {
  exportedAt: string;
  user: { id: number; name: string };
  visits: { user_id: number }[];
  beans: { user_id: number }[];
}

test.describe("data export", () => {
  test("own JSON export returns the user's visits + beans as a download", async ({
    request,
  }) => {
    const res = await request.get("/api/users/1/export?format=json");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    expect(res.headers()["content-disposition"]).toContain("attachment");
    expect(res.headers()["content-disposition"]).toContain(".json");

    const body = (await res.json()) as ExportPayload;
    expect(body.user.id).toBe(1);
    expect(typeof body.exportedAt).toBe("string");
    expect(Array.isArray(body.visits)).toBe(true);
    expect(Array.isArray(body.beans)).toBe(true);
    expect(body.visits.length).toBeGreaterThanOrEqual(1);
    expect(body.beans.length).toBeGreaterThanOrEqual(1);
    // Strictly the caller's own data.
    expect(body.visits.every((v) => v.user_id === 1)).toBe(true);
    expect(body.beans.every((b) => b.user_id === 1)).toBe(true);
  });

  test("own CSV export returns a flat visits table", async ({ request }) => {
    const res = await request.get("/api/users/1/export?format=csv");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toContain(".csv");

    const body = await res.text();
    expect(body).toContain("visit_date,cafe_name,cafe_city,brew_method");
  });

  test("CSV export neutralizes formula injection in free text", async ({
    request,
  }) => {
    const create = await request.post("/api/visits", {
      data: {
        cafe_id: 1,
        visit_date: "2026-06-16",
        brew_method: "V60",
        rating_overall: 5,
        rating_bean_quality: 5,
        rating_barista_skill: 5,
        rating_ambiance: 5,
        notes: "=SUM(A1:A9)",
      },
    });
    expect(create.status()).toBe(201);
    const visitId = ((await create.json()) as { data: { id: number } }).data.id;

    const csv = await (
      await request.get("/api/users/1/export?format=csv")
    ).text();
    // The dangerous note is defused with a leading single quote, never written
    // as a bare leading "=" that a spreadsheet would evaluate.
    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).not.toMatch(/(^|,)=SUM\(A1:A9\)/m);

    await request.delete(`/api/visits/${visitId}`);
  });

  test("exporting another user's data is forbidden (403)", async ({
    request,
  }) => {
    const res = await request.get("/api/users/3/export?format=json");
    expect(res.status()).toBe(403);
  });

  test("settings page links to JSON and CSV export", async ({ page }) => {
    await page.goto("/settings");
    const section = page.getByTestId("data-export");
    await expect(section).toBeVisible();
    await expect(page.getByTestId("export-json")).toHaveAttribute(
      "href",
      "/api/users/1/export?format=json"
    );
    await expect(page.getByTestId("export-csv")).toHaveAttribute(
      "href",
      "/api/users/1/export?format=csv"
    );
  });

  test.describe("logged out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("export requires login (401)", async ({ request }) => {
      const res = await request.get("/api/users/1/export?format=json");
      expect(res.status()).toBe(401);
    });
  });
});
