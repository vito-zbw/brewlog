import type { APIResponse } from "@playwright/test";
import { test, expect } from "../../helpers/fixtures";

// Phase 4 access matrix: the site is PUBLIC-READ. Every viewing page and
// GET API works logged out; login gates user-specific surfaces (/log, /feed,
// crawl authoring), the personal /api/stats, and EVERY non-GET API — the
// proxy answers 401 未登录 before any handler validation runs.
//
// /crawls/[id] and /api/crawls/[id] are also public, but no crawl exists yet
// at this point in the serial run (the seed has none and phase4 specs run
// later), so the crawl detail pages are covered by the phase4 crawl specs.
const PUBLIC_PAGES = [
  "/",
  "/beans",
  "/beans/1",
  "/cafes",
  "/cafes/1",
  "/visits",
  "/visits/1",
  "/users/1",
  "/crawls",
  "/leaderboard",
  "/login",
] as const;

const PROTECTED_PAGES = ["/log", "/feed", "/crawls/new", "/crawls/1/edit"] as const;

const PUBLIC_GET_APIS = [
  "/api/beans",
  "/api/cafes",
  "/api/visits",
  "/api/users",
  "/api/crawls",
  "/api/visits/1",
  "/api/cafes/1",
] as const;

async function expect401(res: APIResponse, label: string): Promise<void> {
  expect(res.status(), label).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error, label).toBe("未登录");
}

test.describe("logged out", () => {
  // Opt out of the default Baiwei session for the whole describe block.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("public pages return 200 without a login redirect", async ({ page }) => {
    for (const path of PUBLIC_PAGES) {
      const response = await page.goto(path);
      expect(response?.status(), `GET ${path}`).toBe(200);
      // Still on the requested page — not bounced to /login?callbackUrl=...
      expect(new URL(page.url()).pathname, `GET ${path}`).toBe(path);
    }
  });

  test("key public pages render their content anonymously", async ({
    page,
  }) => {
    // Dashboard shows the login prompt instead of personal stats; the nav
    // offers login instead of a profile link.
    await page.goto("/");
    await expect(page.getByTestId("dashboard-login-prompt")).toBeVisible();
    await expect(page.getByTestId("nav-login")).toBeVisible();

    await page.goto("/beans");
    await expect(page.getByRole("heading", { name: "咖啡豆库" })).toBeVisible();

    await page.goto("/crawls");
    await expect(page.getByRole("heading", { name: "咖啡之旅" })).toBeVisible();

    await page.goto("/leaderboard");
    await expect(page.getByRole("heading", { name: "排行榜" })).toBeVisible();

    await page.goto("/users/1");
    await expect(page.getByTestId("profile-header")).toBeVisible();

    await page.goto("/visits/1");
    await expect(page.getByTestId("visit-detail")).toBeVisible();
  });

  test("protected pages redirect to /login with a callbackUrl", async ({
    page,
  }) => {
    for (const path of PROTECTED_PAGES) {
      await page.goto(path);
      // The encoded path contains no regex metacharacters (letters, digits, %).
      await expect(page, path).toHaveURL(
        new RegExp(`/login\\?callbackUrl=${encodeURIComponent(path)}`)
      );
    }
  });

  test("public GET APIs return 200 with data", async ({ request }) => {
    for (const path of PUBLIC_GET_APIS) {
      const res = await request.get(path);
      expect(res.status(), `GET ${path}`).toBe(200);
      const body = (await res.json()) as { data: unknown };
      expect(body.data, `GET ${path}`).toBeDefined();
    }
  });

  test("GET /api/stats (personal) returns 401 未登录", async ({ request }) => {
    await expect401(await request.get("/api/stats"), "GET /api/stats");
  });

  test("every non-GET API returns 401 before validation", async ({
    request,
  }) => {
    // Empty/invalid bodies would all be 400s when logged in (e.g. POST
    // /api/beans → 豆名和产地国家为必填项, POST /api/crawls → 请求格式错误,
    // POST /api/photos → missing file) — a 401 proves auth is checked first.
    await expect401(
      await request.post("/api/beans", { data: {} }),
      "POST /api/beans"
    );
    await expect401(
      await request.post("/api/visits", { data: {} }),
      "POST /api/visits"
    );
    await expect401(
      await request.post("/api/crawls", { data: {} }),
      "POST /api/crawls"
    );
    await expect401(
      await request.post("/api/users/3/follow"),
      "POST /api/users/3/follow"
    );
    await expect401(
      await request.delete("/api/photos/1"),
      "DELETE /api/photos/1"
    );
    await expect401(
      await request.post("/api/photos", {
        multipart: { entity_type: "teapot", entity_id: "1" },
      }),
      "POST /api/photos"
    );
  });

  test("anonymous visit detail hides photo upload and delete", async ({
    page,
  }) => {
    await page.goto("/visits/1");
    await expect(page.getByTestId("visit-detail")).toBeVisible();
    await expect(page.getByTestId("photo-upload-input")).toHaveCount(0);
    await expect(page.getByTestId("photo-delete-button")).toHaveCount(0);
  });

  test("anonymous profile hides the follow button", async ({ page }) => {
    await page.goto("/users/3");
    await expect(page.getByTestId("profile-header")).toBeVisible();
    await expect(page.getByTestId("follow-button")).toHaveCount(0);
  });
});

test.describe("logged in (sanity)", () => {
  // Default chromium storage state (Baiwei): the same surfaces that were
  // gated above succeed, proving the failures are auth — not broken routes.
  test("GET /api/stats returns 200 with the session", async ({ request }) => {
    const res = await request.get("/api/stats");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: unknown };
    expect(body.data).toBeDefined();
  });

  test("/log renders the visit form without redirecting", async ({ page }) => {
    await page.goto("/log");
    await expect(page).toHaveURL(/\/log$/);
    await expect(page.getByRole("heading", { name: "记录探店" })).toBeVisible();
  });
});
