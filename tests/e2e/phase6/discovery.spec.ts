import { test, expect } from "../../helpers/fixtures";

// Phase 6 richer discovery: discrete origin/roaster filters on /beans, the
// "similar beans" section on a bean detail, and marker clustering on /cafes.
// All discovery is public read; default session (Baiwei) is incidental.

test.describe("richer discovery", () => {
  test("origin filter narrows the bean list to that origin only", async ({
    page,
  }) => {
    await page.goto("/beans");
    const cards = page.getByTestId("bean-card");
    await expect(cards.first()).toBeVisible();

    await page.getByTestId("bean-filter-origin").selectOption("Ethiopia");

    // The seeded Ethiopian bean is present...
    await expect(cards.filter({ hasText: "耶加雪菲" })).toHaveCount(1);
    // ...and every remaining card shows the Ethiopia origin (exact-match filter).
    await expect(cards.filter({ hasNotText: "Ethiopia" })).toHaveCount(0);
    // A known non-Ethiopian bean is gone.
    await expect(cards.filter({ hasText: "Esmeralda Gesha" })).toHaveCount(0);
  });

  test("roaster filter narrows the bean list to that roaster only", async ({
    page,
  }) => {
    await page.goto("/beans");
    const cards = page.getByTestId("bean-card");
    await expect(cards.first()).toBeVisible();

    await page.getByTestId("bean-filter-roaster").selectOption("Torch Coffee Lab");

    await expect(cards.filter({ hasText: "Esmeralda Gesha" })).toHaveCount(1);
    await expect(cards.filter({ hasNotText: "Torch Coffee Lab" })).toHaveCount(0);
  });

  test("origin + roaster combine (AND)", async ({ page }) => {
    await page.goto("/beans");
    const cards = page.getByTestId("bean-card");
    await expect(cards.first()).toBeVisible();

    await page.getByTestId("bean-filter-origin").selectOption("China");
    await page.getByTestId("bean-filter-roaster").selectOption("Seesaw Coffee");

    // Only the Seesaw Chinese bean qualifies (云南日晒).
    await expect(cards.filter({ hasText: "Seesaw 云南日晒" })).toHaveCount(1);
    await expect(cards.filter({ hasNotText: "China" })).toHaveCount(0);
    await expect(cards.filter({ hasNotText: "Seesaw Coffee" })).toHaveCount(0);
  });

  test("bean detail shows a similar-beans section", async ({ page }) => {
    await page.goto("/beans");
    await page
      .getByTestId("bean-card")
      .filter({ hasText: "耶加雪菲" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/beans\/\d+$/);

    const similar = page.getByTestId("similar-beans");
    await expect(similar).toBeVisible();
    await expect(similar.getByTestId("bean-card").first()).toBeVisible();
  });

  test("café map clusters nearby markers at the default zoom", async ({
    page,
  }) => {
    await page.goto("/cafes");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    // The Guangzhou cafés sit close together → at least one cluster bubble.
    await expect(page.locator(".marker-cluster").first()).toBeVisible();
  });
});
