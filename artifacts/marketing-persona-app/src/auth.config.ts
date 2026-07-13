import type { NextAuthConfig } from "next-auth";

function normalizeOrgRole(role: string | null | undefined): "owner" | "site_admin" | "editor" | "viewer" | null {
  if (!role) return null;
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") return role;
  return null;
}

/** Lightweight auth config — no DB, bcrypt, or Node-only modules. Used by proxy. */
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
        id?: string;
        role?: string;
        email?: string;
        name?: string;
        organizationId?: number | null;
        orgRole?: string | null;
        impersonatorId?: string;
        impersonatorRole?: string;
        impersonatorEmail?: string;
        impersonatorName?: string;
      };

      session.user = {
        ...session.user,
        id: authToken.id ?? session.user.id,
        email: (authToken.email as string) ?? session.user.email,
        name: (authToken.name as string) ?? session.user.name,
        role: authToken.role ?? session.user.role ?? "user",
        organizationId: authToken.organizationId ?? null,
        orgRole: normalizeOrgRole(authToken.orgRole),
      };

      session.impersonation = authToken.impersonatorId
        ? {
            adminId: authToken.impersonatorId,
            adminEmail: authToken.impersonatorEmail ?? "",
            adminName: authToken.impersonatorName ?? "",
          }
        : null;
      session.impersonatorRole = authToken.impersonatorRole ?? null;

      return session;
    },
  },
} satisfies NextAuthConfig;

declare module "next-auth" {
  interface Session {
    impersonation?: {
      adminId: string;
      adminEmail: string;
      adminName: string;
    } | null;
    impersonatorRole?: string | null;
  }
}
