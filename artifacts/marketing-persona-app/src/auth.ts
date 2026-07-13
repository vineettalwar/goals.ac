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
  }
  interface User {
    role?: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
      const authToken = token as typeof token & {
        id?: string;
        role?: string;
        companyId?: number | null;
        organizationId?: number | null;
        orgRole?: OrgMemberRole | null;
      };

      if (user) {
        authToken.id = user.id;
        authToken.role = user.role ?? "user";
      }

      if (trigger === "update") {
        const update = session as {
          companyId?: number | null;
          organizationId?: number | null;
          orgRole?: OrgMemberRole | null;
        } | undefined;
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

      // For Google OAuth, look up or create the user
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
      const authToken = token as typeof token & {
        companyId?: number | null;
        organizationId?: number | null;
        orgRole?: OrgMemberRole | null;
      };
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.companyId = authToken.companyId ?? null;
      session.user.organizationId = authToken.organizationId ?? null;
      session.user.orgRole = authToken.orgRole ?? null;
      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;

/** Dedupes session lookup within a single RSC request (layout + page). */
export const getSession = cache(async () => auth());
