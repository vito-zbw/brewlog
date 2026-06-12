import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";

// Path is relative to the repo root, where Playwright (and this Node
// process) runs from.
const FIXTURE = "tests/fixtures/test-photo.jpg";

// Uploads the fixture through the hidden file input and waits for the
// gallery to grow. Returns the src of the first gallery image. Counts are
// relative (before vs. after) because earlier specs in the serial run may
// already have attached photos to the same entity.
async function uploadPhoto(page: Page, path: string): Promise<string> {
  await page.goto(path);
  const gallery = page.getByTestId("gallery-image");
  const before = await gallery.count();

  await page.getByTestId("photo-upload-input").setInputFiles(FIXTURE);

  await expect.poll(() => gallery.count()).toBeGreaterThan(before);
  await expect(gallery.first()).toBeVisible();
  await expect(page.getByTestId("photo-upload-error")).toHaveCount(0);

  const src = await gallery.first().getAttribute("src");
  expect(src).not.toBeNull();
  return src ?? "";
}

test.describe("photos", () => {
  test("uploads a photo on a visit detail page and serves it back", async ({
    page,
  }) => {
    await page.goto("/visits/1");
    await expect(page.getByTestId("visit-detail")).toBeVisible();

    const src = await uploadPhoto(page, "/visits/1");
    expect(src).toMatch(/^\/api\/uploads\//);

    const response = await page.request.get(src);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toMatch(/^image\//);
  });

  test("uploads a photo on a bean detail page", async ({ page }) => {
    const src = await uploadPhoto(page, "/beans/1");
    expect(src).toMatch(/^\/api\/uploads\//);
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

  test("deletes a photo through the gallery ✕ button", async ({ page }) => {
    // Upload onto café 6 (Something For Café) — no other spec touches it,
    // so absolute counts are safe here.
    const src = await uploadPhoto(page, "/cafes/6");
    const gallery = page.getByTestId("gallery-image");
    const before = await gallery.count();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("photo-delete-button").first().click();

    await expect.poll(() => gallery.count()).toBe(before - 1);
    // The stored object is gone too — the old URL now 404s.
    const response = await page.request.get(src);
    expect(response.status()).toBe(404);
  });
});
