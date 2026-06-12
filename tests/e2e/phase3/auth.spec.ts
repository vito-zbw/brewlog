import { test, expect } from "../../helpers/fixtures";

// Phase 3 auth flows. Each test gets its own browser context, so logging in
// inside a logged-out test (or logging out below) never leaks across tests.

test.describe("登录页 /login（未登录）", () => {
  // Opt out of the default Baiwei session for this whole describe.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders the login card with dev quick-login and no OAuth buttons", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { level: 1, name: "登录 BrewLog" })
    ).toBeVisible();

    // Dev quick-login: one button per seed user.
    await expect(page.getByTestId("dev-login-Baiwei")).toBeVisible();
    await expect(page.getByTestId("dev-login-Friend1")).toBeVisible();
    await expect(page.getByTestId("dev-login-Friend2")).toBeVisible();

    // AUTH_GOOGLE_ID / AUTH_GITHUB_ID are not set in the test env, so the
    // OAuth buttons must be absent entirely.
    await expect(page.getByTestId("login-google")).toHaveCount(0);
    await expect(page.getByTestId("login-github")).toHaveCount(0);
  });

  test("dev quick-login as Friend1 signs in and lands on the dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("dev-login-Friend1").click();

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toContainText("Friend1");
  });

  test("login honours callbackUrl and lands on /beans", async ({ page }) => {
    await page.goto("/login?callbackUrl=/beans");
    await page.getByTestId("dev-login-Baiwei").click();

    await expect(page).toHaveURL("/beans");
    await expect(page.getByTestId("nav-profile")).toContainText("Baiwei");
  });
});

test.describe("退出登录", () => {
  // Default storage state: logged in as Baiwei.
  test("logout returns to /login; / is public, /log stays locked", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("nav-profile")).toContainText("Baiwei");

    await page.getByTestId("nav-logout").click();

    // signOut redirects to /login; the nav now shows the login link.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("nav-login")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);

    // Phase 4: the dashboard is public-read. Logged out, / loads but shows
    // the login prompt instead of personal stats.
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("dashboard-login-prompt")).toBeVisible();
    await expect(page.getByTestId("nav-login")).toBeVisible();

    // Protected pages still bounce to /login.
    await page.goto("/log");
    await expect(page).toHaveURL(/\/login/);
  });
});
