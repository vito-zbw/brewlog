import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";

// Geolocation is mocked to the exact coordinates of ".jpg coffee" (seed café
// in 广州), making it the unambiguous nearest café; "Kurasu Kyoto" (京都) is
// ~2000 km away and therefore always last. Earlier specs in the serial run
// may have added cafés (phase1's log-visit adds one in 广州), so the full
// list size is asserted against GET /api/cafes instead of a seed constant.
test.use({
  geolocation: { latitude: 23.0945, longitude: 113.282 },
  permissions: ["geolocation"],
});

async function fetchCafeCount(request: APIRequestContext): Promise<number> {
  const res = await request.get("/api/cafes");
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { data: unknown[] };
  return body.data.length;
}

async function openNearbyList(page: Page): Promise<Locator> {
  await page.goto("/cafes");
  // The toolbar (filters + nearby button) renders together with the map.
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByTestId("nearby-button").click();
  const list = page.getByTestId("nearby-list");
  await expect(list).toBeVisible();
  return list;
}

test.describe("nearby cafés (geolocation on /cafes)", () => {
  test("nearby button reveals a list with one row per café, nearest first", async ({
    page,
    request,
  }) => {
    const cafeCount = await fetchCafeCount(request);
    await openNearbyList(page);
    const items = page.getByTestId("nearby-item");
    await expect(items).toHaveCount(cafeCount);
    await expect(items.first()).toContainText(".jpg coffee");
  });

  test("rows are sorted by distance: .jpg coffee first, Kurasu Kyoto last", async ({
    page,
  }) => {
    await openNearbyList(page);
    const items = page.getByTestId("nearby-item");
    await expect(items.first()).toContainText(".jpg coffee");
    // Kyoto is the farthest seed café; every café added by other specs is in
    // 广州, so the last row stays stable across the serial run.
    await expect(items.last()).toContainText("Kurasu Kyoto");
  });

  test("composes with the city filter and restores on reset", async ({
    page,
    request,
  }) => {
    const cafeCount = await fetchCafeCount(request);
    await openNearbyList(page);
    const items = page.getByTestId("nearby-item");

    // Exactly the two seeded 深圳 cafés survive the filter (no spec creates
    // 深圳 cafés, so the exact count is stable). Something For Café (~95 km)
    // sorts ahead of %Arabica (~103 km) from the mocked origin.
    await page.getByTestId("map-filter-city").selectOption("深圳");
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText("Something For Café");
    await expect(items.last()).toContainText("%Arabica 深业上城店");

    await page.getByTestId("map-filter-city").selectOption("");
    await expect(items).toHaveCount(cafeCount);
  });

  test("clicking the button again hides the list", async ({ page }) => {
    await openNearbyList(page);
    const button = page.getByTestId("nearby-button");
    await expect(button).toHaveText("收起列表");
    await button.click();
    await expect(page.getByTestId("nearby-list")).toBeHidden();
    await expect(button).toContainText("附近的咖啡馆");
  });
});
