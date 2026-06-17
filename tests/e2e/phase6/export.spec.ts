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
