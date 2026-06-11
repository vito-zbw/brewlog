import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

// /beans is a client page that fetches with a 300ms debounce — every
// assertion below is web-first (auto-retrying), never a manual wait.

test.describe("咖啡豆库 /beans", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/beans");
  });

  test("lists at least the seeded beans", async ({ page }) => {
    const cards = page.getByTestId("bean-card");
    // Other specs may insert beans before this one runs — assert >=.
    await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(
      SEED.beanCount
    );
  });

  test("search narrows the list to the matching bean", async ({ page }) => {
    await page.getByTestId("bean-search").fill(SEED.knownBeanSearch);

    const cards = page.getByTestId("bean-card");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(SEED.knownBeanName);
  });

  test("processing filter shows only 湿刨 Wet-hulled beans, clearing restores all", async ({
    page,
  }) => {
    const cards = page.getByTestId("bean-card");

    await page
      .getByTestId("bean-filter-processing")
      .selectOption("Wet-hulled");

    // The seeded Wet-hulled bean is present...
    await expect(
      cards.filter({ hasText: "苏门答腊曼特宁" })
    ).toHaveCount(1);
    // ...and no card without the 湿刨 chip remains visible.
    await expect(
      cards.filter({ hasNotText: "湿刨 Wet-hulled" })
    ).toHaveCount(0);

    // Clearing the filter restores the full catalog.
    await page.getByTestId("bean-filter-processing").selectOption("");
    await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(
      SEED.beanCount
    );
  });

  test("cards render bilingual processing chips", async ({ page }) => {
    const washedCards = page
      .getByTestId("bean-card")
      .filter({ hasText: "水洗 Washed" });
    await expect(washedCards.first()).toBeVisible();
  });

  test("clicking a card opens the bean detail page with visits", async ({
    page,
  }) => {
    await page
      .getByTestId("bean-card")
      .filter({ hasText: "耶加雪菲" })
      .click();

    await expect(page).toHaveURL(/\/beans\/\d+$/);
    await expect(
      page.getByRole("heading", { name: SEED.knownBeanName })
    ).toBeVisible();

    // Bilingual attribute labels and values.
    await expect(page.getByText("处理法", { exact: true })).toBeVisible();
    await expect(page.getByText("烘焙度", { exact: true })).toBeVisible();
    await expect(page.getByText("水洗 Washed", { exact: true })).toBeVisible();
    await expect(page.getByText("浅烘 Light", { exact: true })).toBeVisible();

    // Visits section: heading count is >= 1 and the known seeded visit
    // (at .jpg coffee) is listed.
    await expect(
      page.getByRole("heading", { name: /包含此豆的探店记录（[1-9]\d*）/ })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: SEED.knownCafe })
    ).toBeVisible();
  });
});
