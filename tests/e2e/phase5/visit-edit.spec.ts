import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext } from "@playwright/test";

// Editing a visit (owner-only) — mirrors the crawl edit flow: an 编辑 link on
// the detail page opens /visits/[id]/edit, which updates via PUT (and hosts the
// delete button). Default storage state is Baiwei (user1); the non-owner blocks
// switch to Friend2 (user2) / logged-out. Each test makes its own visit.

interface VisitIdBody {
  data: { id: number };
}
interface VisitListBody {
  data: { id: number }[];
}
interface VisitDetailBody {
  data: { id: number; rating_overall: number; notes: string | null };
}

const SEED_CAFE_ID = 1; // ".jpg coffee" from seed.sql

const VALID_BODY = {
  cafe_id: SEED_CAFE_ID,
  visit_date: "2026-06-14",
  brew_method: "V60",
  rating_overall: 3,
  rating_bean_quality: 3,
  rating_barista_skill: 3,
  rating_ambiance: 3,
  notes: "edit-attempt",
  bean_ids: [] as number[],
};

/** Creates a visit owned by the request's identity and returns its id. */
async function createVisit(request: APIRequestContext): Promise<number> {
  const res = await request.post("/api/visits", {
    data: { ...VALID_BODY, rating_overall: 5, notes: `E2E编辑测试 ${Date.now()}` },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as VisitIdBody).data.id;
}

/** Newest visit id owned by Baiwei (user1); public GET, any viewer. */
async function aBaiweiVisitId(request: APIRequestContext): Promise<number> {
  const res = await request.get("/api/visits?user_id=1&limit=1");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as VisitListBody;
  expect(body.data.length).toBeGreaterThan(0);
  return body.data[0].id;
}

test.describe("编辑探店记录 — owner", () => {
  test("owner sees 编辑 link and edits rating + notes → saved, shown on detail", async ({
    page,
    request,
  }) => {
    const visitId = await createVisit(request);
    const newNotes = `已编辑 ${Date.now()}`;

    // Reach the edit form via the detail-page 编辑 link.
    await page.goto(`/visits/${visitId}`);
    await page.getByTestId("visit-edit-link").click();
    await expect(page).toHaveURL(`/visits/${visitId}/edit`);

    // Wait for the café/bean fetch so the prefilled form is interactive.
    await expect(page.getByTestId("log-bean-chip").first()).toBeVisible();

    await page
      .getByTestId("rating-overall")
      .getByRole("button", { name: "2" })
      .click();
    await page.getByTestId("log-notes").fill(newNotes);
    await page.getByTestId("log-submit").click();

    // Edit redirects to the detail page (not the feed) — mirrors crawls.
    await expect(page).toHaveURL(`/visits/${visitId}`);
    await expect(page.getByTestId("visit-detail")).toContainText(newNotes);

    const after = await request.get(`/api/visits/${visitId}`);
    const body = (await after.json()) as VisitDetailBody;
    expect(body.data.rating_overall).toBe(2);
    expect(body.data.notes).toBe(newNotes);
  });
});

test.describe("编辑探店记录 — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("GET /visits/[id]/edit redirects to /login", async ({ page, request }) => {
    const visitId = await aBaiweiVisitId(request);
    await page.goto(`/visits/${visitId}/edit`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("PUT /api/visits/[id] returns 401 and leaves the visit intact", async ({
    request,
  }) => {
    const visitId = await aBaiweiVisitId(request);
    const res = await request.put(`/api/visits/${visitId}`, { data: VALID_BODY });
    expect(res.status()).toBe(401);
    const check = await request.get(`/api/visits/${visitId}`);
    expect(check.status()).toBe(200);
  });
});

test.describe("编辑探店记录 — non-owner (Friend2)", () => {
  test.use({ storageState: "playwright/.auth/user2.json" });

  test("edit page for someone else's visit returns 404", async ({
    page,
    request,
  }) => {
    const visitId = await aBaiweiVisitId(request);
    const resp = await page.goto(`/visits/${visitId}/edit`);
    expect(resp?.status()).toBe(404);
  });

  test("PUT another user's visit returns 403 and leaves it intact", async ({
    request,
  }) => {
    const visitId = await aBaiweiVisitId(request);
    const res = await request.put(`/api/visits/${visitId}`, { data: VALID_BODY });
    expect(res.status()).toBe(403);
    const check = await request.get(`/api/visits/${visitId}`);
    expect(check.status()).toBe(200);
  });
});
