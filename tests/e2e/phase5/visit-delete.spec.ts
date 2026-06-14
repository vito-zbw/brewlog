import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext } from "@playwright/test";

// Deleting a visit (owner-only, hard delete). The default storage state is
// Baiwei (user1); the non-owner blocks switch to Friend2 (user2) / logged-out.
// Every test creates its own visit so seed rows stay untouched for other specs.

interface VisitIdBody {
  data: { id: number };
}
interface VisitListBody {
  data: { id: number }[];
}
interface CrawlBody {
  data: { id: number; stops: { id: number }[] };
}

const SEED_CAFE_ID = 1; // ".jpg coffee" from seed.sql

/** Creates a visit owned by the request's identity and returns its id. */
async function createVisit(request: APIRequestContext): Promise<number> {
  const res = await request.post("/api/visits", {
    data: {
      cafe_id: SEED_CAFE_ID,
      visit_date: "2026-06-14",
      brew_method: "V60",
      rating_overall: 5,
      rating_bean_quality: 4,
      rating_barista_skill: 4,
      rating_ambiance: 3,
      notes: `E2E删除测试 ${Date.now()}`,
    },
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

test.describe("删除探店记录 — owner", () => {
  test("owner deletes their visit from the detail page → redirected, gone", async ({
    page,
    request,
  }) => {
    const visitId = await createVisit(request);

    await page.goto(`/visits/${visitId}`);
    await expect(page.getByTestId("visit-detail")).toBeVisible();

    const deleteBtn = page.getByTestId("visit-delete");
    await expect(deleteBtn).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await deleteBtn.click();

    await expect(page).toHaveURL("/visits");

    const check = await request.get(`/api/visits/${visitId}`);
    expect(check.status()).toBe(404);
  });

  test("deleting a middle crawl stop removes it, remaining stops keep order", async ({
    request,
  }) => {
    const v1 = await createVisit(request);
    const v2 = await createVisit(request);
    const v3 = await createVisit(request);

    const crawlRes = await request.post("/api/crawls", {
      data: {
        title: `E2E删除重排 ${Date.now()}`,
        description: "",
        crawl_date: "2026-06-14",
        visit_ids: [v1, v2, v3],
      },
    });
    expect(crawlRes.status()).toBe(201);
    const crawlId = ((await crawlRes.json()) as VisitIdBody).data.id;

    const del = await request.delete(`/api/visits/${v2}`);
    expect(del.status()).toBe(200);

    const after = await request.get(`/api/crawls/${crawlId}`);
    expect(after.status()).toBe(200);
    const crawl = ((await after.json()) as CrawlBody).data;
    expect(crawl.stops.map((s) => s.id)).toEqual([v1, v3]);
  });
});

test.describe("删除探店记录 — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("no delete button on a visit detail page", async ({ page, request }) => {
    const visitId = await aBaiweiVisitId(request);
    await page.goto(`/visits/${visitId}`);
    await expect(page.getByTestId("visit-detail")).toBeVisible();
    await expect(page.getByTestId("visit-delete")).toHaveCount(0);
  });

  test("DELETE /api/visits/[id] returns 401 and leaves the visit intact", async ({
    request,
  }) => {
    const visitId = await aBaiweiVisitId(request);
    const res = await request.delete(`/api/visits/${visitId}`);
    expect(res.status()).toBe(401);
    const check = await request.get(`/api/visits/${visitId}`);
    expect(check.status()).toBe(200);
  });
});

test.describe("删除探店记录 — non-owner (Friend2)", () => {
  test.use({ storageState: "playwright/.auth/user2.json" });

  test("no delete button on someone else's visit", async ({ page, request }) => {
    const visitId = await aBaiweiVisitId(request);
    await page.goto(`/visits/${visitId}`);
    await expect(page.getByTestId("visit-detail")).toBeVisible();
    await expect(page.getByTestId("visit-delete")).toHaveCount(0);
  });

  test("DELETE another user's visit returns 403 and leaves it intact", async ({
    request,
  }) => {
    const visitId = await aBaiweiVisitId(request);
    const res = await request.delete(`/api/visits/${visitId}`);
    expect(res.status()).toBe(403);
    const check = await request.get(`/api/visits/${visitId}`);
    expect(check.status()).toBe(200);
  });
});
