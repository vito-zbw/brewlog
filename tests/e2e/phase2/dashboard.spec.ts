import { test, expect } from "../../helpers/fixtures";

// Friend2's seed data is untouched by every other spec (Phase 1 mutations run
// as "Baiwei"), so personal stats can be asserted with EXACT equality:
// 2 visits (.jpg coffee 广州 + %Arabica 深业上城店 深圳, both Espresso,
// both rated 4), 2 distinct beans (Brazil Cerrado + Mandheling), 2 cafés.
const FRIEND2 = "Friend2";

interface StatsBody {
  data?: {
    total_beans_tried: number;
    total_cafes_visited: number;
    total_visits: number;
    top_origins: { origin_country: string; avg_rating: number; visit_count: number }[];
    brew_breakdown: { brew_method: string; count: number }[];
  };
  error?: string;
}

test.describe("phase2 dashboard — personal stats", () => {
  test("personal stats for Friend2 match seed exactly", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("user-select").selectOption(FRIEND2);

    // Personal stats load via a client-side fetch after selection — the
    // web-first toHaveText assertions wait for that round trip.
    await expect(page.getByTestId("stat-my-beans")).toHaveText("2");
    await expect(page.getByTestId("stat-my-cafes")).toHaveText("2");
    await expect(page.getByTestId("stat-my-visits")).toHaveText("2");
  });

  test("top origins for Friend2 list Brazil and Indonesia", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("user-select").selectOption(FRIEND2);

    const topOrigins = page.getByTestId("top-origins");
    await expect(topOrigins).toBeVisible();
    await expect(topOrigins).toContainText("Brazil");
    await expect(topOrigins).toContainText("Indonesia");
  });

  test("brew breakdown for Friend2 shows bilingual Espresso label", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("user-select").selectOption(FRIEND2);

    const breakdown = page.getByTestId("brew-breakdown");
    await expect(breakdown).toBeVisible();
    await expect(breakdown).toContainText("意式浓缩 Espresso");
  });

  test("user selection persists across reload via localStorage", async ({
    page,
  }) => {
    await page.goto("/");

    const userSelect = page.getByTestId("user-select");
    await userSelect.selectOption(FRIEND2);
    await expect(userSelect).toHaveValue(FRIEND2);

    // Wait for the personal stats fetch so the selection has fully applied
    // before the reload throws the page state away.
    await expect(page.getByTestId("stat-my-visits")).toHaveText("2");

    await page.reload();
    await expect(page.getByTestId("user-select")).toHaveValue(FRIEND2);
  });

  test("GET /api/stats validates the user param", async ({ page }) => {
    const okResponse = await page.request.get(
      `/api/stats?user=${encodeURIComponent(FRIEND2)}`
    );
    expect(okResponse.status()).toBe(200);
    const okBody = (await okResponse.json()) as StatsBody;
    expect(okBody.data?.total_visits).toBe(2);

    const badResponse = await page.request.get("/api/stats?user=Nobody");
    expect(badResponse.status()).toBe(400);
    const badBody = (await badResponse.json()) as StatsBody;
    expect(typeof badBody.error).toBe("string");
    expect(badBody.error?.length).toBeGreaterThan(0);
  });
});
