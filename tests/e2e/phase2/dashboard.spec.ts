import { test, expect } from "../../helpers/fixtures";

// Friend2's seed data is untouched by every other spec (mutations run as the
// default Baiwei session), so personal stats can be asserted with EXACT
// equality: 2 visits (.jpg coffee 广州 + %Arabica 深业上城店 深圳, both
// Espresso, both rated 4), 2 distinct beans (Brazil Cerrado + Mandheling),
// 2 cafés, top origins Brazil & Indonesia (avg 4 each).
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

test.describe("phase2 dashboard — Friend2 personal stats", () => {
  // The dashboard scopes stats to the SESSION user (the user-select dropdown
  // is gone), so these specs run with Friend2's saved session.
  test.use({ storageState: "playwright/.auth/user2.json" });

  test("shows the session user and their exact personal stats", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("dashboard-user")).toHaveText("Friend2");

    // Personal stats load via a client-side fetch of /api/stats — the
    // web-first toHaveText assertions wait for that round trip.
    await expect(page.getByTestId("stat-my-beans")).toHaveText("2");
    await expect(page.getByTestId("stat-my-cafes")).toHaveText("2");
    await expect(page.getByTestId("stat-my-visits")).toHaveText("2");
  });

  test("top origins list Brazil and Indonesia", async ({ page }) => {
    await page.goto("/");

    const topOrigins = page.getByTestId("top-origins");
    await expect(topOrigins).toBeVisible();
    await expect(topOrigins).toContainText("Brazil");
    await expect(topOrigins).toContainText("Indonesia");
  });

  test("brew breakdown shows bilingual Espresso label", async ({ page }) => {
    await page.goto("/");

    const breakdown = page.getByTestId("brew-breakdown");
    await expect(breakdown).toBeVisible();
    await expect(breakdown).toContainText("意式浓缩 Espresso");
  });
});

test.describe("phase2 dashboard — /api/stats (session user)", () => {
  test("GET /api/stats takes no param and returns the session user's stats", async ({
    request,
  }) => {
    // Default request fixture carries Baiwei's session cookie. Baiwei's
    // counts drift as other specs create visits, so only the shape is exact.
    const response = await request.get("/api/stats");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as StatsBody;
    expect(typeof body.data?.total_visits).toBe("number");
  });
});

test.describe("phase2 dashboard — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GET /api/stats returns 401 without a session", async ({ request }) => {
    const response = await request.get("/api/stats");
    expect(response.status()).toBe(401);
    const body = (await response.json()) as StatsBody;
    expect(body.error).toBe("未登录");
  });
});
