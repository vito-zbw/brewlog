import { test, expect } from "../../helpers/fixtures";

// Phase 5: site-wide email + password login (third auth method, alongside
// Google/GitHub OAuth and the dev-only dev-login). Open public registration,
// no email verification. Every test here is logged out and creates its own
// uniquely-emailed account so it never collides with the 3 seed users.

test.describe("邮箱密码登录 /login + /register（未登录）", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // A fresh, unique email per call so retries and the serial run never clash.
  let counter = 0;
  function uniqueEmail(): string {
    counter += 1;
    return `pw-${Date.now()}-${counter}@test.brewlog`;
  }

  test("login page shows the email + password form and a register link", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-credentials")).toBeVisible();
    await expect(page.getByTestId("register-link")).toBeVisible();
  });

  test("register page shows name, email, password and confirm fields", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(page.getByTestId("register-name")).toBeVisible();
    await expect(page.getByTestId("register-email")).toBeVisible();
    await expect(page.getByTestId("register-password")).toBeVisible();
    await expect(page.getByTestId("register-confirm")).toBeVisible();
    await expect(page.getByTestId("register-submit")).toBeVisible();
  });

  test("registering a new email signs the user in immediately", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/register");
    await page.getByTestId("register-name").fill("新用户A");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("hunter2pass");
    await page.getByTestId("register-confirm").fill("hunter2pass");
    await page.getByTestId("register-submit").click();

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("nav-profile")).toContainText("新用户A");
  });

  test("a registered user can log out and sign back in with the password", async ({
    page,
  }) => {
    const email = uniqueEmail();
    // Register (auto-signs-in), then log out.
    await page.goto("/register");
    await page.getByTestId("register-name").fill("回访用户");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("correct horse");
    await page.getByTestId("register-confirm").fill("correct horse");
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("nav-profile")).toContainText("回访用户");
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL(/\/login/);

    // Sign in via the email/password form.
    await page.goto("/login");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill("correct horse");
    await page.getByTestId("login-credentials").click();

    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("nav-profile")).toContainText("回访用户");
  });

  test("login honours callbackUrl for password sign-in", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/register");
    await page.getByTestId("register-name").fill("跳转用户");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("redirect-me-1");
    await page.getByTestId("register-confirm").fill("redirect-me-1");
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/login?callbackUrl=/beans");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill("redirect-me-1");
    await page.getByTestId("login-credentials").click();

    await expect(page).toHaveURL("/beans");
    await expect(page.getByTestId("nav-profile")).toContainText("跳转用户");
  });

  test("wrong password shows the generic error and does not sign in", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/register");
    await page.getByTestId("register-name").fill("密码错误用户");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("the-right-one");
    await page.getByTestId("register-confirm").fill("the-right-one");
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await page.getByTestId("nav-logout").click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/login");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill("the-WRONG-one");
    await page.getByTestId("login-credentials").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);
  });

  test("unknown email shows the same generic error (no enumeration)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(uniqueEmail());
    await page.getByTestId("login-password").fill("does-not-matter");
    await page.getByTestId("login-credentials").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);
  });

  test("an OAuth/seed email cannot be claimed via registration", async ({
    page,
  }) => {
    // baiwei@example.com is a seed user with no password set. Registering it
    // must be refused — never set a password on a pre-existing account.
    await page.goto("/register");
    await page.getByTestId("register-name").fill("冒充者");
    await page.getByTestId("register-email").fill("baiwei@example.com");
    await page.getByTestId("register-password").fill("takeover-attempt");
    await page.getByTestId("register-confirm").fill("takeover-attempt");
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);

    // And the seed account is NOT now logged-into-able with that password.
    await page.goto("/login");
    await page.getByTestId("login-email").fill("baiwei@example.com");
    await page.getByTestId("login-password").fill("takeover-attempt");
    await page.getByTestId("login-credentials").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);
  });

  test("registration rejects a too-short password", async ({ page }) => {
    await page.goto("/register");
    await page.getByTestId("register-name").fill("弱密码");
    await page.getByTestId("register-email").fill(uniqueEmail());
    await page.getByTestId("register-password").fill("short");
    await page.getByTestId("register-confirm").fill("short");
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);
  });

  test("registration rejects mismatched password confirmation", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByTestId("register-name").fill("不一致");
    await page.getByTestId("register-email").fill(uniqueEmail());
    await page.getByTestId("register-password").fill("password-one");
    await page.getByTestId("register-confirm").fill("password-two");
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toHaveCount(0);
  });

  test("a password user can reach a login-gated page (provider parity)", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/register");
    await page.getByTestId("register-name").fill("发帖用户");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("log-a-visit-1");
    await page.getByTestId("register-confirm").fill("log-a-visit-1");
    await page.getByTestId("register-submit").click();
    await expect(page.getByTestId("nav-profile")).toBeVisible();

    await page.goto("/log");
    await expect(page).toHaveURL(/\/log$/);
    await expect(page.getByRole("heading", { name: "记录探店" })).toBeVisible();
  });

  test("GET /api/users never leaks password_hash", async ({ request }) => {
    const res = await request.get("/api/users");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: Array<Record<string, unknown>> };
    for (const user of body.data) {
      expect(user).not.toHaveProperty("password_hash");
    }
  });
});
