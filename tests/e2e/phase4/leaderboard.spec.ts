import { test, expect } from "../../helpers/fixtures";

// Phase 4 community leaderboard (/leaderboard) — public, no auth required.
// Two cards: 产地探索榜 (leaderboard-origins, "{n} 个产地") and 探店达人榜
// (leaderboard-cafes, "{n} 家咖啡馆"), rows ordered by value DESC then name.
//
// Seed ranking facts: all three users have visits, so each card has exactly
// 3 rows (no spec creates users). Baiwei leads both boards — 4 distinct seed
// origins (Ethiopia/Colombia/Kenya/China) and 4 distinct cafés, and phase1's
// log-visit spec only ADDS to Baiwei. Friend2 is untouched by other specs:
// exactly 2 origins (Brazil + Indonesia), safe for an exact-value assertion.
test.describe("phase4 leaderboard — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders both cards with one row per seed user", async ({ page }) => {
    await page.goto("/leaderboard");

    const origins = page.getByTestId("leaderboard-origins");
    const cafes = page.getByTestId("leaderboard-cafes");
    await expect(origins).toBeVisible();
    await expect(cafes).toBeVisible();

    await expect(origins.getByTestId("leaderboard-row")).toHaveCount(3);
    await expect(cafes.getByTestId("leaderboard-row")).toHaveCount(3);
  });
});

test.describe("phase4 leaderboard — rankings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
  });

  test("Baiwei tops the origins board with a 个产地 count", async ({
    page,
  }) => {
    const firstRow = page
      .getByTestId("leaderboard-origins")
      .getByTestId("leaderboard-row")
      .first();

    await expect(firstRow).toContainText("Baiwei");
    await expect(firstRow).toContainText(/\d+ 个产地/);
  });

  test("Baiwei tops the cafés board with a 家咖啡馆 count", async ({
    page,
  }) => {
    const firstRow = page
      .getByTestId("leaderboard-cafes")
      .getByTestId("leaderboard-row")
      .first();

    await expect(firstRow).toContainText("Baiwei");
    await expect(firstRow).toContainText(/\d+ 家咖啡馆/);
  });

  test("Friend2 has exactly 2 distinct origins", async ({ page }) => {
    const friend2Row = page
      .getByTestId("leaderboard-origins")
      .getByTestId("leaderboard-row")
      .filter({ hasText: "Friend2" });

    await expect(friend2Row).toHaveCount(1);
    await expect(friend2Row).toContainText("2 个产地");
  });

  test("row user link navigates to that user's profile", async ({ page }) => {
    const friend2Row = page
      .getByTestId("leaderboard-origins")
      .getByTestId("leaderboard-row")
      .filter({ hasText: "Friend2" });

    await friend2Row.getByRole("link", { name: "Friend2" }).click();

    await expect(page).toHaveURL(/\/users\/3$/);
    await expect(page.getByTestId("profile-header")).toContainText("Friend2");
  });
});
