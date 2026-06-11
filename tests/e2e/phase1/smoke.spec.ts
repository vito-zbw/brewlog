import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

test.describe("smoke", () => {
  test("home page renders heading and numeric stats", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "欢迎来到 BrewLog", level: 1 })
    ).toBeVisible();

    const statIds = ["stat-beans", "stat-cafes", "stat-visits"] as const;
    for (const id of statIds) {
      const stat = page.getByTestId(id);
      await expect(stat).toBeVisible();
      await expect(stat).toHaveText(/^\d+$/);
    }

    // Other specs may have inserted rows before this one runs, so the
    // counts must be at least the seed totals — never exact.
    const minimums: Record<(typeof statIds)[number], number> = {
      "stat-beans": SEED.beanCount,
      "stat-cafes": SEED.cafeCount,
      "stat-visits": SEED.visitCount,
    };
    for (const id of statIds) {
      const value = Number(await page.getByTestId(id).innerText());
      expect(value).toBeGreaterThanOrEqual(minimums[id]);
    }
  });

  test("nav shows Chinese labels and routes to each page", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("nav-beans")).toHaveText("咖啡豆");
    await expect(page.getByTestId("nav-cafes")).toHaveText("咖啡馆");
    await expect(page.getByTestId("nav-visits")).toHaveText("探店记录");
    await expect(page.getByTestId("nav-log")).toHaveText("+ 记录探店");

    await page.getByTestId("nav-beans").click();
    await expect(page).toHaveURL("/beans");
    await expect(
      page.getByRole("heading", { name: "咖啡豆库", level: 1 })
    ).toBeVisible();

    await page.getByTestId("nav-cafes").click();
    await expect(page).toHaveURL("/cafes");
    await expect(page.getByTestId("cafe-map")).toBeVisible();

    await page.getByTestId("nav-visits").click();
    await expect(page).toHaveURL("/visits");
    await expect(
      page.getByRole("heading", { name: "探店记录", level: 1 })
    ).toBeVisible();

    await page.getByTestId("nav-log").click();
    await expect(page).toHaveURL("/log");
    await expect(
      page.getByRole("heading", { name: "记录探店", level: 1 })
    ).toBeVisible();
  });

  test("legacy routes /map and /visits/new return 404", async ({ page }) => {
    const mapResponse = await page.request.get("/map");
    expect(mapResponse.status()).toBe(404);

    const newVisitResponse = await page.request.get("/visits/new");
    expect(newVisitResponse.status()).toBe(404);
  });
});
