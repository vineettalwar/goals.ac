import type { NextAuthConfig } from "next-auth";

/** Edge-safe auth config — no DB, bcrypt, or Node-only modules. Used by middleware. */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [],
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      const authToken = token as typeof token & {
        organizationId?: number | null;
        orgRole?: string | null;
      };
      session.user = {
        ...session.user,
        organizationId: authToken.organizationId ?? null,
        orgRole: (authToken.orgRole as "site_admin" | "member" | null) ?? null,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
