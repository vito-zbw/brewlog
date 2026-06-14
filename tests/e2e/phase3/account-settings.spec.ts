import { test, expect } from "../../helpers/fixtures";

// Account settings: rename (unique), avatar upload/remove, account info, route
// protection. Runs as Baiwei (user1, id 1) by default. The shared test DB
// resets once per run and specs run serially, so the afterEach safety net
// restores Baiwei's seeded identity even if a test fails midway.

test.describe("账号设置 /settings", () => {
  test.afterEach(async ({ request }) => {
    await request.patch("/api/users/1", { data: { name: "Baiwei" } });
    await request.delete("/api/users/1/avatar");
  });

  test("shows current name and account info", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-name")).toHaveValue("Baiwei");
    await expect(page.getByTestId("account-info")).toContainText(
      "baiwei@example.com"
    );
  });

  test("renames the user and reflects it in the nav", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("settings-name").fill("Baiwei临时");
    await page.getByTestId("settings-submit").click();
    await expect(page.getByTestId("settings-success")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toContainText("Baiwei临时");
  });

  test("rejects a name already taken by another user", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("settings-name").fill("Friend1");
    await page.getByTestId("settings-submit").click();
    await expect(page.getByTestId("settings-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toContainText("Baiwei");
  });

  test("rejects a too-short name client-side", async ({ page }) => {
    await page.goto("/settings");
    await page.getByTestId("settings-name").fill("a");
    await page.getByTestId("settings-submit").click();
    await expect(page.getByTestId("settings-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toContainText("Baiwei");
  });

  test("uploads and removes an avatar", async ({ page }) => {
    await page.goto("/settings");
    await page
      .getByTestId("avatar-input")
      .setInputFiles("tests/fixtures/test-photo.jpg");
    await expect(page.getByTestId("avatar-remove")).toBeVisible();
    await expect(
      page.locator('[data-testid="avatar-preview"]')
    ).toHaveJSProperty("tagName", "IMG");

    await page.getByTestId("avatar-remove").click();
    await expect(page.getByTestId("avatar-remove")).toHaveCount(0);
  });

  test("redirects logged-out visitors to login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("注册：昵称唯一性（未登录）", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("registration rejects a name already taken by a seed user", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByTestId("register-name").fill("Baiwei");
    await page
      .getByTestId("register-email")
      .fill(`pw-dup-${Date.now()}@test.brewlog`);
    await page.getByTestId("register-password").fill("hunter2pass");
    await page.getByTestId("register-confirm").fill("hunter2pass");
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);
  });
});
