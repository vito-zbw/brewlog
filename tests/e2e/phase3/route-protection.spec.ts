import { test, expect } from "../../helpers/fixtures";

// Phase 3 route protection: logged out, every page redirects to /login and
// every API answers 401 — pages via the proxy, write handlers also via
// requireUserId() (defense in depth). The 401 must arrive BEFORE any
// validation error, so deliberately invalid bodies are sent below.
const PROTECTED_PAGES = [
  "/",
  "/beans",
  "/cafes",
  "/visits",
  "/log",
  "/users/1",
] as const;

const PROTECTED_GET_APIS = [
  "/api/beans",
  "/api/cafes",
  "/api/visits",
  "/api/stats",
  "/api/users",
] as const;

test.describe("logged out", () => {
  // Opt out of the default Baiwei session for the whole describe block.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("protected pages redirect to /login with a callbackUrl", async ({
    page,
  }) => {
    for (const path of PROTECTED_PAGES) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    }
  });

  test("/login renders without redirecting", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "登录 BrewLog" })
    ).toBeVisible();
    await expect(page.getByTestId("dev-login-Baiwei")).toBeVisible();
  });

  test("GET APIs return 401 未登录", async ({ request }) => {
    for (const path of PROTECTED_GET_APIS) {
      const res = await request.get(path);
      expect(res.status(), `GET ${path}`).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error, `GET ${path}`).toBe("未登录");
    }
  });

  test("POST /api/beans returns 401 before validation", async ({
    request,
  }) => {
    // Empty body would be a 400 (豆名和产地国家为必填项) when logged in —
    // a 401 proves auth is checked first.
    const res = await request.post("/api/beans", { data: {} });
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("未登录");
  });

  test("POST /api/visits returns 401 before validation", async ({
    request,
  }) => {
    const res = await request.post("/api/visits", { data: {} });
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("未登录");
  });

  test("POST /api/photos returns 401 before validation", async ({
    request,
  }) => {
    // No file and an invalid entity_type — both would be 400s when logged in.
    const res = await request.post("/api/photos", {
      multipart: { entity_type: "teapot", entity_id: "1" },
    });
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("未登录");
  });

  test("DELETE /api/photos/[id] returns 401", async ({ request }) => {
    const res = await request.delete("/api/photos/1");
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("未登录");
  });
});

test.describe("logged in (sanity)", () => {
  // Default chromium storage state (Baiwei): the same endpoint that 401'd
  // above succeeds, proving the failures are auth — not a broken route.
  test("GET /api/beans returns 200 with the session", async ({ request }) => {
    const res = await request.get("/api/beans");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});
