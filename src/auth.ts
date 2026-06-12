import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig, devLoginEnabled } from "@/auth.config";
import { getUserByName, upsertUserByEmail } from "@/lib/queries";

// JWT sessions, no adapter: the jwt callback upserts a users row at sign-in
// (keyed by email — same email across Google/GitHub = same BrewLog user) and
// stores the numeric id in the token, so regular requests hit the DB zero
// times for auth.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
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
      if (account?.provider === "dev-login") return true;
      // OAuth identities without an email cannot be linked to a user row.
      return Boolean(user.email);
    },
    async jwt({ token, user, account }) {
      // `account` is only present on the sign-in request.
      if (account && user) {
        if (account.provider === "dev-login") {
          token.userId = Number(user.id);
        } else if (user.email) {
          token.userId = await upsertUserByEmail(
            user.email,
            user.name ?? user.email,
            user.image ?? null
          );
        }
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === "number") {
        return { ...session, user: { ...session.user, id: token.userId } };
      }
      // Token without a userId (e.g. issued pre-Phase-3): leave the session
      // id-less — requireUserId() rejects it and the user just signs in again.
      return session;
    },
  },
});
