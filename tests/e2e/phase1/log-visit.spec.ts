import { test, expect } from "../../helpers/fixtures";

// Unique-per-run names so we never collide with seed rows or other specs.
// The api-check test depends on the record created by the flow test, so the
// two run as a serial group (they retry together, keeping RUN_ID consistent).
const RUN_ID = Date.now();
const cafeName = `E2E探店馆 ${RUN_ID}`;
const beanName = `E2E试验豆 ${RUN_ID}`;
const notesText = `E2E备注：酸质明亮，体脂感顺滑 ${RUN_ID}`;

interface ApiCafe {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  user_id: number;
}

test.describe("log a visit", () => {
  test.describe.configure({ mode: "serial" });

  test("full inline-creation flow: new café + new bean + ratings → visit appears first in feed", async ({
    page,
  }) => {
    // Mock the geocode proxy so the search→select flow is deterministic and
    // offline. Returning 23.10/113.30/广州/中国 keeps the api-check assertions
    // below valid without typing coordinates by hand.
    await page.route("**/api/geocode**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              displayName: `${cafeName}, 广州, 中国`,
              latitude: 23.1,
              longitude: 113.3,
              city: "广州",
              country: "中国",
            },
          ],
        }),
      })
    );

    await page.goto("/log");
    await expect(
      page.getByRole("heading", { name: "记录探店", level: 1 })
    ).toBeVisible();
    // Wait for the beans/cafés fetch to land before interacting.
    await expect(page.getByTestId("log-bean-chip").first()).toBeVisible();

    // No name select since Phase 3 — identity comes from the session (Baiwei).

    // Inline café creation via location search (no manual coordinates).
    await page.getByTestId("log-cafe-new-toggle").click();
    await page.getByTestId("log-new-cafe-name").fill(cafeName);
    await page.getByTestId("log-cafe-search-input").fill("广州 咖啡");
    await page.getByTestId("log-cafe-search-submit").click();
    await page.getByTestId("log-cafe-search-result").first().click();
    // The chosen result auto-fills city/country (and lat/lng in form state).
    await expect(page.getByTestId("log-new-cafe-city")).toHaveValue("广州");
    await expect(page.getByTestId("log-new-cafe-country")).toHaveValue("中国");

    // Inline bean creation.
    await page.getByTestId("log-add-new-bean").click();
    await page.getByTestId("new-bean-name").fill(beanName);
    await page.getByTestId("new-bean-origin").fill("埃塞俄比亚");
    await page.getByTestId("new-bean-save").click();

    // The inline form closes and the new bean shows up as a selected chip.
    await expect(page.getByTestId("new-bean-name")).toBeHidden();
    const newChip = page
      .getByTestId("log-bean-chip")
      .filter({ hasText: beanName });
    await expect(newChip).toBeVisible();
    await expect(newChip).toHaveClass(/bg-sage/);

    await page.getByTestId("log-brew-method").selectOption("Cold Brew");

    await page
      .getByTestId("rating-overall")
      .getByRole("button", { name: "5" })
      .click();
    await page
      .getByTestId("rating-bean-quality")
      .getByRole("button", { name: "4" })
      .click();
    await page
      .getByTestId("rating-barista-skill")
      .getByRole("button", { name: "4" })
      .click();
    await page
      .getByTestId("rating-ambiance")
      .getByRole("button", { name: "3" })
      .click();

    await page.getByTestId("log-notes").fill(notesText);
    await page.getByTestId("log-submit").click();

    // Submit creates the café, then the visit, then redirects to the feed.
    await expect(page).toHaveURL("/visits");

    // The visit defaults to today's date — newer than every seed visit and
    // inserted after anything earlier specs created, so it must be first.
    const firstCard = page.getByTestId("visit-card").first();
    await expect(firstCard).toContainText(cafeName);
    await expect(firstCard).toContainText("冷萃 Cold Brew");
    await expect(firstCard).toContainText(beanName);
    await expect(firstCard).toContainText(notesText);
    await expect(firstCard).toContainText("Baiwei 记录");
  });

  test("created café is returned by GET /api/cafes with the submitted fields", async ({
    request,
  }) => {
    const res = await request.get("/api/cafes");
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { data: ApiCafe[] };
    const created = body.data.find((c) => c.name === cafeName);
    expect(created).toBeDefined();
    expect(created?.city).toBe("广州");
    expect(created?.country).toBe("中国");
    expect(created?.latitude).toBeCloseTo(23.1, 5);
    expect(created?.longitude).toBeCloseTo(113.3, 5);
    // Attribution comes from the session: the request fixture is Baiwei (id 1).
    expect(created?.user_id).toBe(1);
  });
});

test("submitting in existing-café mode with no café selected shows inline error and stays on /log", async ({
  page,
}) => {
  await page.goto("/log");
  await expect(
    page.getByRole("heading", { name: "记录探店", level: 1 })
  ).toBeVisible();

  await page.getByTestId("log-cafe-existing-toggle").click();
  // Leave the café select on the empty "请选择咖啡馆…" option.
  await page.getByTestId("log-submit").click();

  const error = page.getByTestId("log-error");
  await expect(error).toBeVisible();
  await expect(error).toContainText("请选择或新增咖啡馆");
  await expect(page).toHaveURL("/log");
});

test("submitting a new café with no location chosen shows inline error and stays on /log", async ({
  page,
}) => {
  await page.goto("/log");
  await expect(
    page.getByRole("heading", { name: "记录探店", level: 1 })
  ).toBeVisible();
  await expect(page.getByTestId("log-bean-chip").first()).toBeVisible();

  await page.getByTestId("log-cafe-new-toggle").click();
  await page.getByTestId("log-new-cafe-name").fill("无位置咖啡馆");
  await page.getByTestId("log-new-cafe-city").fill("广州");
  await page.getByTestId("log-new-cafe-country").fill("中国");
  // No search/GPS/map pin → no coordinates captured.
  await page.getByTestId("log-submit").click();

  const error = page.getByTestId("log-error");
  await expect(error).toBeVisible();
  await expect(error).toContainText("请在地图上选择咖啡馆位置");
  await expect(page).toHaveURL("/log");
});
