import { test, expect } from "../../helpers/fixtures";

// Phase 4 coffee crawls. Serial: test 1 creates the crawl through the UI as
// Baiwei (default storage state) and saves its URL; later tests assert on it.
// Crawls persist for the rest of the run, so everything keys off a unique
// title — never off list totals.
const uniqueTitle = `E2E咖啡之旅 ${Date.now()}`;
const description = "端到端测试：两站连刷的探店合集。";

// Set by test 1 (the serial group skips later tests if it fails).
let crawlUrl = "";

// Form labels are "{cafe_name} · {formatted date}"; the detail page's stop
// cards render the café name alone, so strip the trailing date segment.
function cafeNameOf(label: string): string {
  const sep = label.lastIndexOf(" · ");
  return sep === -1 ? label : label.slice(0, sep);
}

test.describe.serial("咖啡之旅 crawls (Phase 4)", () => {
  test("Baiwei creates a crawl: pick 2 visits, reorder stops, submit to detail page", async ({
    page,
  }) => {
    await page.goto("/crawls/new");

    await page.getByTestId("crawl-title").fill(uniqueTitle);
    await page.getByTestId("crawl-description").fill(description);

    // Pick the first two of Baiwei's visits (seed has 4+; phase1 may have
    // added one). Insertion order = stop order: [A, B].
    const options = page.getByTestId("crawl-visit-option");
    await expect(options.first()).toBeVisible();
    const labelA = (await options.nth(0).innerText()).trim();
    const labelB = (await options.nth(1).innerText()).trim();
    expect(labelA).not.toBe(labelB);
    await options.nth(0).getByRole("checkbox").check();
    await options.nth(1).getByRole("checkbox").check();

    const stops = page.getByTestId("crawl-stop");
    await expect(stops).toHaveCount(2);
    await expect(stops.nth(0)).toContainText(labelA);
    await expect(stops.nth(1)).toContainText(labelB);

    // Move the first stop down once -> order swaps to [B, A].
    await stops.nth(0).getByTestId("crawl-stop-down").click();
    await expect(stops.nth(0)).toContainText(labelB);
    await expect(stops.nth(1)).toContainText(labelA);

    // Swap back via the up arrow on the second row, then down again, to also
    // exercise crawl-stop-up; final chosen order stays [B, A].
    await stops.nth(1).getByTestId("crawl-stop-up").click();
    await expect(stops.nth(0)).toContainText(labelA);
    await stops.nth(0).getByTestId("crawl-stop-down").click();
    await expect(stops.nth(0)).toContainText(labelB);
    await expect(stops.nth(1)).toContainText(labelA);

    await page.getByTestId("crawl-submit").click();
    await expect(page).toHaveURL(/\/crawls\/\d+$/);
    crawlUrl = page.url();

    const detail = page.getByTestId("crawl-detail");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(uniqueTitle);
    await expect(detail).toContainText("2 站");

    // Numbered stop cards in the chosen [B, A] order.
    const stopCards = page.getByTestId("crawl-stop-card");
    await expect(stopCards).toHaveCount(2);
    await expect(stopCards.nth(0).getByText("1", { exact: true }).first()).toBeVisible();
    await expect(stopCards.nth(1).getByText("2", { exact: true }).first()).toBeVisible();
    await expect(stopCards.nth(0)).toContainText(cafeNameOf(labelB));
    await expect(stopCards.nth(1)).toContainText(cafeNameOf(labelA));

    // The owner sees the edit link (contrast with the logged-out test below).
    await expect(page.getByTestId("crawl-edit-link")).toBeVisible();
  });

  test("the new crawl appears on the public /crawls list", async ({ page }) => {
    await page.goto("/crawls");
    const card = page
      .getByTestId("crawl-card")
      .filter({ hasText: uniqueTitle });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("2 站");
    await expect(card).toContainText("Baiwei");
  });

  test.describe("logged out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("crawl detail is publicly viewable without the edit link", async ({
      page,
    }) => {
      expect(crawlUrl).toMatch(/\/crawls\/\d+$/);
      await page.goto(crawlUrl);

      const detail = page.getByTestId("crawl-detail");
      await expect(detail).toBeVisible();
      await expect(detail).toContainText(uniqueTitle);
      await expect(page.getByTestId("crawl-stop-card")).toHaveCount(2);
      await expect(page.getByTestId("crawl-edit-link")).toHaveCount(0);
    });
  });

  test("client validation: missing title, then missing stops", async ({
    page,
  }) => {
    await page.goto("/crawls/new");

    // No title at all -> title error.
    await page.getByTestId("crawl-submit").click();
    await expect(page.getByTestId("crawl-error")).toContainText(
      "标题为必填项"
    );

    // Title present but no visits selected -> stops error.
    await page.getByTestId("crawl-title").fill(`${uniqueTitle} 校验`);
    await page.getByTestId("crawl-submit").click();
    await expect(page.getByTestId("crawl-error")).toContainText(
      "请至少选择一条探店记录"
    );
  });

  test("ownership: POST /api/crawls rejects another user's visit ids with 400", async ({
    request,
  }) => {
    // Friend2 (user id 3) has exactly 2 seed visits — grab one of theirs.
    const visitsRes = await request.get("/api/visits?user_id=3");
    expect(visitsRes.ok()).toBeTruthy();
    const visitsBody = (await visitsRes.json()) as {
      data: Array<{ id: number }>;
    };
    expect(visitsBody.data.length).toBeGreaterThan(0);
    const friend2VisitId = visitsBody.data[0].id;

    // The request fixture carries Baiwei's session (user1 storage state).
    const res = await request.post("/api/crawls", {
      data: {
        title: `${uniqueTitle} 越权`,
        crawl_date: "2026-06-12",
        visit_ids: [friend2VisitId],
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("只能选择自己的探店记录");
  });
});
