import { readFileSync } from "node:fs";
import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext } from "@playwright/test";

// Full bean lifecycle, aligned with the visit-photo model: photos are STAGED in
// the create/edit forms and uploaded after the bean row exists; the detail page
// is view-only; delete lives in the edit form. Default session is Baiwei
// (user1); non-owner blocks switch to Friend2 (user2.json) or logged-out. Every
// test creates uniquely-named rows so seed data stays intact.

const FIXTURE = "tests/fixtures/test-photo.jpg";
const BAIWEI_BEAN_ID = 1; // seed bean "云南保山铁皮卡", owned by user1 (Baiwei).

interface BeanBody {
  data: { id: number; name: string };
}
interface VisitBody {
  data: { id: number };
}

/** Creates a bean owned by the request's identity; returns id + unique name. */
async function createBean(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<{ id: number; name: string }> {
  const name = `E2E咖啡豆 ${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const res = await request.post("/api/beans", {
    data: {
      name,
      origin_country: "Ethiopia",
      processing_method: "Washed",
      roast_level: "Light",
      ...overrides,
    },
  });
  expect(res.status()).toBe(201);
  return { id: ((await res.json()) as BeanBody).data.id, name };
}

/** Creates a visit (owned by the request) that references the given bean. */
async function createVisitWithBean(
  request: APIRequestContext,
  beanId: number
): Promise<number> {
  const res = await request.post("/api/visits", {
    data: {
      cafe_id: 1,
      visit_date: "2026-06-15",
      brew_method: "V60",
      rating_overall: 4,
      rating_bean_quality: 4,
      rating_barista_skill: 4,
      rating_ambiance: 4,
      notes: `E2E豆删除测试 ${Date.now()}`,
      bean_ids: [beanId],
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as VisitBody).data.id;
}

/** Uploads one photo to a bean (owned by the request) via the API. */
async function uploadBeanPhoto(
  request: APIRequestContext,
  beanId: number
): Promise<void> {
  const res = await request.post("/api/photos", {
    multipart: {
      file: {
        name: "photo.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync(FIXTURE),
      },
      entity_type: "bean",
      entity_id: String(beanId),
    },
  });
  expect(res.status()).toBe(201);
}

async function beanIdByName(
  request: APIRequestContext,
  name: string
): Promise<number> {
  const res = await request.get(
    `/api/beans?search=${encodeURIComponent(name)}`
  );
  const beans = ((await res.json()) as { data: { id: number }[] }).data;
  expect(beans.length).toBe(1);
  return beans[0].id;
}

test.describe("咖啡豆 创建 — 完整字段 + 照片（log 表单）", () => {
  test("creates a bean with every card field and staged photos, then renders them", async ({
    page,
    request,
  }) => {
    const name = `E2E完整豆 ${Date.now()}`;
    const farm = `测试庄园 ${Date.now()}`;
    const freetext = `这是一段独一无二的风味描述 ${Date.now()}`;

    await page.goto("/log");
    // Wait for the client fetch to populate chips — proves the page hydrated.
    await expect(page.getByTestId("log-bean-chip").first()).toBeVisible();
    await page.getByTestId("log-add-new-bean").click();

    await page.getByTestId("new-bean-name").fill(name);
    await page.getByTestId("new-bean-origin").fill("埃塞俄比亚");
    await page.getByTestId("new-bean-region").fill("Yirgacheffe");
    await page.getByTestId("new-bean-farm").fill(farm);
    await page.getByTestId("new-bean-roaster").fill("Torch Coffee Lab");
    await page.getByTestId("new-bean-processing").selectOption("Natural");
    await page.getByTestId("new-bean-roast").selectOption("Medium-Light");
    await page.getByTestId("new-bean-freetext").fill(freetext);
    await page.getByTestId("flavor-tag").first().click();

    // Stage two photos with a caption on the first (aligned with the visit form).
    await page
      .getByTestId("new-bean-photo-stager-input")
      .setInputFiles([FIXTURE, FIXTURE]);
    await expect(page.getByTestId("new-bean-staged-photo")).toHaveCount(2);
    await page.getByTestId("new-bean-staged-photo-caption").first().fill("拉花");

    await page.getByTestId("new-bean-save").click();

    // Form closes and the new bean is selected as a chip.
    await expect(page.getByTestId("new-bean-name")).toBeHidden();
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toBeVisible();

    const beanId = await beanIdByName(request, name);
    await page.goto(`/beans/${beanId}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("庄园", { exact: true })).toBeVisible();
    await expect(page.getByText(farm, { exact: true })).toBeVisible();
    await expect(page.getByText(freetext)).toBeVisible();
    await expect(page.getByText("日晒 Natural", { exact: true })).toBeVisible();
    await expect(
      page.getByText("中浅烘 Medium-Light", { exact: true })
    ).toBeVisible();
    await expect
      .poll(() => page.getByTestId("gallery-image").count())
      .toBe(2);
    await expect(page.getByText("拉花")).toBeVisible();
  });

  test("a failed photo upload keeps the form; retry succeeds without duplicating the bean", async ({
    page,
    request,
  }) => {
    const name = `E2E容错豆 ${Date.now()}`;

    await page.goto("/log");
    await expect(page.getByTestId("log-bean-chip").first()).toBeVisible();
    await page.getByTestId("log-add-new-bean").click();
    await page.getByTestId("new-bean-name").fill(name);
    await page.getByTestId("new-bean-origin").fill("埃塞俄比亚");
    await page.getByTestId("new-bean-photo-stager-input").setInputFiles(FIXTURE);
    await expect(page.getByTestId("new-bean-staged-photo")).toHaveCount(1);

    // Force only the photo endpoint to fail on the first attempt.
    await page.route("**/api/photos", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "boom" }),
      })
    );
    await page.getByTestId("new-bean-save").click();

    // Bean saved, but we stay on the form: error shown, photo still staged,
    // and the chip is NOT added yet (onComplete withheld until photos land).
    await expect(page.getByTestId("new-bean-error")).toContainText(
      "照片上传失败"
    );
    await expect(page.getByTestId("new-bean-staged-photo")).toHaveCount(1);
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toHaveCount(0);

    // Let uploads through and retry — the guard skips re-creating the bean.
    await page.unroute("**/api/photos");
    await page.getByTestId("new-bean-save").click();
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toBeVisible();

    // Exactly one bean with this name (no duplicate from the retry).
    const beanId = await beanIdByName(request, name);
    await page.goto(`/beans/${beanId}`);
    await expect
      .poll(() => page.getByTestId("gallery-image").count())
      .toBe(1);
  });
});

test.describe("咖啡豆 校验 — API", () => {
  test("POST with an empty name is rejected → 400", async ({ request }) => {
    const res = await request.post("/api/beans", {
      data: { name: "  ", origin_country: "Ethiopia" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("必填");
  });

  test("PUT with an invalid roast_level is rejected → 400", async ({
    request,
  }) => {
    const { id } = await createBean(request);
    const res = await request.put(`/api/beans/${id}`, {
      data: {
        name: "改名",
        origin_country: "Ethiopia",
        roast_level: "NotARoast",
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("无效");
  });
});

test.describe("咖啡豆 编辑 — owner", () => {
  test("owner edits a bean via the detail page → 编辑 → saved value shown", async ({
    page,
    request,
  }) => {
    const { id, name } = await createBean(request);
    const newFarm = `编辑后的庄园 ${Date.now()}`;

    await page.goto(`/beans/${id}`);
    await page.getByTestId("bean-edit-link").click();
    await expect(page).toHaveURL(`/beans/${id}/edit`);

    await page.getByTestId("bean-edit-farm").fill(newFarm);
    await page.getByTestId("bean-edit-save").click();

    await expect(page).toHaveURL(`/beans/${id}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(newFarm, { exact: true })).toBeVisible();
  });

  test("edit page stages a new photo and it shows on the detail page", async ({
    page,
    request,
  }) => {
    const { id } = await createBean(request);

    await page.goto(`/beans/${id}/edit`);
    await page.getByTestId("bean-edit-photo-stager-input").setInputFiles(FIXTURE);
    await expect(page.getByTestId("bean-edit-staged-photo")).toHaveCount(1);
    await page.getByTestId("bean-edit-save").click();

    await expect(page).toHaveURL(`/beans/${id}`);
    await expect
      .poll(() => page.getByTestId("gallery-image").count())
      .toBe(1);
  });

  test("edit page deletes an existing photo", async ({ page, request }) => {
    const { id } = await createBean(request);
    await uploadBeanPhoto(request, id);

    await page.goto(`/beans/${id}/edit`);
    await expect(page.getByTestId("bean-edit-existing-photo")).toHaveCount(1);

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("bean-edit-existing-photo-delete").click();
    await expect(page.getByTestId("bean-edit-existing-photo")).toHaveCount(0);

    // Gone on the detail page too.
    await page.goto(`/beans/${id}`);
    await expect(page.getByTestId("gallery-image")).toHaveCount(0);
  });

  test("inline edit changes an owned bean's field and persists it", async ({
    page,
    request,
  }) => {
    const { id, name } = await createBean(request);
    const newFarm = `内联编辑庄园 ${Date.now()}`;

    await page.goto("/log");
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toBeVisible();
    await page.getByRole("button", { name: `编辑 ${name}` }).click();

    await page.getByTestId("bean-edit-farm").fill(newFarm);
    await page.getByTestId("bean-edit-save").click();

    // The inline edit form closes once the save resolves.
    await expect(page.getByTestId("bean-edit-farm")).toHaveCount(0);

    const check = await request.get(`/api/beans/${id}`);
    const bean = ((await check.json()) as { data: { farm: string } }).data;
    expect(bean.farm).toBe(newFarm);
  });

  test("inline edit stages a photo onto an owned bean", async ({
    page,
    request,
  }) => {
    const { id, name } = await createBean(request);

    await page.goto("/log");
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toBeVisible();
    await page.getByRole("button", { name: `编辑 ${name}` }).click();

    // Inline editor shows the bean's photo stager (prefixed to avoid clashing
    // with the visit stager on the same page).
    await page
      .getByTestId("bean-edit-photo-stager-input")
      .setInputFiles(FIXTURE);
    await expect(page.getByTestId("bean-edit-staged-photo")).toHaveCount(1);
    await page.getByTestId("bean-edit-save").click();
    await expect(page.getByTestId("bean-edit-farm")).toHaveCount(0);

    const photos = await request.get(
      `/api/photos?entity_type=bean&entity_id=${id}`
    );
    expect(((await photos.json()) as { data: unknown[] }).data.length).toBe(1);
  });

  test("inline edit deletes an existing photo on an owned bean", async ({
    page,
    request,
  }) => {
    const { id, name } = await createBean(request);
    await uploadBeanPhoto(request, id);

    await page.goto("/log");
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toBeVisible();
    await page.getByRole("button", { name: `编辑 ${name}` }).click();

    // The inline editor loads the bean's existing photo with a delete control.
    await expect(page.getByTestId("bean-edit-existing-photo")).toHaveCount(1);
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("bean-edit-existing-photo-delete").click();
    await expect(page.getByTestId("bean-edit-existing-photo")).toHaveCount(0);

    // Gone server-side too.
    const photos = await request.get(
      `/api/photos?entity_type=bean&entity_id=${id}`
    );
    expect(((await photos.json()) as { data: unknown[] }).data.length).toBe(0);
  });

  test("inline edit & delete controls appear for owned bean chips", async ({
    page,
    request,
  }) => {
    const { id, name } = await createBean(request);

    await page.goto("/log");
    const chip = page.getByTestId("log-bean-chip").filter({ hasText: name });
    await expect(chip).toBeVisible();
    await expect(
      page.getByRole("button", { name: `编辑 ${name}` })
    ).toBeVisible();

    // Inline delete (bean is unused) removes the chip.
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `删除 ${name}` }).click();
    await expect(chip).toHaveCount(0);

    const check = await request.get(`/api/beans/${id}`);
    expect(check.status()).toBe(404);
  });
});

test.describe("咖啡豆 删除 — owner", () => {
  test("deletes an unused bean → 200, gone", async ({ request }) => {
    const { id } = await createBean(request);
    const del = await request.delete(`/api/beans/${id}`);
    expect(del.status()).toBe(200);
    const check = await request.get(`/api/beans/${id}`);
    expect(check.status()).toBe(404);
  });

  test("refuses to delete a bean a visit still uses → 409, bean intact", async ({
    request,
  }) => {
    const { id } = await createBean(request);
    await createVisitWithBean(request, id);

    const del = await request.delete(`/api/beans/${id}`);
    expect(del.status()).toBe(409);
    const body = (await del.json()) as { error?: string };
    expect(body.error).toContain("无法删除");

    const check = await request.get(`/api/beans/${id}`);
    expect(check.status()).toBe(200);
  });

  test("edit-form delete button removes an unused bean → back to library", async ({
    page,
    request,
  }) => {
    const { id } = await createBean(request);

    await page.goto(`/beans/${id}/edit`);
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("bean-delete").click();

    await expect(page).toHaveURL("/beans");
    const check = await request.get(`/api/beans/${id}`);
    expect(check.status()).toBe(404);
  });

  test("edit-form delete button surfaces the 409 message when in use", async ({
    page,
    request,
  }) => {
    const { id } = await createBean(request);
    await createVisitWithBean(request, id);

    await page.goto(`/beans/${id}/edit`);
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("bean-delete").click();

    await expect(page.getByTestId("bean-delete-error")).toContainText(
      "无法删除"
    );
    await expect(page).toHaveURL(`/beans/${id}/edit`);
  });
});

test.describe("咖啡豆 详情页 — 只读照片", () => {
  test("detail page has no photo upload control or edit link when logged in as owner", async ({
    page,
    request,
  }) => {
    const { id } = await createBean(request);
    await uploadBeanPhoto(request, id);

    await page.goto(`/beans/${id}`);
    // Owner sees the 编辑 link but NO inline photo management on the detail page.
    await expect(page.getByTestId("bean-edit-link")).toBeVisible();
    await expect(page.getByTestId("photo-stager-input")).toHaveCount(0);
    await expect(page.getByTestId("photo-delete-button")).toHaveCount(0);
    await expect(page.getByTestId("gallery-image")).toHaveCount(1);
  });
});

test.describe("咖啡豆 编辑/删除 — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("no 编辑 link on a bean detail page", async ({ page }) => {
    await page.goto(`/beans/${BAIWEI_BEAN_ID}`);
    await expect(page.getByText("处理法", { exact: true })).toBeVisible();
    await expect(page.getByTestId("bean-edit-link")).toHaveCount(0);
  });

  test("PUT and DELETE return 401, bean intact", async ({ request }) => {
    const put = await request.put(`/api/beans/${BAIWEI_BEAN_ID}`, {
      data: { name: "黑客改名", origin_country: "Nowhere" },
    });
    expect(put.status()).toBe(401);
    const del = await request.delete(`/api/beans/${BAIWEI_BEAN_ID}`);
    expect(del.status()).toBe(401);
    const check = await request.get(`/api/beans/${BAIWEI_BEAN_ID}`);
    expect(check.status()).toBe(200);
  });

  test("the bean edit page redirects to login", async ({ page }) => {
    await page.goto(`/beans/${BAIWEI_BEAN_ID}/edit`);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("咖啡豆 编辑/删除 — non-owner (Friend2)", () => {
  test.use({ storageState: "playwright/.auth/user2.json" });

  test("no 编辑 link on someone else's bean", async ({ page }) => {
    await page.goto(`/beans/${BAIWEI_BEAN_ID}`);
    await expect(page.getByText("处理法", { exact: true })).toBeVisible();
    await expect(page.getByTestId("bean-edit-link")).toHaveCount(0);
  });

  test("PUT and DELETE another user's bean return 403, bean intact", async ({
    request,
  }) => {
    const put = await request.put(`/api/beans/${BAIWEI_BEAN_ID}`, {
      data: { name: "越权改名", origin_country: "Nowhere" },
    });
    expect(put.status()).toBe(403);
    const del = await request.delete(`/api/beans/${BAIWEI_BEAN_ID}`);
    expect(del.status()).toBe(403);
    const check = await request.get(`/api/beans/${BAIWEI_BEAN_ID}`);
    expect(check.status()).toBe(200);
  });

  test("the bean edit page 404s for a non-owner", async ({ page }) => {
    const res = await page.goto(`/beans/${BAIWEI_BEAN_ID}/edit`);
    expect(res?.status()).toBe(404);
  });
});
