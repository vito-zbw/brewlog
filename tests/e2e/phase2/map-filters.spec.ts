import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

// Subset of CafeWithStats that the filter assertions need. brew_methods is a
// CSV of distinct canonical English brew methods; max_rating is the highest
// overall visit rating (null when the café has no visits).
interface CafeRow {
  city: string;
  max_rating: number | null;
  brew_methods: string | null;
}

async function fetchCafes(request: APIRequestContext): Promise<CafeRow[]> {
  const res = await request.get("/api/cafes");
  expect(res.ok()).toBe(true);
  const json = (await res.json()) as { data: CafeRow[] };
  return json.data;
}

// Markers cluster at the default zoom (and off-viewport ones render as
// attached-but-hidden), so counting marker DOM nodes is unreliable. The map
// surfaces the rendered (filtered) café count as a deterministic element —
// assert on that instead.
async function markerCount(page: Page): Promise<number> {
  const text = await page.getByTestId("cafe-marker-count").textContent();
  return parseInt(text ?? "0", 10);
}

test.describe("map filters (/cafes)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cafes");
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  test("baseline: rendered count is at least the seed total", async ({
    page,
  }) => {
    // Phase 1 specs added a 广州 café, so the count is >= the seed total.
    await expect.poll(() => markerCount(page)).toBeGreaterThanOrEqual(
      SEED.cafeCount
    );
  });

  test("city filter narrows to 深圳 and resets back to all", async ({
    page,
  }) => {
    await page.getByTestId("map-filter-city").selectOption("深圳");
    // Seed has exactly 2 深圳 cafés and no spec creates more.
    await expect.poll(() => markerCount(page)).toBe(2);

    await page.getByTestId("map-filter-city").selectOption("");
    await expect.poll(() => markerCount(page)).toBeGreaterThanOrEqual(
      SEED.cafeCount
    );
  });

  test("rating filter shows exactly the cafés with max_rating >= 4", async ({
    page,
    request,
  }) => {
    const cafes = await fetchCafes(request);
    const baseline = cafes.length;
    await expect.poll(() => markerCount(page)).toBe(baseline);

    const expected = cafes.filter(
      (c) => c.max_rating !== null && c.max_rating >= 4
    ).length;
    // The seed's unvisited café ("Something For Café") is always excluded,
    // so the filtered count must strictly decrease.
    expect(expected).toBeLessThan(baseline);

    await page.getByTestId("map-filter-rating").selectOption("4");
    await expect.poll(() => markerCount(page)).toBe(expected);
  });

  test("combined city + rating filter leaves only %Arabica in 深圳", async ({
    page,
  }) => {
    await page.getByTestId("map-filter-city").selectOption("深圳");
    await page.getByTestId("map-filter-rating").selectOption("4");
    // Of the two 深圳 cafés, only "%Arabica 深业上城店" has max_rating 4;
    // "Something For Café" has no visits and is filtered out.
    await expect.poll(() => markerCount(page)).toBe(1);
  });

  test("brew filter matches cafés whose brew_methods include Espresso", async ({
    page,
    request,
  }) => {
    const cafes = await fetchCafes(request);
    const expected = cafes.filter(
      (c) =>
        c.brew_methods !== null && c.brew_methods.split(",").includes("Espresso")
    ).length;
    // Friend2's seed visits guarantee Espresso at ".jpg coffee" and
    // "%Arabica 深业上城店"; earlier specs may have added more.
    expect(expected).toBeGreaterThanOrEqual(2);

    await page.getByTestId("map-filter-brew").selectOption("Espresso");
    await expect.poll(() => markerCount(page)).toBe(expected);
  });
});
