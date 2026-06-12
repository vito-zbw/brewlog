import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Route protection (Next 16 renamed middleware to proxy). Phase 3: the whole
// app requires login except the login page and the auth endpoints. Phase 4
// will open read-only routes to the public. Mutating API handlers ALSO call
// requireUserId() themselves — a gap here can never allow anonymous writes.
const { auth } = NextAuth(authConfig);

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export const proxy = auth((req) => {
  if (req.auth || isPublic(req.nextUrl.pathname)) return;

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.nextUrl);
  loginUrl.searchParams.set(
    "callbackUrl",
    req.nextUrl.pathname + req.nextUrl.search
  );
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
