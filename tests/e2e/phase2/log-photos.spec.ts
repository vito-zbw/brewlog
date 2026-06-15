import { test, expect } from "../../helpers/fixtures";

// Photos staged inside the visit form (both /log create and the edit form),
// uploaded after the visit row exists. Default session is Baiwei (user1).
const FIXTURE = "tests/fixtures/test-photo.jpg";

test.describe("photos while logging", () => {
  test("stages multiple photos in /log and they appear on the new visit", async ({
    page,
  }) => {
    await page.goto("/log");
    await expect(page.getByTestId("log-cafe-select")).toBeVisible();
    // Use an existing café so we can skip the map/location flow. A past date
    // keeps this visit out of the "newest visits" other specs (e.g. crawls)
    // inspect — the date is irrelevant to the photo behavior under test.
    await page.getByTestId("log-cafe-select").selectOption({ index: 1 });
    await page.getByTestId("log-date").fill("2024-01-15");

    await page
      .getByTestId("photo-stager-input")
      .setInputFiles([FIXTURE, FIXTURE]);
    await expect(page.getByTestId("staged-photo")).toHaveCount(2);
    await page.getByTestId("staged-photo-caption").first().fill("拉花");

    await page.getByTestId("log-submit").click();

    // Create now lands on the new visit's detail page (not the feed).
    await expect(page).toHaveURL(/\/visits\/\d+$/);
    await expect(page.getByTestId("visit-detail")).toBeVisible();
    const gallery = page.getByTestId("gallery-image");
    await expect.poll(() => gallery.count()).toBe(2);
    await expect(page.getByText("拉花")).toBeVisible();
  });

  test("edit form adds a staged photo and removes an existing one", async ({
    page,
    request,
  }) => {
    // A Baiwei-owned visit to manage photos on.
    const res = await request.post("/api/visits", {
      data: {
        cafe_id: 1,
        visit_date: "2024-03-10",
        brew_method: "V60",
        rating_overall: 4,
        rating_bean_quality: 4,
        rating_barista_skill: 4,
        rating_ambiance: 4,
        notes: `照片编辑测试 ${Date.now()}`,
        bean_ids: [],
      },
    });
    expect(res.status()).toBe(201);
    const visitId = ((await res.json()) as { data: { id: number } }).data.id;

    // Add a photo through the edit form.
    await page.goto(`/visits/${visitId}/edit`);
    await page.getByTestId("photo-stager-input").setInputFiles(FIXTURE);
    await expect(page.getByTestId("staged-photo")).toHaveCount(1);
    await page.getByTestId("log-submit").click();
    await expect(page).toHaveURL(`/visits/${visitId}`);
    await expect.poll(() => page.getByTestId("gallery-image").count()).toBe(1);

    // Remove it through the edit form.
    await page.goto(`/visits/${visitId}/edit`);
    await expect(page.getByTestId("gallery-image")).toHaveCount(1);
    page.on("dialog", (d) => d.accept());
    await page.getByTestId("photo-delete-button").click();
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);

    // Confirmed gone on the detail page too.
    await page.goto(`/visits/${visitId}`);
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);
  });

  test("a failed photo upload keeps the saved visit and retries cleanly", async ({
    page,
  }) => {
    await page.goto("/log");
    await expect(page.getByTestId("log-cafe-select")).toBeVisible();
    await page.getByTestId("log-cafe-select").selectOption({ index: 1 });
    await page.getByTestId("log-date").fill("2024-02-20");
    await page.getByTestId("photo-stager-input").setInputFiles(FIXTURE);
    await expect(page.getByTestId("staged-photo")).toHaveCount(1);

    // Force the photo endpoint to fail on the first attempt.
    await page.route("**/api/photos", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "boom" }),
      })
    );
    await page.getByTestId("log-submit").click();

    // Visit was saved, but we stay on /log: error shown, photo still staged.
    await expect(page.getByTestId("log-error")).toContainText("照片上传失败");
    await expect(page.getByTestId("staged-photo")).toHaveCount(1);
    await expect(page).toHaveURL("/log");

    // Let uploads through and retry — the guard skips re-creating the visit.
    await page.unroute("**/api/photos");
    await page.getByTestId("log-submit").click();
    await expect(page).toHaveURL(/\/visits\/\d+$/);
    await expect.poll(() => page.getByTestId("gallery-image").count()).toBe(1);
  });
});
