import { readFileSync } from "node:fs";
import { test, expect } from "../../helpers/fixtures";

// Path is relative to the repo root, where Playwright (and this Node
// process) runs from.
const FIXTURE = "tests/fixtures/test-photo.jpg";

test.describe("photos", () => {
  test("attaches a photo to a visit via the edit form and serves it back", async ({
    page,
  }) => {
    await page.goto("/visits/1");
    await expect(page.getByTestId("visit-detail")).toBeVisible();
    // The inline uploader is gone — photos are managed through the edit form.
    await expect(page.getByTestId("photo-upload-input")).toHaveCount(0);

    const gallery = page.getByTestId("gallery-image");
    const before = await gallery.count();

    await page.getByTestId("visit-edit-link").click();
    await expect(page).toHaveURL("/visits/1/edit");
    await page.getByTestId("photo-stager-input").setInputFiles(FIXTURE);
    await expect(page.getByTestId("staged-photo")).toHaveCount(1);
    await page.getByTestId("log-submit").click();

    await expect(page).toHaveURL("/visits/1");
    await expect.poll(() => gallery.count()).toBeGreaterThan(before);

    const src = await gallery.first().getAttribute("src");
    expect(src).toMatch(/^\/api\/uploads\//);
    const response = await page.request.get(src ?? "");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toMatch(/^image\//);
  });

  test("bean detail page is view-only (photos managed in the edit form)", async ({
    page,
  }) => {
    await page.goto("/beans/1");
    await expect(page.getByText("处理法", { exact: true })).toBeVisible();
    // Mirrors visits: the inline uploader is gone; photos move to the edit form.
    await expect(page.getByTestId("photo-upload-input")).toHaveCount(0);
  });

  test("photos persist across a full page reload", async ({ page }) => {
    // The first test in this file already uploaded a photo to visit 1, and
    // the database persists across the serial run.
    await page.goto("/visits/1");
    const gallery = page.getByTestId("gallery-image");
    await expect.poll(() => gallery.count()).toBeGreaterThanOrEqual(1);

    await page.reload();
    await expect.poll(() => gallery.count()).toBeGreaterThanOrEqual(1);
    await expect(gallery.first()).toBeVisible();
  });

  test("API rejects uploads without a file or with an invalid entity_type", async ({
    request,
  }) => {
    // No created_by field — the uploader is taken from the session.
    const noFile = await request.post("/api/photos", {
      multipart: {
        entity_type: "visit",
        entity_id: "1",
      },
    });
    expect(noFile.status()).toBe(400);
    const noFileBody = (await noFile.json()) as { error?: string };
    expect(noFileBody.error).toBe("照片为必填项");

    const badType = await request.post("/api/photos", {
      multipart: {
        file: {
          name: "photo.jpg",
          mimeType: "image/jpeg",
          buffer: readFileSync(FIXTURE),
        },
        entity_type: "teapot",
        entity_id: "1",
      },
    });
    expect(badType.status()).toBe(400);
    const badTypeBody = (await badType.json()) as { error?: string };
    expect(badTypeBody.error).toBe("关联对象无效");
  });

  test("API rejects photos for nonexistent entities", async ({ request }) => {
    const orphan = await request.post("/api/photos", {
      multipart: {
        file: {
          name: "photo.jpg",
          mimeType: "image/jpeg",
          buffer: readFileSync(FIXTURE),
        },
        entity_type: "visit",
        entity_id: "999999",
      },
    });
    expect(orphan.status()).toBe(404);
    const body = (await orphan.json()) as { error?: string };
    expect(body.error).toBe("关联对象不存在");
  });

  test("cafés have no photos: API rejects café uploads and the detail page has no gallery", async ({
    page,
    request,
  }) => {
    // Café photos were removed app-wide — a café has no photos of its own, so
    // 'cafe' is no longer a valid photo entity type. The API rejects it (the
    // same 400 path as any unknown type) and the café detail page, which once
    // hosted a standalone gallery, now renders no "照片" heading and no images.
    const rejected = await request.post("/api/photos", {
      multipart: {
        file: {
          name: "photo.jpg",
          mimeType: "image/jpeg",
          buffer: readFileSync(FIXTURE),
        },
        entity_type: "cafe",
        entity_id: "7",
      },
    });
    expect(rejected.status()).toBe(400);
    expect(((await rejected.json()) as { error?: string }).error).toBe(
      "关联对象无效"
    );

    await page.goto("/cafes/7");
    await expect(page.getByTestId("cafe-detail")).toBeVisible();
    await expect(page.getByRole("heading", { name: "照片" })).toHaveCount(0);
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);
  });
});
