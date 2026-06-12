import { test, expect } from "../../helpers/fixtures";

// Phase 4 follow + feed flow, run as one serial story (follow → feed →
// API guards → unfollow). The final unfollow IS the cleanup, so later specs
// in the run see zero follow relationships. Friend2 (user 3) has exactly
// 2 seed visits that no other spec mutates — safe for exact counts.
//
// Default session: Baiwei (user 1) on both `page` and `request`.
test.describe.configure({ mode: "serial" });

const FRIEND2_ID = 3;
const FRIEND2_PROFILE = `/users/${FRIEND2_ID}`;
const FRIEND2_VISIT_COUNT = 2;

test.describe("follows and activity feed", () => {
  test("Baiwei follows Friend2 from her profile", async ({
    page,
    request,
  }) => {
    // Defensive reset: on a serial-mode retry the whole block reruns, and a
    // stale follow from the first attempt would break the "not yet
    // following" assertions below. DELETE is idempotent.
    const reset = await request.delete(`/api/users/${FRIEND2_ID}/follow`);
    expect(reset.ok()).toBe(true);

    await page.goto(FRIEND2_PROFILE);

    // No seed follows exist, so Friend2 starts at zero on both sides.
    const counts = page.getByTestId("follow-counts");
    await expect(counts).toHaveText("0 关注 · 0 粉丝");

    // Exact match: "已关注" would also pass a containment check for "关注".
    const followButton = page.getByTestId("follow-button");
    await expect(followButton).toHaveText("关注");

    await followButton.click();

    // Button flips optimistically; the counts update via router.refresh().
    await expect(followButton).toContainText("已关注");
    await expect(counts).toHaveText("0 关注 · 1 粉丝");
  });

  test("feed shows exactly Friend2's visits and nothing else", async ({
    page,
  }) => {
    await page.goto("/feed");

    const cards = page.getByTestId("visit-card");
    await expect(cards).toHaveCount(FRIEND2_VISIT_COUNT);
    // Every card is Friend2's — same count after filtering proves no card
    // from any other (unfollowed) user leaked in.
    await expect(cards.filter({ hasText: "Friend2 记录" })).toHaveCount(
      FRIEND2_VISIT_COUNT
    );
    // Her two seed visits are at these cafés.
    await expect(cards.filter({ hasText: ".jpg coffee" })).toHaveCount(1);
    await expect(
      cards.filter({ hasText: "%Arabica 深业上城店" })
    ).toHaveCount(1);
    await expect(page.getByTestId("feed-empty")).toHaveCount(0);
  });

  test("follow API rejects self-follow and unknown users", async ({
    request,
  }) => {
    const selfRes = await request.post("/api/users/1/follow");
    expect(selfRes.status()).toBe(400);
    const selfBody = (await selfRes.json()) as { error: string };
    expect(selfBody.error).toBe("不能关注自己");

    const missingRes = await request.post("/api/users/999999/follow");
    expect(missingRes.status()).toBe(404);
    const missingBody = (await missingRes.json()) as { error: string };
    expect(missingBody.error).toBe("未找到该用户");
  });

  test("unfollow restores the clean slate and empties the feed", async ({
    page,
  }) => {
    await page.goto(FRIEND2_PROFILE);

    const followButton = page.getByTestId("follow-button");
    await expect(followButton).toContainText("已关注");

    await followButton.click();

    await expect(followButton).toHaveText("关注");
    await expect(page.getByTestId("follow-counts")).toHaveText(
      "0 关注 · 0 粉丝"
    );

    // With no follows left the feed is empty again.
    await page.goto("/feed");
    await expect(page.getByTestId("feed-empty")).toBeVisible();
    await expect(page.getByTestId("visit-card")).toHaveCount(0);
  });
});
