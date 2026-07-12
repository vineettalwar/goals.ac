import type { NextAuthConfig } from "next-auth";

/** Edge-safe auth config — no DB, bcrypt, or Node-only modules. Used by middleware. */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [],
} satisfies NextAuthConfig;
