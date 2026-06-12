import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

// Edge-safe config shared with src/proxy.ts — must not import the database.
// OAuth providers register only when their env vars exist, so the app boots
// (and dev login works) with zero OAuth configuration.
export const authConfig = {
  providers: [
    ...(process.env.AUTH_GOOGLE_ID ? [Google] : []),
    ...(process.env.AUTH_GITHUB_ID ? [GitHub] : []),
  ],
  session: { strategy: "jwt" },
  // error: OAuth failures (AccessDenied etc.) land on /login?error=… and show
  // the localized error box instead of the default English Auth.js page.
  pages: { signIn: "/login", error: "/login" },
} satisfies NextAuthConfig;

export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" ||
  process.env.NODE_ENV === "development";
