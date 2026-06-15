import { test, expect } from "@playwright/test";
import { photoKeyFromUrl, photoPublicUrl } from "../../../src/lib/storage";

// photoKeyFromUrl is the inverse of photoPublicUrl: given a URL this app wrote
// it returns the storage key, and given anything we don't own (an OAuth
// provider avatar, a foreign URL, null) it returns null. Avatar cleanup relies
// on this so it only ever purges objects this app actually stored — never a
// Google/GitHub avatar URL. Runs in the local-disk backend (no R2_* env in the
// Playwright worker), which matches the app under test.

test.describe("photoKeyFromUrl", () => {
  test("round-trips a stored key through photoPublicUrl", () => {
    const key = "avatar/0f1e2d3c-4b5a-6789-abcd-ef0123456789.jpg";
    expect(photoKeyFromUrl(photoPublicUrl(key))).toBe(key);
  });

  test("returns null for an OAuth / foreign URL", () => {
    expect(
      photoKeyFromUrl("https://lh3.googleusercontent.com/a/default-user")
    ).toBeNull();
    expect(photoKeyFromUrl("https://example.com/avatar/abc.jpg")).toBeNull();
  });

  test("returns null for null, empty, or prefix-only input", () => {
    expect(photoKeyFromUrl(null)).toBeNull();
    expect(photoKeyFromUrl("")).toBeNull();
    expect(photoKeyFromUrl("/api/uploads/")).toBeNull();
  });
});
