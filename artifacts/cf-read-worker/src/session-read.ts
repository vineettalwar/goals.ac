import { db } from "./db";
import {
  usersTable,
  organizationsTable,
  organizationMembersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { withCors } from "@workspace/cf-edge/cors";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { getPlatformStockImageStatus } from "@workspace/stock-images";
import { getUsageSummaryForUser } from "./usage";
import { handleAuthRead } from "./auth-read";
import { getAiProviderStatusForUser } from "./ai-providers-status";
import { handleBillingStatusGet } from "./billing-status";
import type { ReadWorkerEnv } from "./read-env";

export async function handleSessionRead(
  request: Request,
  path: string,
  userId: number,
  env: ReadWorkerEnv,
  session?: SessionClaims,
): Promise<Response | null> {
  if (path === "/api/platform/stock-images/status" && request.method === "GET") {
    if (env.UNSPLASH_ACCESS_KEY) process.env.UNSPLASH_ACCESS_KEY = env.UNSPLASH_ACCESS_KEY;
    if (env.PEXELS_API_KEY) process.env.PEXELS_API_KEY = env.PEXELS_API_KEY;
    return withCors(request, Response.json(getPlatformStockImageStatus()));
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    const [user, orgSettings, membership] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          name: usersTable.name,
          role: usersTable.role,
          avatarUrl: usersTable.avatarUrl,
          googleId: usersTable.googleId,
          passwordHash: usersTable.passwordHash,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)
        .then((rows) => rows[0]),
      getOrgAiSettingsForUser(userId),
      db
        .select({
          orgRole: organizationMembersTable.role,
          organizationId: organizationMembersTable.organizationId,
          organizationName: organizationsTable.name,
        })
        .from(organizationMembersTable)
        .innerJoin(
          organizationsTable,
          eq(organizationMembersTable.organizationId, organizationsTable.id),
        )
        .where(eq(organizationMembersTable.userId, userId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!user) {
      return withCors(request, Response.json({ error: "User not found" }, { status: 404 }));
    }

    const impersonation =
      session?.impersonatorId != null
        ? {
            adminId: Number.parseInt(session.impersonatorId, 10),
            adminName: session.impersonatorName ?? null,
            adminEmail: session.impersonatorEmail ?? null,
          }
        : null;

    const supportOrganization =
      session?.supportOrganizationId != null
        ? {
            id: session.supportOrganizationId,
            name: session.supportOrganizationName ?? "",
          }
        : null;

    const organizationId =
      session?.supportOrganizationId ?? membership?.organizationId ?? null;
    const organizationName =
      session?.supportOrganizationName ?? membership?.organizationName ?? null;
    const orgRole = session?.supportOrganizationId ? "owner" : (membership?.orgRole ?? null);

    return withCors(
      request,
      Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        hasGeminiKey: Boolean(orgSettings?.encryptedGeminiKey),
        hasGoogleId: Boolean(user.googleId),
        hasPassword: Boolean(user.passwordHash),
        orgRole,
        organizationId,
        organizationName,
        impersonation,
        supportOrganization,
      }),
    );
  }

  if (path === "/api/auth/me/export" && request.method === "GET") {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const projects = await db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId));
    const memberships = await db
      .select({
        organizationId: organizationMembersTable.organizationId,
        role: organizationMembersTable.role,
        organizationName: organizationsTable.name,
      })
      .from(organizationMembersTable)
      .innerJoin(
        organizationsTable,
        eq(organizationsTable.id, organizationMembersTable.organizationId),
      )
      .where(eq(organizationMembersTable.userId, userId));
    return withCors(
      request,
      Response.json({
        exportedAt: new Date().toISOString(),
        user,
        projects,
        organizations: memberships,
      }),
    );
  }

  if (path === "/api/usage" && request.method === "GET") {
    const summary = await getUsageSummaryForUser(userId);
    return withCors(request, Response.json({ usage: summary }));
  }

  const billingStatusHandled = await handleBillingStatusGet(request, userId);
  if (billingStatusHandled) return billingStatusHandled;

  const authReadHandled = await handleAuthRead(request, path, userId);
  if (authReadHandled) return authReadHandled;

  if (path === "/api/ai-providers/status" && request.method === "GET") {
    const status = await getAiProviderStatusForUser(userId);
    return withCors(request, Response.json(status));
  }

  return null;
}
