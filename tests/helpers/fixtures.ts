import { test as base } from "@playwright/test";

// Hermetic network: the app under test is fully self-contained, so every
// external request (OSM tiles, Google Fonts) is aborted. Tiles throttle
// headless traffic and font fetches stall the `load` event — both are flake,
// neither is asserted on.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route("**/*", (route) => {
      const host = new URL(route.request().url()).hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return route.continue();
      }
      return route.abort();
    });
    await use(context);
  },
});

export { expect } from "@playwright/test";
