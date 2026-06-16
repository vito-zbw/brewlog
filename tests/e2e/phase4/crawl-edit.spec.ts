import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext } from "@playwright/test";

// Crawl edit & delete (owner-only) — brings crawls to parity with the bean
// (phase5/bean-crud) and visit (phase5/visit-edit + visit-delete) CRUD specs.
// The detail page's 编辑 link opens /crawls/[id]/edit (CrawlForm prefilled with
// the crawl's initial values), which saves via PUT and hosts the delete button.
// Default storage state is Baiwei (user1); the non-owner / logged-out blocks
// switch identity. Each owner test builds its own crawl from Baiwei's own
// visits and deletes it again, so nothing depends on crawl.spec ordering or
// leaves residue for other specs. The seed crawl (id 1, owned by Friend1) is
// the fixture for the non-owner / logged-out gating checks (never mutated).

const FRIEND1_CRAWL_ID = 1; // seed.sql crawl id 1, owned by Friend1 (user 2)
const BAIWEI_ID = 1;
const FRIEND2_ID = 3;

interface IdBody {
  data: { id: number };
}
interface VisitListBody {
  data: { id: number }[];
}
interface CrawlDetailBody {
  data: { id: number; title: string; stops: { id: number }[] };
}

/** The newest `n` visit ids owned by the given user (public GET). */
async function visitIdsOf(
  request: APIRequestContext,
  userId: number,
  n: number
): Promise<number[]> {
  const res = await request.get(`/api/visits?user_id=${userId}&limit=${n}`);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as VisitListBody;
  expect(body.data.length).toBeGreaterThanOrEqual(n);
  return body.data.slice(0, n).map((v) => v.id);
}

/** Creates a crawl owned by the request identity (Baiwei) from its own visits. */
async function createOwnCrawl(request: APIRequestContext): Promise<number> {
  const visitIds = await visitIdsOf(request, BAIWEI_ID, 2);
  const res = await request.post("/api/crawls", {
    data: {
      title: `E2E编辑之旅 ${Date.now()}`,
      crawl_date: "2026-06-14",
      visit_ids: visitIds,
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as IdBody).data.id;
}

test.describe("编辑/删除咖啡之旅 — owner (Baiwei)", () => {
  test("owner edits a crawl's title via the edit page → persists on detail", async ({
    page,
    request,
  }) => {
    const crawlId = await createOwnCrawl(request);
    const newTitle = `已编辑之旅 ${Date.now()}`;

    // Reach the edit form via the detail-page 编辑 link.
    await page.goto(`/crawls/${crawlId}`);
    await page.getByTestId("crawl-edit-link").click();
    await expect(page).toHaveURL(`/crawls/${crawlId}/edit`);

    // CrawlForm renders prefilled (initial values are server-rendered).
    const titleInput = page.getByTestId("crawl-title");
    await expect(titleInput).not.toHaveValue("");
    await titleInput.fill(newTitle);
    await page.getByTestId("crawl-submit").click();

    // Edit redirects back to the detail page (mirrors the visit edit flow).
    await expect(page).toHaveURL(`/crawls/${crawlId}`);
    await expect(page.getByTestId("crawl-detail")).toContainText(newTitle);

    const after = await request.get(`/api/crawls/${crawlId}`);
    expect(((await after.json()) as CrawlDetailBody).data.title).toBe(newTitle);

    await request.delete(`/api/crawls/${crawlId}`); // cleanup
  });

  test("owner deletes their crawl → GET 404", async ({ request }) => {
    const crawlId = await createOwnCrawl(request);
    const del = await request.delete(`/api/crawls/${crawlId}`);
    expect(del.status()).toBe(200);
    const after = await request.get(`/api/crawls/${crawlId}`);
    expect(after.status()).toBe(404);
  });

  test("PUT with another user's visit ids → 400, crawl unchanged", async ({
    request,
  }) => {
    const crawlId = await createOwnCrawl(request);
    const [friend2Visit] = await visitIdsOf(request, FRIEND2_ID, 1);
    const res = await request.put(`/api/crawls/${crawlId}`, {
      data: {
        title: "越权改",
        crawl_date: "2026-06-14",
        visit_ids: [friend2Visit],
      },
    });
    expect(res.status()).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toBe(
      "只能选择自己的探店记录"
    );
    await request.delete(`/api/crawls/${crawlId}`); // cleanup
  });
});

test.describe("编辑/删除咖啡之旅 — non-owner (Friend2)", () => {
  test.use({ storageState: "playwright/.auth/user2.json" });

  test("edit page for someone else's crawl returns 404", async ({ page }) => {
    const resp = await page.goto(`/crawls/${FRIEND1_CRAWL_ID}/edit`);
    expect(resp?.status()).toBe(404);
  });

  test("PUT another user's crawl returns 403 and leaves it intact", async ({
    request,
  }) => {
    const res = await request.put(`/api/crawls/${FRIEND1_CRAWL_ID}`, {
      data: {},
    });
    expect(res.status()).toBe(403);
    expect((await request.get(`/api/crawls/${FRIEND1_CRAWL_ID}`)).status()).toBe(
      200
    );
  });

  test("DELETE another user's crawl returns 403 and leaves it intact", async ({
    request,
  }) => {
    const res = await request.delete(`/api/crawls/${FRIEND1_CRAWL_ID}`);
    expect(res.status()).toBe(403);
    expect((await request.get(`/api/crawls/${FRIEND1_CRAWL_ID}`)).status()).toBe(
      200
    );
  });
});

test.describe("编辑/删除咖啡之旅 — logged out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("PUT /api/crawls/[id] returns 401 and leaves the crawl intact", async ({
    request,
  }) => {
    const res = await request.put(`/api/crawls/${FRIEND1_CRAWL_ID}`, {
      data: {},
    });
    expect(res.status()).toBe(401);
    expect((await request.get(`/api/crawls/${FRIEND1_CRAWL_ID}`)).status()).toBe(
      200
    );
  });

  test("DELETE /api/crawls/[id] returns 401 and leaves the crawl intact", async ({
    request,
  }) => {
    const res = await request.delete(`/api/crawls/${FRIEND1_CRAWL_ID}`);
    expect(res.status()).toBe(401);
    expect((await request.get(`/api/crawls/${FRIEND1_CRAWL_ID}`)).status()).toBe(
      200
    );
  });
});
