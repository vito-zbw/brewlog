import { mkdirSync } from "node:fs";
import { test as setup, expect } from "../helpers/fixtures";

// Logs in through the real dev-login UI once per run and saves the session
// cookies. user1 = Baiwei (default for every spec), user2 = Friend2 (whose
// seed data no other spec mutates — safe for exact-number assertions).
const USERS = [
  { name: "Baiwei", file: "playwright/.auth/user1.json" },
  { name: "Friend2", file: "playwright/.auth/user2.json" },
] as const;

mkdirSync("playwright/.auth", { recursive: true });

for (const { name, file } of USERS) {
  setup(`authenticate as ${name}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId(`dev-login-${name}`).click();
    // Successful sign-in redirects into the app and the nav shows the user.
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toContainText(name);
    await page.context().storageState({ path: file });
  });
}
