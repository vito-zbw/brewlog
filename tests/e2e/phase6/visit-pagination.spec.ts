import { test, expect } from "../../helpers/fixtures";
import { SEED } from "../../helpers/seed";

// Phase 6 keyset pagination for /api/visits, /api/feed, and the /visits page.
// Written to be count-INDEPENDENT: other specs create visits before this one
// runs, so the total may or may not exceed the page size. Every assertion
// holds whether the data fits one page or spans many.

const PAGE_SIZE = 20; // mirrors DEFAULT_PAGE_SIZE in src/lib/queries/visits.ts

interface VisitRow {
  id: number;
  visit_date: string;
}
interface VisitsResponse {
  data: VisitRow[];
  nextCursor: string | null;
}

// Mirrors encodeCursor() in src/lib/cursor.ts (opaque base64url of {d,i}).
function makeCursor(visitDate: string, id: number): string {
  return Buffer.from(JSON.stringify({ d: visitDate, i: id }), "utf8").toString(
    "base64url"
  );
}

// True when `a` sorts strictly before `b` under the unified order
// (visit_date DESC, id DESC). visit_date is ISO YYYY-MM-DD → string compare.
function strictlyBefore(a: VisitRow, b: VisitRow): boolean {
  return a.visit_date > b.visit_date || (a.visit_date === b.visit_date && a.id > b.id);
}

test.describe("Phase 6 visit pagination", () => {
  test("GET /api/visits returns a bounded cursor page, ordered by visit_date then id", async ({
    request,
  }) => {
    const res = await request.get("/api/visits");
    expect(res.status()).toBe(200);

    const body = (await res.json()) as VisitsResponse;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(
      Math.min(SEED.visitCount, PAGE_SIZE)
    );
    // The core growth fix: a page is bounded, never the whole table.
    expect(body.data.length).toBeLessThanOrEqual(PAGE_SIZE);
    // Cursor envelope present (string when more pages exist, else null).
    expect(body).toHaveProperty("nextCursor");

    for (let i = 0; i < body.data.length - 1; i++) {
      expect(strictlyBefore(body.data[i], body.data[i + 1])).toBe(true);
    }
  });

  test("keyset cursor returns exactly the visits older than the cursor, in order", async ({
    request,
  }) => {
    const p1 = (await (await request.get("/api/visits")).json()) as VisitsResponse;
    expect(p1.data.length).toBeGreaterThanOrEqual(2);

    // Pivot mid-page; the cursor page must continue precisely after it.
    const k = Math.floor(p1.data.length / 2);
    const pivot = p1.data[k];
    const cursor = makeCursor(pivot.visit_date, pivot.id);

    const res = await request.get(`/api/visits?cursor=${cursor}`);
    expect(res.status()).toBe(200);
    const cp = (await res.json()) as VisitsResponse;

    // The cursor page begins with exactly the remainder of page one after the
    // pivot — same ids, same order (proves the `<` predicate + ORDER BY).
    const tail = p1.data.slice(k + 1).map((v) => v.id);
    expect(cp.data.slice(0, tail.length).map((v) => v.id)).toEqual(tail);

    // No row at or before the pivot leaks into the cursor page.
    const seenBefore = new Set(p1.data.slice(0, k + 1).map((v) => v.id));
    for (const v of cp.data) expect(seenBefore.has(v.id)).toBe(false);
    // Everything returned is strictly older than the pivot.
    for (const v of cp.data) expect(strictlyBefore(pivot, v)).toBe(true);
  });

  test("malformed cursor falls back to page one and never 500s", async ({
    request,
  }) => {
    const first = (await (await request.get("/api/visits")).json()) as VisitsResponse;

    const res = await request.get("/api/visits?cursor=not-a-real-cursor%21");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as VisitsResponse;
    // Identical to the no-cursor first page.
    expect(body.data.map((v) => v.id)).toEqual(first.data.map((v) => v.id));
  });

  test("/visits renders a bounded first page and 加载更多 appends older visits", async ({
    page,
  }) => {
    await page.goto("/visits");
    await expect(page.getByTestId("visit-card").first()).toBeVisible();

    const initial = await page.getByTestId("visit-card").count();
    expect(initial).toBeLessThanOrEqual(PAGE_SIZE);

    const loadMore = page.getByTestId("load-more");
    if ((await loadMore.count()) > 0) {
      await loadMore.click();
      await expect
        .poll(() => page.getByTestId("visit-card").count())
        .toBeGreaterThan(initial);
    }
  });

  test("GET /api/feed is a cursor envelope for the logged-in user", async ({
    request,
  }) => {
    const res = await request.get("/api/feed");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as VisitsResponse;
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(PAGE_SIZE);
    expect(body).toHaveProperty("nextCursor");
  });

  test.describe("logged out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("GET /api/feed requires login (401)", async ({ request }) => {
      const res = await request.get("/api/feed");
      expect(res.status()).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("未登录");
    });

    test("GET /api/visits stays public", async ({ request }) => {
      const res = await request.get("/api/visits");
      expect(res.status()).toBe(200);
      const body = (await res.json()) as VisitsResponse;
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
