import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig, devLoginEnabled } from "@/auth.config";
import {
  getUserByName,
  getUserByEmailWithHash,
  upsertUserByEmail,
} from "@/lib/queries";
import { verifyPassword } from "@/lib/password";

// JWT sessions, no adapter: the jwt callback upserts a users row at sign-in
// (keyed by email — same email across Google/GitHub = same BrewLog user) and
// stores the numeric id in the token, so regular requests hit the DB zero
// times for auth.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // Site-wide email + password login (Phase 5). Always enabled. Lives here
    // (not in the edge-safe auth.config.ts) because authorize() touches the
    // DB and node:crypto. authorize() resolves the real users.id, so the jwt
    // callback below sets token.userId directly — no email upsert.
    Credentials({
      id: "password",
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        const user = await getUserByEmailWithHash(email);
        // verifyPassword runs scrypt even when the user/hash is absent, so a
        // wrong email and a wrong password take the same time (no enumeration).
        const ok = verifyPassword(password, user?.password_hash ?? null);
        if (!user || !ok) return null;
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    // Dev-only one-click login as a seeded user — powers local use and
    // Playwright without OAuth credentials. Never enabled in production
    // (the provider is not registered at all; see docs/setup/vercel-deploy.md).
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev-login",
            name: "开发登录",
            credentials: { name: { label: "用户名" } },
            async authorize(credentials) {
              if (!devLoginEnabled) return null;
              const name =
                typeof credentials?.name === "string" ? credentials.name : "";
              const user = await getUserByName(name);
              if (!user) return null;
              return {
                id: String(user.id),
                name: user.name,
                email: user.email,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "dev-login" || account?.provider === "password")
        return true;
      // OAuth identities without an email cannot be linked to a user row.
      return Boolean(user.email);
    },
    async jwt({ token, user, account }) {
      // `account` is only present on the sign-in request.
      if (account && user) {
        // dev-login and password both resolve the real users.id in authorize()
        // — take it straight from the returned user, no email upsert.
        if (account.provider === "dev-login" || account.provider === "password") {
          token.userId = Number(user.id);
        } else if (user.email) {
          token.userId = await upsertUserByEmail(
            user.email,
            user.name ?? user.email,
            user.image ?? null
          );
        }
        token.provider = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === "number") {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.userId,
            ...(typeof token.provider === "string"
              ? { provider: token.provider }
              : {}),
          },
        };
      }
      // Token without a userId (e.g. issued pre-Phase-3): leave the session
      // id-less — requireUserId() rejects it and the user just signs in again.
      return session;
    },
  },
});
