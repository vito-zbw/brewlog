import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext } from "@playwright/test";

// Phase 6 comments + 👍 reactions on visits/beans/crawls. Default session is
// Baiwei (user1). To stay isolated from the notifications spec, every comment
// and reaction here is on the ACTOR'S OWN content (self-events never fan out a
// notification). Each test creates its own visit and cleans it up; deleting the
// visit cascade-removes its comments/reactions.

const SEED_CAFE_ID = 1; // ".jpg coffee" — has other seed visits, so deleting a
// test visit never orphans it.

interface IdBody {
  data: { id: number };
}

async function createVisit(request: APIRequestContext): Promise<number> {
  const res = await request.post("/api/visits", {
    data: {
      cafe_id: SEED_CAFE_ID,
      visit_date: "2026-06-15",
      brew_method: "V60",
      rating_overall: 5,
      rating_bean_quality: 4,
      rating_barista_skill: 4,
      rating_ambiance: 4,
      notes: `E2E评论测试 ${Date.now()}`,
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as IdBody).data.id;
}

test.describe("comments & reactions", () => {
  test("post and delete own comment on a visit (UI)", async ({
    page,
    request,
  }) => {
    const visitId = await createVisit(request);
    const text = `好喝！${Date.now()}`;

    await page.goto(`/visits/${visitId}`);
    await expect(page.getByTestId("engagement-section")).toBeVisible();

    await page.getByTestId("comment-composer").fill(text);
    await page.getByTestId("comment-submit").click();

    const item = page.getByTestId("comment-item").filter({ hasText: text });
    await expect(item).toHaveCount(1);

    // Delete own comment.
    await item.getByTestId("comment-delete").click();
    await expect(
      page.getByTestId("comment-item").filter({ hasText: text })
    ).toHaveCount(0);

    // cleanup
    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("reaction toggles the like count (API, idempotent add)", async ({
    request,
  }) => {
    const visitId = await createVisit(request);

    const add = await request.post("/api/reactions", {
      data: { resourceType: "visit", resourceId: visitId },
    });
    expect(add.status()).toBe(200);
    const added = (await add.json()) as { data: { count: number; reacted: boolean } };
    expect(added.data.reacted).toBe(true);
    expect(added.data.count).toBe(1);

    // Re-POST is idempotent — still one like.
    const again = await request.post("/api/reactions", {
      data: { resourceType: "visit", resourceId: visitId },
    });
    const re = (await again.json()) as { data: { count: number; reacted: boolean } };
    expect(re.data.count).toBe(1);
    expect(re.data.reacted).toBe(true);

    const remove = await request.delete(
      `/api/reactions?type=visit&id=${visitId}`
    );
    expect(remove.status()).toBe(200);
    const removed = (await remove.json()) as { data: { count: number; reacted: boolean } };
    expect(removed.data.reacted).toBe(false);
    expect(removed.data.count).toBe(0);

    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("reaction button toggles in the UI", async ({ page, request }) => {
    const visitId = await createVisit(request);
    await page.goto(`/visits/${visitId}`);

    const button = page.getByTestId("reaction-button");
    const count = page.getByTestId("reaction-count");
    await expect(count).toHaveText("0");

    await button.click();
    await expect(count).toHaveText("1");
    await expect(button).toHaveAttribute("aria-pressed", "true");

    await button.click();
    await expect(count).toHaveText("0");
    await expect(button).toHaveAttribute("aria-pressed", "false");

    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("comment validation: empty body 400, missing entity 404", async ({
    request,
  }) => {
    const visitId = await createVisit(request);

    const empty = await request.post("/api/comments", {
      data: { resourceType: "visit", resourceId: visitId, body: "   " },
    });
    expect(empty.status()).toBe(400);

    const missing = await request.post("/api/comments", {
      data: { resourceType: "visit", resourceId: 999999, body: "hi" },
    });
    expect(missing.status()).toBe(404);

    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("deleting a visit cascade-removes its comments", async ({ request }) => {
    const visitId = await createVisit(request);

    const post = await request.post("/api/comments", {
      data: { resourceType: "visit", resourceId: visitId, body: "cascade test" },
    });
    expect(post.status()).toBe(201);

    const before = await request.get(`/api/comments?type=visit&id=${visitId}`);
    expect(((await before.json()) as { data: unknown[] }).data.length).toBe(1);

    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);

    const after = await request.get(`/api/comments?type=visit&id=${visitId}`);
    expect(((await after.json()) as { data: unknown[] }).data.length).toBe(0);
  });

  test("non-owner cannot delete another user's comment (403)", async ({
    request,
    browser,
  }) => {
    const visitId = await createVisit(request); // Baiwei's visit

    // Friend2 comments on it (cross-user, so this DOES create a notification
    // for Baiwei — harmless; the notifications spec is count-independent).
    const ctx = await browser.newContext({
      storageState: "playwright/.auth/user2.json",
    });
    const friend2 = ctx.request;
    const created = await friend2.post("/api/comments", {
      data: { resourceType: "visit", resourceId: visitId, body: "friend2 here" },
    });
    expect(created.status()).toBe(201);
    const commentId = ((await created.json()) as IdBody).data.id;

    // Baiwei (the visit owner, but NOT the comment author) cannot delete it.
    const forbidden = await request.delete(`/api/comments/${commentId}`);
    expect(forbidden.status()).toBe(403);

    // The author can.
    expect((await friend2.delete(`/api/comments/${commentId}`)).status()).toBe(
      200
    );
    await ctx.close();

    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test.describe("logged out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("comment + reaction writes require login (401)", async ({ request }) => {
      const c = await request.post("/api/comments", {
        data: { resourceType: "visit", resourceId: 1, body: "hi" },
      });
      expect(c.status()).toBe(401);

      const r = await request.post("/api/reactions", {
        data: { resourceType: "visit", resourceId: 1 },
      });
      expect(r.status()).toBe(401);
    });

    test("visit detail shows login affordances instead of write controls", async ({
      page,
    }) => {
      await page.goto("/visits/1"); // seed visit, public
      await expect(page.getByTestId("engagement-section")).toBeVisible();
      // Reaction is a link to /login; no composer.
      await expect(page.getByTestId("reaction-button")).toHaveAttribute(
        "href",
        "/login"
      );
      await expect(page.getByTestId("comment-login")).toBeVisible();
      await expect(page.getByTestId("comment-composer")).toHaveCount(0);
    });
  });
});
