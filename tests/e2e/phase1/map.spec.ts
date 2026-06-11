import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

// Cafés outside the default Guangzhou viewport (Shenzhen, Kyoto) render as
// empty `d="M0 0"` paths — attached but hidden — so marker interaction must
// filter to visible ones. Markers can also overlap at city zoom, so we click
// the first visible one with force and keep popup assertions café-generic.
async function openFirstMarkerPopup(page: Page): Promise<Locator> {
  const visibleMarkers = page
    .locator("path.leaflet-interactive")
    .filter({ visible: true });
  await expect(visibleMarkers.first()).toBeVisible();
  await visibleMarkers.first().click({ force: true });
  const popup = page.getByTestId("cafe-popup");
  await expect(popup).toBeVisible();
  return popup;
}

test.describe("café map (/cafes)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cafes");
  });

  test("renders the map wrapper and leaflet container", async ({ page }) => {
    await expect(page.getByTestId("cafe-map")).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  test("shows at least one marker per seeded café", async ({ page }) => {
    const markers = page.locator("path.leaflet-interactive");
    // Off-viewport cafés are attached but hidden, so poll the attached count
    // instead of asserting visibility; other specs may have added cafés, so
    // never assert an exact count.
    await expect
      .poll(() => markers.count())
      .toBeGreaterThanOrEqual(SEED.cafeCount);
    // The Guangzhou cluster must actually be visible at the default view.
    await expect(markers.filter({ visible: true }).first()).toBeVisible();
  });

  test("legend is visible and explains the unvisited (gray) state", async ({
    page,
  }) => {
    const legend = page.getByTestId("map-legend");
    await expect(legend).toBeVisible();
    await expect(legend).toContainText("暂无探店");
  });

  test("clicking a marker opens a popup with rating info and a visits link", async ({
    page,
  }) => {
    const popup = await openFirstMarkerPopup(page);
    // Visited cafés show "最高评分 N/5"; unvisited ones show "还没有探店记录".
    await expect(popup).toContainText(/最高评分|还没有探店记录/);
    const visitsLink = popup.getByRole("link", { name: /查看咖啡馆详情/ });
    await expect(visitsLink).toBeVisible();
    await expect(visitsLink).toHaveAttribute("href", /^\/cafes\/\d+/);
  });

  test("popup link navigates to that café's visit history", async ({
    page,
  }) => {
    const popup = await openFirstMarkerPopup(page);
    await popup.getByRole("link", { name: /查看咖啡馆详情/ }).click();
    await expect(page).toHaveURL(/\/cafes\/\d+/);
    await expect(page.getByTestId("cafe-detail")).toBeVisible();
  });
});
