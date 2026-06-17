import { test, expect } from "../../helpers/fixtures";
import type { APIRequestContext, BrowserContext } from "@playwright/test";

// Phase 6 in-app notifications (directed events only: new follower, follow-back,
// comment-on-yours, reaction-on-yours). Default session = Baiwei (user1);
// Friend2 (user3) acts through a second browser context. Every test resets the
// Baiwei↔Friend2 follow edges it touches so the seed invariant (Baiwei follows
// no one, Friend2 has zero follows) is restored for later specs.

const BAIWEI = 1;
const FRIEND2 = 3;
const SEED_CAFE_ID = 1;

interface NotificationRow {
  id: number;
  event_type: string;
  actor_id: number;
  actor_name: string;
  resource_type: string | null;
  resource_id: number | null;
  read_at: string | null;
}
interface IdBody {
  data: { id: number };
}

async function notificationsFor(
  request: APIRequestContext
): Promise<NotificationRow[]> {
  const res = await request.get("/api/notifications");
  expect(res.status()).toBe(200);
  return ((await res.json()) as { data: NotificationRow[] }).data;
}

async function unreadCount(request: APIRequestContext): Promise<number> {
  const res = await request.get("/api/notifications/unread-count");
  expect(res.status()).toBe(200);
  return ((await res.json()) as { data: { count: number } }).data.count;
}

async function friend2Context(
  browser: import("@playwright/test").Browser
): Promise<{ ctx: BrowserContext; request: APIRequestContext }> {
  const ctx = await browser.newContext({
    storageState: "playwright/.auth/user2.json",
  });
  return { ctx, request: ctx.request };
}

/** Restore the seed follow state between Baiwei and Friend2 (both directions). */
async function resetFollows(
  baiwei: APIRequestContext,
  friend2: APIRequestContext
): Promise<void> {
  await baiwei.delete(`/api/users/${FRIEND2}/follow`);
  await friend2.delete(`/api/users/${BAIWEI}/follow`);
}

async function createVisit(request: APIRequestContext): Promise<number> {
  const res = await request.post("/api/visits", {
    data: {
      cafe_id: SEED_CAFE_ID,
      visit_date: "2026-06-16",
      brew_method: "V60",
      rating_overall: 5,
      rating_bean_quality: 5,
      rating_barista_skill: 4,
      rating_ambiance: 4,
      notes: `E2E通知测试 ${Date.now()}`,
    },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as IdBody).data.id;
}

test.describe("notifications", () => {
  test("a new follower notifies the followee", async ({ request, browser }) => {
    const { ctx, request: friend2 } = await friend2Context(browser);
    await resetFollows(request, friend2);

    expect((await friend2.post(`/api/users/${BAIWEI}/follow`)).status()).toBe(
      200
    );

    const notes = await notificationsFor(request); // Baiwei's
    const follow = notes.find(
      (n) => n.event_type === "follow" && n.actor_id === FRIEND2
    );
    expect(follow).toBeTruthy();
    expect(follow?.read_at).toBeNull();
    expect(await unreadCount(request)).toBeGreaterThanOrEqual(1);

    await resetFollows(request, friend2);
    await ctx.close();
  });

  test("a follow-back is labeled follow_back", async ({ request, browser }) => {
    const { ctx, request: friend2 } = await friend2Context(browser);
    await resetFollows(request, friend2);

    // Baiwei follows Friend2 first...
    expect((await request.post(`/api/users/${FRIEND2}/follow`)).status()).toBe(
      200
    );
    // ...then Friend2 follows back → Baiwei (who already follows Friend2) gets
    // a follow_back event.
    expect((await friend2.post(`/api/users/${BAIWEI}/follow`)).status()).toBe(
      200
    );

    const notes = await notificationsFor(request);
    const back = notes.find(
      (n) => n.event_type === "follow_back" && n.actor_id === FRIEND2
    );
    expect(back).toBeTruthy();

    await resetFollows(request, friend2);
    await ctx.close();
  });

  test("comment and reaction on your content notify you", async ({
    request,
    browser,
  }) => {
    const visitId = await createVisit(request); // Baiwei's visit
    const { ctx, request: friend2 } = await friend2Context(browser);

    expect(
      (
        await friend2.post("/api/comments", {
          data: { resourceType: "visit", resourceId: visitId, body: "好喝!" },
        })
      ).status()
    ).toBe(201);
    expect(
      (
        await friend2.post("/api/reactions", {
          data: { resourceType: "visit", resourceId: visitId },
        })
      ).status()
    ).toBe(200);

    const notes = await notificationsFor(request);
    const forVisit = notes.filter(
      (n) => n.resource_type === "visit" && n.resource_id === visitId
    );
    expect(
      forVisit.some(
        (n) => n.event_type === "comment" && n.actor_id === FRIEND2
      )
    ).toBe(true);
    expect(
      forVisit.some(
        (n) => n.event_type === "reaction" && n.actor_id === FRIEND2
      )
    ).toBe(true);

    await ctx.close();
    // Deleting the visit cascade-removes its comments/reactions/notifications.
    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("un-reacting retracts its notification (so a re-like can re-notify)", async ({
    request,
    browser,
  }) => {
    const visitId = await createVisit(request); // Baiwei's visit
    const { ctx, request: friend2 } = await friend2Context(browser);

    expect(
      (
        await friend2.post("/api/reactions", {
          data: { resourceType: "visit", resourceId: visitId },
        })
      ).status()
    ).toBe(200);
    expect(
      (await notificationsFor(request)).some(
        (n) => n.event_type === "reaction" && n.resource_id === visitId
      )
    ).toBe(true);

    expect(
      (await friend2.delete(`/api/reactions?type=visit&id=${visitId}`)).status()
    ).toBe(200);
    expect(
      (await notificationsFor(request)).some(
        (n) => n.event_type === "reaction" && n.resource_id === visitId
      )
    ).toBe(false);

    await ctx.close();
    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("acting on your own content never notifies yourself", async ({
    request,
  }) => {
    const visitId = await createVisit(request);

    await request.post("/api/comments", {
      data: { resourceType: "visit", resourceId: visitId, body: "自评" },
    });
    await request.post("/api/reactions", {
      data: { resourceType: "visit", resourceId: visitId },
    });

    const notes = await notificationsFor(request);
    expect(
      notes.some((n) => n.resource_type === "visit" && n.resource_id === visitId)
    ).toBe(false);

    expect((await request.delete(`/api/visits/${visitId}`)).status()).toBe(200);
  });

  test("viewing /notifications marks all read and clears the nav badge", async ({
    page,
    request,
    browser,
  }) => {
    const { ctx, request: friend2 } = await friend2Context(browser);
    await resetFollows(request, friend2);
    // Create an unread notification for Baiwei.
    expect((await friend2.post(`/api/users/${BAIWEI}/follow`)).status()).toBe(
      200
    );

    // The badge is server-rendered, so it shows after a navigation.
    await page.goto("/visits");
    await expect(page.getByTestId("notification-badge")).toBeVisible();

    // Viewing the page marks everything read.
    await page.goto("/notifications");
    await expect(page.getByTestId("notification-item").first()).toBeVisible();

    // After marking read, the badge is gone on the next render.
    await page.goto("/visits");
    await expect(page.getByTestId("notification-badge")).toHaveCount(0);
    expect(await unreadCount(request)).toBe(0);

    await resetFollows(request, friend2);
    await ctx.close();
  });

  test.describe("logged out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("notification endpoints require login (401)", async ({ request }) => {
      expect((await request.get("/api/notifications")).status()).toBe(401);
      expect(
        (await request.get("/api/notifications/unread-count")).status()
      ).toBe(401);
      expect((await request.post("/api/notifications/read")).status()).toBe(401);
    });
  });
});
