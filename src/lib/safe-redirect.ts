// Only same-origin relative paths survive — the WHATWG parser normalizes
// backslash tricks ("/\evil.com" → "//evil.com"), so parsing against a fixed
// base and checking the origin catches every absolute/protocol-relative form.
// Shared by the login and register pages to guard the post-auth redirect.
export function safeRedirectTarget(raw: string | undefined): string {
  if (!raw) return "/";
  try {
    const base = "http://brewlog.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}
