import { test, expect } from "../../helpers/fixtures";

// Default session: Baiwei (user 1). Seed: Friend1 (user 2) follows Baiwei
// (follows row (2,1)); nobody mutates that seed row, and Baiwei follows no one
// in seed. Runs after follow-feed.spec.ts (alphabetical; workers:1, serial),
// so the transient follow created here cannot affect follow-feed's assertions.
const BAIWEI_ID = 1;
const FRIEND1_ID = 2;
const FRIEND2_ID = 3;

test.describe("following / followers lists", () => {
  test("followers modal lists a non-mutual follower with a 回关 button", async ({
    page,
  }) => {
    await page.goto(`/users/${BAIWEI_ID}`);
    await page.getByTestId("open-followers").click();

    const modal = page.getByTestId("follow-list-modal");
    await expect(modal).toBeVisible();

    const friend1Row = modal
      .getByTestId("follow-list-row")
      .filter({ hasText: "Friend1" });
    await expect(friend1Row).toHaveCount(1);
    // Baiwei doesn't follow Friend1 back → follow-back button, no mutual badge.
    await expect(friend1Row.getByTestId("follow-button")).toHaveText("回关");
    await expect(modal).not.toContainText("互相关注");

    await page.getByTestId("follow-list-close").click();
    await expect(modal).toBeHidden();
  });

  test("following modal shows a mutual follow with a 关注了你 badge", async ({
    page,
    request,
  }) => {
    // Defensive reset so a serial retry starts clean.
    await request.delete(`/api/users/${FRIEND1_ID}/follow`);
    // Baiwei follows Friend1; Friend1 already follows Baiwei (seed) → mutual.
    const res = await request.post(`/api/users/${FRIEND1_ID}/follow`);
    expect(res.ok()).toBe(true);

    try {
      await page.goto(`/users/${BAIWEI_ID}`);
      await page.getByTestId("open-following").click();

      const row = page
        .getByTestId("follow-list-modal")
        .getByTestId("follow-list-row")
        .filter({ hasText: "Friend1" });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("关注了你");
      await expect(row.getByTestId("follow-button")).toContainText("已关注");
    } finally {
      // Restore the clean slate regardless of assertion outcome.
      await request.delete(`/api/users/${FRIEND1_ID}/follow`);
    }
  });

  test("counts are not clickable on someone else's profile", async ({
    page,
  }) => {
    await page.goto(`/users/${FRIEND2_ID}`);
    await expect(page.getByTestId("follow-counts")).toBeVisible();
    await expect(page.getByTestId("open-followers")).toHaveCount(0);
    await expect(page.getByTestId("open-following")).toHaveCount(0);
  });

  test("followers API is owner-gated", async ({ request }) => {
    // Defensive cleanup: the "following modal" test may leave a stale follow
    // if its finally-block cleanup is interrupted by the test timeout (the
    // request context closes before the finally runs). Remove it here so the
    // isMutual assertion below reflects the seed state (Friend1 follows Baiwei
    // only; not mutual).
    await request.delete(`/api/users/${FRIEND1_ID}/follow`);

    const own = await request.get(`/api/users/${BAIWEI_ID}/followers`);
    expect(own.ok()).toBe(true);
    const body = (await own.json()) as {
      data: { id: number; name: string; isMutual: boolean }[];
    };
    const friend1 = body.data.find((u) => u.id === FRIEND1_ID);
    expect(friend1).toBeDefined();
    expect(friend1?.isMutual).toBe(false);

    // Another user's list is private.
    const other = await request.get(`/api/users/${FRIEND2_ID}/followers`);
    expect(other.status()).toBe(403);
  });
});

test.describe("follow lists require login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("list API returns 401 when logged out", async ({ request }) => {
    const res = await request.get(`/api/users/${BAIWEI_ID}/followers`);
    expect(res.status()).toBe(401);
  });
});
