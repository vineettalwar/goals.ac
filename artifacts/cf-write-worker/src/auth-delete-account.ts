import { eq, inArray } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import {
  clearSessionCookie,
  requestUsesSecureCookies,
} from "@workspace/cf-edge/session-cookie";
import { db } from "./db";
import {
  companiesTable,
  competitorAnalysesTable,
  contentItemsTable,
  contentStrategiesTable,
  geoAuditsTable,
  keywordAnalysesTable,
  organizationMembersTable,
  organizationsTable,
  seoArticlesTable,
  sessionsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";

function jsonWithCookie(request: Request, body: unknown, cookie: string, status = 200): Response {
  return withCors(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }),
  );
}

export async function assertAccountDeletable(
  userId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const memberships = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      role: organizationMembersTable.role,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId));

  for (const membership of memberships) {
    const others = await db
      .select({ id: organizationMembersTable.id })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.organizationId, membership.organizationId));
    if (others.length > 1) {
      return {
        ok: false,
        status: 409,
        error: "Remove other organization members before deleting this account.",
      };
    }
  }
  return { ok: true };
}

export async function deleteUserData(userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const userProjects = await tx
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId));

    if (userProjects.length > 0) {
      const projectIds = userProjects.map((p) => p.id);

      const strategies = await tx
        .select({ id: contentStrategiesTable.id })
        .from(contentStrategiesTable)
        .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));

      if (strategies.length > 0) {
        const strategyIds = strategies.map((s) => s.id);
        await tx.delete(contentItemsTable).where(inArray(contentItemsTable.strategyId, strategyIds));
      }

      await tx
        .delete(contentStrategiesTable)
        .where(inArray(contentStrategiesTable.websiteProjectId, projectIds));
      await tx.delete(seoArticlesTable).where(inArray(seoArticlesTable.websiteProjectId, projectIds));
      await tx.delete(geoAuditsTable).where(inArray(geoAuditsTable.websiteProjectId, projectIds));
      await tx
        .delete(competitorAnalysesTable)
        .where(inArray(competitorAnalysesTable.websiteProjectId, projectIds));
      await tx
        .delete(keywordAnalysesTable)
        .where(inArray(keywordAnalysesTable.websiteProjectId, projectIds));
      await tx.delete(websiteProjectsTable).where(inArray(websiteProjectsTable.id, projectIds));
    }

    const orgs = await tx
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.ownerId, userId));
    const orgIds = orgs.map((o) => o.id);
    if (orgIds.length > 0) {
      await tx
        .delete(organizationMembersTable)
        .where(inArray(organizationMembersTable.organizationId, orgIds));
      await tx.delete(organizationsTable).where(inArray(organizationsTable.id, orgIds));
    }

    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    await tx.delete(companiesTable).where(eq(companiesTable.userId, userId));
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
}

export async function handleAuthDeleteAccount(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/auth/me/delete" || request.method !== "DELETE") {
    return null;
  }

  const gate = await assertAccountDeletable(userId);
  if (!gate.ok) {
    return withCors(request, Response.json({ error: gate.error }, { status: gate.status }));
  }

  try {
    await deleteUserData(userId);
    const secure = requestUsesSecureCookies(request);
    return jsonWithCookie(request, { ok: true }, clearSessionCookie(secure));
  } catch {
    return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
  }
}
