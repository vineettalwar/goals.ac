import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { getCompanyIdForUser } from "@/lib/user-company";
import { getOrgMembership, type OrgMemberRole } from "@/lib/org-access";

type AuthToken = {
  id?: string;
  role?: string;
  email?: string;
  name?: string;
  companyId?: number | null;
  organizationId?: number | null;
  orgRole?: OrgMemberRole | null;
  impersonatorId?: string;
  impersonatorRole?: string;
  impersonatorEmail?: string;
  impersonatorName?: string;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      companyId: number | null;
      organizationId: number | null;
      orgRole: OrgMemberRole | null;
    };
    impersonation?: {
      adminId: string;
      adminEmail: string;
      adminName: string;
    } | null;
    impersonatorRole?: string | null;
  }
  interface User {
    role?: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function applyUserContextToToken(authToken: AuthToken, userId: number) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return;

  authToken.id = String(user.id);
  authToken.email = user.email;
  authToken.name = user.name;
  authToken.role = user.role;
  authToken.companyId = await getCompanyIdForUser(user.id);
  const membership = await getOrgMembership(user.id);
  authToken.organizationId = membership?.organizationId ?? null;
  authToken.orgRole = membership?.orgRole ?? null;
}

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, parsed.data.email))
          .limit(1);

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? undefined,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      const authToken = token as typeof token & AuthToken;

      if (user) {
        authToken.id = user.id;
        authToken.role = user.role ?? "user";
        authToken.email = user.email ?? undefined;
        authToken.name = user.name ?? undefined;
      }

      if (trigger === "update") {
        const update = session as {
          companyId?: number | null;
          organizationId?: number | null;
          orgRole?: OrgMemberRole | null;
          impersonateUserId?: string;
          impersonator?: { id: string; email: string; name: string; role: string };
          stopImpersonation?: boolean;
        } | undefined;

        if (update?.stopImpersonation && authToken.impersonatorId) {
          const adminId = parseInt(authToken.impersonatorId, 10);
          delete authToken.impersonatorId;
          delete authToken.impersonatorRole;
          delete authToken.impersonatorEmail;
          delete authToken.impersonatorName;
          await applyUserContextToToken(authToken, adminId);
          return authToken;
        }

        if (update?.impersonateUserId) {
          const targetId = parseInt(update.impersonateUserId, 10);
          const impersonator = update.impersonator;

          if (!authToken.impersonatorId) {
            authToken.impersonatorId = impersonator?.id ?? authToken.id;
            authToken.impersonatorRole = impersonator?.role ?? authToken.role;
            authToken.impersonatorEmail = impersonator?.email ?? authToken.email;
            authToken.impersonatorName = impersonator?.name ?? authToken.name;
          }

          await applyUserContextToToken(authToken, targetId);
          return authToken;
        }

        if (update?.companyId !== undefined) {
          authToken.companyId = update.companyId;
        }
        if (update?.organizationId !== undefined) {
          authToken.organizationId = update.organizationId;
        }
        if (update?.orgRole !== undefined) {
          authToken.orgRole = update.orgRole;
        }
      } else if (user || authToken.companyId === undefined || authToken.organizationId === undefined) {
        const userId = user?.id ?? authToken.id;
        if (userId) {
          const numericUserId = parseInt(String(userId), 10);
          if (authToken.companyId === undefined) {
            authToken.companyId = await getCompanyIdForUser(numericUserId);
          }
          if (authToken.organizationId === undefined) {
            const membership = await getOrgMembership(numericUserId);
            authToken.organizationId = membership?.organizationId ?? null;
            authToken.orgRole = membership?.orgRole ?? null;
          }
        }
      }

      if (account?.provider === "google" && authToken.email) {
        const [existingUser] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, authToken.email as string))
          .limit(1);
        if (existingUser) {
          authToken.id = String(existingUser.id);
          authToken.role = existingUser.role;
        }
      }
      return authToken;
    },
    session({ session, token }) {
      const authToken = token as typeof token & AuthToken;
      session.user.id = token.id as string;
      session.user.email = (authToken.email as string) ?? session.user.email;
      session.user.name = (authToken.name as string) ?? session.user.name;
      session.user.role = token.role as string;
      session.user.companyId = authToken.companyId ?? null;
      session.user.organizationId = authToken.organizationId ?? null;
      session.user.orgRole = authToken.orgRole ?? null;
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
});

export const { handlers, auth, signIn, signOut } = nextAuth;

/** Dedupes session lookup within a single RSC request (layout + page). */
export const getSession = cache(async () => auth());
