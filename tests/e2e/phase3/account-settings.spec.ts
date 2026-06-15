import fs from "node:fs";
import path from "node:path";
import { test, expect } from "../../helpers/fixtures";

// Local-disk backend (no R2_* env in tests): a stored avatar URL is
// /api/uploads/<key> and the file lives at data/uploads/<key> under the shared
// project cwd, so the test worker can stat the same file the server wrote.
const uploadPath = (image: string) =>
  path.join(process.cwd(), "data", "uploads", image.replace("/api/uploads/", ""));

async function uploadAvatar(
  request: import("@playwright/test").APIRequestContext
): Promise<string> {
  const res = await request.post("/api/users/1/avatar", {
    multipart: {
      file: {
        name: "avatar.jpg",
        mimeType: "image/jpeg",
        buffer: fs.readFileSync("tests/fixtures/test-photo.jpg"),
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  const { data } = await res.json();
  return uploadPath(data.image);
}

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

  test("own profile shows a settings gear linking to /settings", async ({
    page,
  }) => {
    await page.goto("/users/1");
    const gear = page.getByTestId("profile-settings-link");
    await expect(gear).toBeVisible();
    await gear.click();
    await expect(page).toHaveURL("/settings");
  });

  test("another user's profile shows no settings gear", async ({ page }) => {
    await page.goto("/users/2");
    await expect(page.getByTestId("profile-settings-link")).toHaveCount(0);
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

  test("removing a custom avatar deletes its stored file", async ({
    request,
  }) => {
    const filePath = await uploadAvatar(request);
    expect(fs.existsSync(filePath)).toBe(true);

    await request.delete("/api/users/1/avatar");
    expect(fs.existsSync(filePath)).toBe(false);
  });

  test("replacing a custom avatar deletes the previous file", async ({
    request,
  }) => {
    const first = await uploadAvatar(request);
    expect(fs.existsSync(first)).toBe(true);

    const second = await uploadAvatar(request);
    expect(second).not.toBe(first);
    expect(fs.existsSync(second)).toBe(true);
    expect(fs.existsSync(first)).toBe(false);
  });

  test("removing an avatar when none is set is a safe no-op", async ({
    request,
  }) => {
    // A fresh/OAuth user has no custom upload to purge (image is null or a
    // provider URL). setAvatar must short-circuit, not throw — and unlike the
    // afterEach hook, this asserts the response is actually ok (the route's
    // catch returns 500 rather than re-throwing, so a silent DELETE wouldn't
    // be caught otherwise).
    const res = await request.delete("/api/users/1/avatar");
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.image).toBeNull();
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
