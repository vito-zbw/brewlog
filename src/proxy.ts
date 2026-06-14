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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
