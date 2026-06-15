import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext, Page } from "@playwright/test";

// Full bean lifecycle: create (all fields + photo) in the log form, owner-gated
// edit & delete, and the "block delete while a visit uses it" rule. Default
// session is Baiwei (user1); non-owner blocks switch to Friend2 (user2.json) or
// logged-out. Every test creates uniquely-named rows so seed data stays intact.

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

test.describe("咖啡豆 创建 — 完整字段 + 照片（log 表单）", () => {
  test("creates a bean with every card field and a photo, then renders them", async ({
    page,
    request,
  }) => {
    const name = `E2E完整豆 ${Date.now()}`;
    const farm = `测试庄园 ${Date.now()}`;
    const freetext = `这是一段独一无二的风味描述 ${Date.now()}`;

    await page.goto("/log");
    await page.getByTestId("log-add-new-bean").click();

    await page.getByTestId("new-bean-name").fill(name);
    await page.getByTestId("new-bean-origin").fill("埃塞俄比亚");
    await page.getByTestId("new-bean-region").fill("Yirgacheffe");
    await page.getByTestId("new-bean-farm").fill(farm);
    await page.getByTestId("new-bean-roaster").fill("Torch Coffee Lab");
    await page.getByTestId("new-bean-processing").selectOption("Natural");
    await page.getByTestId("new-bean-roast").selectOption("Medium-Light");
    await page.getByTestId("new-bean-freetext").fill(freetext);
    // Pick a flavor tag (first one) and attach a photo before saving.
    await page.getByTestId("flavor-tag").first().click();
    await page.getByTestId("new-bean-photo-input").setInputFiles(FIXTURE);
    await expect(page.getByTestId("new-bean-photo-name")).toBeVisible();

    await page.getByTestId("new-bean-save").click();

    // Form closes and the new bean is selected as a chip.
    await expect(page.getByTestId("new-bean-name")).toBeHidden();
    await expect(
      page.getByTestId("log-bean-chip").filter({ hasText: name })
    ).toBeVisible();

    // Resolve the new bean's id and verify the detail page shows everything.
    const found = await request.get(
      `/api/beans?search=${encodeURIComponent(name)}`
    );
    const beans = ((await found.json()) as { data: { id: number }[] }).data;
    expect(beans.length).toBe(1);
    const beanId = beans[0].id;

    await page.goto(`/beans/${beanId}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("庄园", { exact: true })).toBeVisible();
    await expect(page.getByText(farm, { exact: true })).toBeVisible();
    await expect(page.getByText(freetext)).toBeVisible();
    await expect(page.getByText("日晒 Natural", { exact: true })).toBeVisible();
    await expect(
      page.getByText("中浅烘 Medium-Light", { exact: true })
    ).toBeVisible();
    // The attached photo made it into the gallery.
    await expect
      .poll(() => page.getByTestId("gallery-image").count())
      .toBeGreaterThanOrEqual(1);
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

  test("inline edit & delete controls appear for owned bean chips in the log form", async ({
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

  test("delete button on the detail page surfaces the 409 message", async ({
    page,
    request,
  }) => {
    const { id } = await createBean(request);
    await createVisitWithBean(request, id);

    await page.goto(`/beans/${id}`);
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByTestId("bean-delete").click();

    await expect(page.getByTestId("bean-delete-error")).toContainText(
      "无法删除"
    );
    // Still on the bean page, not redirected.
    await expect(page).toHaveURL(`/beans/${id}`);
  });
});

test.describe("咖啡豆 编辑/删除 — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("no 编辑/删除 controls on a bean detail page", async ({ page }) => {
    await page.goto(`/beans/${BAIWEI_BEAN_ID}`);
    await expect(page.getByText("处理法", { exact: true })).toBeVisible();
    await expect(page.getByTestId("bean-edit-link")).toHaveCount(0);
    await expect(page.getByTestId("bean-delete")).toHaveCount(0);
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

  test("no 编辑/删除 controls on someone else's bean", async ({ page }) => {
    await page.goto(`/beans/${BAIWEI_BEAN_ID}`);
    await expect(page.getByText("处理法", { exact: true })).toBeVisible();
    await expect(page.getByTestId("bean-edit-link")).toHaveCount(0);
    await expect(page.getByTestId("bean-delete")).toHaveCount(0);
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
