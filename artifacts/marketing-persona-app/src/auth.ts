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

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      companyId: number | null;
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
      };

      if (user) {
        authToken.id = user.id;
        authToken.role = user.role ?? "user";
      }

      if (trigger === "update") {
        const update = session as { companyId?: number | null } | undefined;
        if (update?.companyId !== undefined) {
          authToken.companyId = update.companyId;
        }
      } else if (user || authToken.companyId === undefined) {
        const userId = user?.id ?? authToken.id;
        if (userId) {
          authToken.companyId = await getCompanyIdForUser(parseInt(String(userId), 10));
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
      const authToken = token as typeof token & { companyId?: number | null };
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.companyId = authToken.companyId ?? null;
      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;

/** Dedupes session lookup within a single RSC request (layout + page). */
export const getSession = cache(async () => auth());
