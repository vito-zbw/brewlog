import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

interface ApiVisit {
  id: number;
  visit_date: string;
  cafe_name: string;
  visited_by: string;
}

interface ApiCafe {
  id: number;
  name: string;
}

test.describe("探店记录 /visits", () => {
  test("shows at least the seeded number of visit cards", async ({ page }) => {
    await page.goto("/visits");
    await expect(
      page.getByRole("heading", { level: 1, name: "探店记录" })
    ).toBeVisible();

    const cards = page.getByTestId("visit-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(SEED.visitCount);
  });

  test("orders visits newest-first and renders the newest first on the page", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/visits");
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { data: ApiVisit[] };
    const visits = body.data;
    expect(visits.length).toBeGreaterThanOrEqual(3);

    // ISO yyyy-mm-dd dates compare correctly as strings.
    expect(visits[0].visit_date >= visits[1].visit_date).toBe(true);
    expect(visits[1].visit_date >= visits[2].visit_date).toBe(true);

    await page.goto("/visits");
    await expect(page.getByTestId("visit-card").first()).toContainText(
      visits[0].cafe_name
    );
  });

  test("café filter shows only visits to the selected café", async ({
    page,
    request,
  }) => {
    const res = await request.get("/api/cafes");
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { data: ApiCafe[] };
    const knownCafe = body.data.find((c) => c.name === SEED.knownCafe);
    expect(knownCafe).toBeDefined();
    const cafeId = String(knownCafe!.id);

    await page.goto("/visits");
    await page.getByTestId("visit-filter-cafe").selectOption(cafeId);

    const cards = page.getByTestId("visit-card");
    await expect(cards.first()).toContainText(SEED.knownCafe);
    await expect(cards.filter({ hasNotText: SEED.knownCafe })).toHaveCount(0);
  });

  test("person filter shows only Friend2's visits", async ({ page }) => {
    await page.goto("/visits");
    await page.getByTestId("visit-filter-person").selectOption("Friend2");

    const cards = page.getByTestId("visit-card");
    await expect(cards.first()).toContainText("Friend2 记录");
    await expect(cards.filter({ hasNotText: "Friend2 记录" })).toHaveCount(0);
  });

  test("renders bilingual brew method chips on visit cards", async ({
    page,
  }) => {
    await page.goto("/visits");

    const cards = page.getByTestId("visit-card");
    await expect(
      cards.filter({ hasText: "意式浓缩 Espresso" }).first()
    ).toBeVisible();
    await expect(
      cards.filter({ hasText: "冷萃 Cold Brew" }).first()
    ).toBeVisible();
  });
});
