import { test, expect } from "../../helpers/fixtures";

// User profile pages (/users/[id]) added in Phase 3. Default auth = Baiwei
// (user id 1). Friend2 (user id 3) is never mutated by other specs, so their
// profile can be asserted with EXACT numbers: 2 visits (.jpg coffee Espresso
// rated 4 + %Arabica 深业上城店 Espresso rated 4), 2 cafés, 2 distinct beans
// (Brazil Cerrado + Mandheling), each bean logged once.
test.describe("phase3 user profiles", () => {
  test("nav-profile links to own profile with header and numeric stats", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByTestId("nav-profile").click();

    await expect(page).toHaveURL(/\/users\/1$/);
    await expect(page.getByTestId("profile-header")).toContainText("Baiwei");

    // Baiwei's counts grow as mutation specs run, so assert shape not value.
    await expect(page.getByTestId("profile-stat-beans")).toHaveText(/^\d+$/);
    await expect(page.getByTestId("profile-stat-cafes")).toHaveText(/^\d+$/);
    await expect(page.getByTestId("profile-stat-visits")).toHaveText(/^\d+$/);
  });

  test("Friend2's profile shows exact seed stats and attributed visit cards", async ({
    page,
  }) => {
    await page.goto("/users/3");

    await expect(page.getByTestId("profile-header")).toContainText("Friend2");
    await expect(page.getByTestId("profile-stat-visits")).toHaveText("2");
    await expect(page.getByTestId("profile-stat-cafes")).toHaveText("2");
    await expect(page.getByTestId("profile-stat-beans")).toHaveText("2");

    const cards = page.getByTestId("visit-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("Friend2 记录");
    await expect(cards.nth(1)).toContainText("Friend2 记录");
  });

  test("Friend2's favorite beans list names with 次记录 counts", async ({
    page,
  }) => {
    await page.goto("/users/3");

    const favoriteBeans = page.getByTestId("favorite-beans");
    await expect(favoriteBeans).toBeVisible();

    const items = favoriteBeans.locator("li");
    await expect(items).toHaveCount(2);
    await expect(favoriteBeans).toContainText("巴西塞拉多日晒 Brazil Cerrado");
    await expect(favoriteBeans).toContainText("苏门答腊曼特宁 Mandheling");
    // Friend2 logged each bean in exactly one seed visit.
    await expect(items.nth(0)).toContainText("1 次记录");
    await expect(items.nth(1)).toContainText("1 次记录");
  });

  test("unknown user id renders the 404 page", async ({ page }) => {
    const response = await page.goto("/users/999999");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "页面不存在" })
    ).toBeVisible();
  });

  test("visit card attribution link navigates to the author's profile", async ({
    page,
  }) => {
    await page.goto("/visits");

    const firstCard = page.getByTestId("visit-card").first();
    // The attribution link is the only /users/… link inside a visit card
    // (café links to /visits/…, bean chips link to /beans/…).
    const attribution = firstCard.locator('a[href^="/users/"]');
    await expect(attribution).toBeVisible();
    await expect(attribution).toContainText("记录");

    const label = (await attribution.innerText()).trim();
    const authorName = label.replace(/\s*记录$/, "");
    expect(authorName.length).toBeGreaterThan(0);

    await attribution.click();

    await expect(page).toHaveURL(/\/users\/\d+$/);
    await expect(page.getByTestId("profile-header")).toContainText(authorName);
  });
});
