declare module "next-auth" {
  interface Session {
    user: {
      /**
       * BrewLog users.id — set by the session callback from the JWT.
       * Optional because pre-Phase-3 tokens produce id-less sessions;
       * always guard with a typeof check (requireUserId does this).
       */
      id?: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
  }
}

export {};
