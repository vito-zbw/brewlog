import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Route protection (Next 16 renamed middleware to proxy). Phase 4: the site
// is PUBLIC-READ — every viewing page and GET API works without login; login
// gates user-specific surfaces (visit logging, the personal feed, crawl
// authoring) and every mutation. Mutating handlers ALSO call requireUserId()
// themselves, so a gap here can never allow anonymous writes; GET /api/stats
// is personal and 401s in its own handler.
const { auth } = NextAuth(authConfig);

function isProtectedPage(pathname: string): boolean {
  if (pathname === "/log" || pathname.startsWith("/log/")) return true;
  if (pathname === "/feed" || pathname.startsWith("/feed/")) return true;
  if (pathname === "/crawls/new") return true;
  if (/^\/crawls\/[^/]+\/edit$/.test(pathname)) return true;
  if (/^\/visits\/[^/]+\/edit$/.test(pathname)) return true;
  return false;
}

export const proxy = auth((req) => {
  if (req.auth) return;
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") &&
    req.method !== "GET"
  ) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (isProtectedPage(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set(
      "callbackUrl",
      pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }
});

// Scope the matcher to ONLY the paths this proxy actually gates. Auth.js v5's
// `auth()` wrapper runs getSession() — which, under the JWT strategy, re-signs
// and re-issues the session cookie on EVERY matched request (no updateAge
// throttle: nextauthjs/next-auth#13248) — before our callback runs. A catch-all
// matcher therefore rotated the cookie on every public page and, crucially, on
// every RSC <Link> prefetch. During logout those in-flight prefetches still
// carried the pre-clear cookie and re-issued a fresh valid one AFTER signOut's
// clear landed (last-Set-Cookie-wins), resurrecting the session ~half the time.
// Limiting the matcher to protected paths means public pages and their
// prefetches never invoke auth(), so the cookie is never rotated on the way out.
// Mutation safety is unaffected — every mutating handler calls requireUserId()
// itself; /api stays matched only to preserve the uniform 401 (APIs aren't
// prefetched, so they don't reopen the race).
export const config = {
  matcher: [
    "/log",
    "/log/:path*",
    "/feed",
    "/feed/:path*",
    "/crawls/new",
    "/crawls/:id/edit",
    "/visits/:id/edit",
    "/api/:path*",
  ],
};
