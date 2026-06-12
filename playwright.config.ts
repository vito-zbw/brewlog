import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// Tests run against the production build (`next start`) on a dedicated port,
// with their own throwaway database. Reset happens in the npm script
// (`db:init:test`) BEFORE Playwright boots the server — never while the
// server holds the file handle.
//
// Auth: the `setup` project logs in via the dev-login provider and saves
// storage states; the main project runs every spec as Baiwei (user1).
// Logged-out specs opt out via test.use({ storageState: { cookies: [],
// origins: [] } }); Friend2 specs use playwright/.auth/user2.json.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user1.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      TURSO_DATABASE_URL: "file:./data/test.db",
      // Fixed secret so saved storage states survive webServer restarts
      // within a run (a random secret would invalidate the cookies).
      AUTH_SECRET: "brewlog-e2e-fixed-test-secret",
      AUTH_DEV_LOGIN: "true",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: BASE_URL,
    },
  },
});
