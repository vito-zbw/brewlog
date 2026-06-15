import { readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";

// Path is relative to the repo root, where Playwright (and this Node
// process) runs from.
const FIXTURE = "tests/fixtures/test-photo.jpg";

// Uploads one photo to an entity via the API and returns its public URL. The
// inline detail-page uploader has been retired across the app; photos are added
// through the visit/bean forms or directly via the API.
async function apiUploadPhoto(
  request: APIRequestContext,
  entityType: string,
  entityId: number
): Promise<string> {
  const res = await request.post("/api/photos", {
    multipart: {
      file: {
        name: "photo.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync(FIXTURE),
      },
      entity_type: entityType,
      entity_id: String(entityId),
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { data: { url: string } }).data.url;
}

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

  test("deletes a photo through the café gallery ✕ button", async ({
    page,
    request,
  }) => {
    // Café 7 (Kurasu Kyoto) belongs to Baiwei (the default session). Upload via
    // the API (the inline café uploader was removed); the gallery's ✕ delete on
    // the café detail page is unchanged. The newest photo is first, so deleting
    // .first() removes the one we just uploaded.
    const src = await apiUploadPhoto(request, "cafe", 7);
    await page.goto("/cafes/7");
    const gallery = page.getByTestId("gallery-image");
    const before = await gallery.count();
    expect(before).toBeGreaterThan(0);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("photo-delete-button").first().click();

    await expect.poll(() => gallery.count()).toBe(before - 1);
    // The stored object is gone too — the old URL now 404s.
    const response = await page.request.get(src);
    expect(response.status()).toBe(404);
  });
});
