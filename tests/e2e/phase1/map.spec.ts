import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

// Markers cluster at the default zoom. Zoom in via the (reliable) zoom-in
// control until past disableClusteringAtZoom (13): every café then renders as an
// individual divIcon marker, still within the city viewport. Then click one to
// open its popup. Robust to however many cafés other specs have added (clicking
// a cluster element directly is flaky — Leaflet's zoom-to-bounds handler doesn't
// always fire from a synthetic click).
async function openFirstMarkerPopup(page: Page): Promise<Locator> {
  const individual = page
    .locator(".leaflet-marker-icon:not(.marker-cluster)")
    .filter({ visible: true });
  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  for (let i = 0; i < 4; i++) {
    if ((await individual.count()) > 0) break;
    await zoomIn.click();
    await individual
      .first()
      .waitFor({ state: "visible", timeout: 2000 })
      .catch(() => {});
  }
  await expect(individual.first()).toBeVisible();
  await individual.first().click();
  const popup = page.getByTestId("cafe-popup");
  await expect(popup).toBeVisible();
  return popup;
}

async function markerCount(page: Page): Promise<number> {
  const text = await page.getByTestId("cafe-marker-count").textContent();
  return parseInt(text ?? "0", 10);
}

test.describe("café map (/cafes)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cafes");
  });

  test("renders the map wrapper and leaflet container", async ({ page }) => {
    await expect(page.getByTestId("cafe-map")).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  test("renders a marker or cluster for every seeded café", async ({ page }) => {
    // Markers cluster, so per-café marker DOM nodes don't exist at default zoom;
    // assert the rendered count element instead. Other specs may add cafés, so
    // never assert an exact count.
    await expect.poll(() => markerCount(page)).toBeGreaterThanOrEqual(
      SEED.cafeCount
    );
    // Something is actually drawn on the map (a cluster bubble or a marker).
    await expect(
      page.locator(".marker-cluster, .leaflet-marker-icon").first()
    ).toBeVisible();
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
