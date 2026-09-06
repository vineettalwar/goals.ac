import { db } from "./db";
import {
  websiteProjectsTable,
  contentPiecesTable,
  goalsTable,
  usersTable,
  brandProfilesTable,
  briefsTable,
  geoAuditsTable,
  competitorAnalysesTable,
  roadmapsTable,
  companiesTable,
  organizationsTable,
  organizationMembersTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq, getTableColumns, inArray, isNull, or } from "drizzle-orm";
import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { withCors } from "@workspace/cf-edge/cors";
import {
  getAccessibleProject,
  listAccessibleProjectIds,
  parsePositiveInt,
} from "./project-access";

import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  maskCmsCredentials,
} from "@workspace/content-engine/support/publishing/cms-integrations";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { parseVisibilitySettings } from "@workspace/content-engine/support/settings/visibility-settings";
import { getUsageSummaryForUser } from "./usage";
import { handleAuthRead } from "./auth-read";
import { getAiProviderStatusForUser } from "./ai-providers-status";
import { handleSearchPropertiesGet, handleSearchPropertiesAvailablePost } from "./search-properties";
import { handleOrgMembersRead } from "./org-members";
import { handleBillingStatusGet } from "./billing-status";
import {
  handleSocialHistorySyncGet,
  handleSocialMetricsGet,
  handleSocialMetricsSyncGet,
  handleSocialQueueGet,
  handleSocialScheduleSettingsGet,
} from "./social-queue";
import { getPlatformStockImageStatus } from "@workspace/stock-images";

export type ReadWorkerEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
  UNSPLASH_ACCESS_KEY?: string;
  PEXELS_API_KEY?: string;
};

export async function handleAuthenticatedRead(
  request: Request,
  path: string,
  userId: number,
  env: ReadWorkerEnv,
  session?: SessionClaims,
): Promise<Response | null> {
  const url = new URL(request.url);

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

  if (path === "/api/companies" && request.method === "GET") {
    const companies = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.userId, userId));
    return withCors(request, Response.json({ companies }));
  }

  const orgMembersHandled = await handleOrgMembersRead(request, path, userId);
  if (orgMembersHandled) return orgMembersHandled;

  const socialQueueHandled = await handleSocialQueueGet(request, path, userId);
  if (socialQueueHandled) return socialQueueHandled;

  const socialMetricsHandled = await handleSocialMetricsGet(request, path, userId);
  if (socialMetricsHandled) return socialMetricsHandled;

  const socialScheduleSettingsHandled = await handleSocialScheduleSettingsGet(
    request,
    path,
    userId,
  );
  if (socialScheduleSettingsHandled) return socialScheduleSettingsHandled;

  const socialHistorySyncHandled = await handleSocialHistorySyncGet(request, path, userId);
  if (socialHistorySyncHandled) return socialHistorySyncHandled;

  const socialMetricsSyncHandled = await handleSocialMetricsSyncGet(request, path, userId);
  if (socialMetricsSyncHandled) return socialMetricsSyncHandled;

  if (path === "/api/organizations" && request.method === "GET") {
    const memberships = await db
      .select({ organization: organizationsTable })
      .from(organizationMembersTable)
      .innerJoin(
        organizationsTable,
        eq(organizationMembersTable.organizationId, organizationsTable.id),
      )
      .where(eq(organizationMembersTable.userId, userId));
    return withCors(
      request,
      Response.json({ organizations: memberships.map((m) => m.organization) }),
    );
  }

  if (path === "/api/roadmaps" && request.method === "GET") {
    const limit = Math.min(parsePositiveInt(url.searchParams.get("limit")) ?? 20, 100);
    const roadmaps = await db
      .select()
      .from(roadmapsTable)
      .orderBy(desc(roadmapsTable.createdAt))
      .limit(limit);
    return withCors(request, Response.json({ roadmaps }));
  }

  if (path === "/api/website-projects" && request.method === "GET") {
    const accessibleIds = await listAccessibleProjectIds(userId);
    const projects =
      accessibleIds.length === 0
        ? []
        : await db
            .select()
            .from(websiteProjectsTable)
            .where(inArray(websiteProjectsTable.id, accessibleIds))
            .orderBy(desc(websiteProjectsTable.updatedAt));
    return withCors(request, Response.json(projects));
  }

  const projectMatch = path.match(/^\/api\/website-projects\/(\d+)$/);
  if (projectMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);
    return withCors(request, Response.json({ ...project, brandProfile: brandProfile ?? null }));
  }

  const projectSearchPropsMatch = path.match(/^\/api\/website-projects\/(\d+)\/search-properties$/);
  if (projectSearchPropsMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectSearchPropsMatch[1]!, 10);
    return handleSearchPropertiesGet(request, projectId, userId, env);
  }

  const projectSearchPropsAvailableMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/search-properties\/available$/,
  );
  if (projectSearchPropsAvailableMatch && request.method === "POST") {
    const projectId = Number.parseInt(projectSearchPropsAvailableMatch[1]!, 10);
    return handleSearchPropertiesAvailablePost(request, projectId, userId, env);
  }

  const projectCmsMatch = path.match(/^\/api\/website-projects\/(\d+)\/cms-integrations$/);
  if (projectCmsMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectCmsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    return withCors(
      request,
      Response.json(
        maskCmsCredentials(
          decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials),
          (project.cmsIntegrations ?? {}) as Record<string, unknown>,
        ),
      ),
    );
  }

  const projectPiecesMatch = path.match(/^\/api\/website-projects\/(\d+)\/content-pieces$/);
  if (projectPiecesMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectPiecesMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const pieces = await db
      .select(getTableColumns(contentPiecesTable))
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId))
      .orderBy(desc(contentPiecesTable.updatedAt))
      .limit(100);
    return withCors(request, Response.json(pieces));
  }

  const projectBrandMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-profile$/);
  if (projectBrandMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectBrandMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);
    return withCors(
      request,
      Response.json({
        ...(brandProfile ?? {}),
        scrapeStatus: project.scrapeStatus,
        pageCount: project.pageCount ?? 0,
        primaryKeywords: brandProfile?.primaryKeywords ?? [],
      }),
    );
  }

  const projectBrandVoiceMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-profile\/voice$/);
  if (projectBrandVoiceMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectBrandVoiceMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);
    if (!brandProfile) {
      return withCors(request, Response.json({ error: "Brand profile not found" }, { status: 404 }));
    }
    return withCors(
      request,
      Response.json({
        writingExamples: brandProfile.writingExamples,
        brandGlossary: brandProfile.brandGlossary,
        antiPatterns: brandProfile.antiPatterns,
        typicalStructure: brandProfile.typicalStructure,
        doWords: brandProfile.doWords,
        dontWords: brandProfile.dontWords,
      }),
    );
  }

  const projectAutopilotMatch = path.match(/^\/api\/website-projects\/(\d+)\/autopilot-settings$/);
  if (projectAutopilotMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectAutopilotMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(project.autopilotSettings ?? { enabled: false }));
  }

  const projectVisibilityMatch = path.match(/^\/api\/website-projects\/(\d+)\/visibility-settings$/);
  if (projectVisibilityMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectVisibilityMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    return withCors(
      request,
      Response.json(parseVisibilitySettings(project.visibilitySettings)),
    );
  }

  if (path === "/api/goals" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId is required" }, { status: 400 }));
    }
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const goals = await db
      .select(getTableColumns(goalsTable))
      .from(goalsTable)
      .where(eq(goalsTable.projectId, projectId))
      .orderBy(desc(goalsTable.updatedAt));
    return withCors(request, Response.json({ goals }));
  }

  if (path === "/api/briefs" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const briefs = await db
      .select(getTableColumns(briefsTable))
      .from(briefsTable)
      .innerJoin(goalsTable, eq(briefsTable.goalId, goalsTable.id))
      .where(eq(goalsTable.projectId, projectId))
      .orderBy(desc(briefsTable.updatedAt));
    return withCors(request, Response.json({ briefs }));
  }

  if (path === "/api/geo-audits" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    const projectIds = await listAccessibleProjectIds(userId);
    if (projectId) {
      if (!projectIds.includes(projectId)) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }
      const audits = await db
        .select()
        .from(geoAuditsTable)
        .where(
          or(
            eq(geoAuditsTable.websiteProjectId, projectId),
            isNull(geoAuditsTable.websiteProjectId),
          ),
        )
        .orderBy(desc(geoAuditsTable.createdAt))
        .limit(50);
      return withCors(request, Response.json({ audits }));
    }
    const audits =
      projectIds.length === 0
        ? []
        : await db
            .select()
            .from(geoAuditsTable)
            .where(
              or(
                inArray(geoAuditsTable.websiteProjectId, projectIds),
                isNull(geoAuditsTable.websiteProjectId),
              ),
            )
            .orderBy(desc(geoAuditsTable.createdAt))
            .limit(50);
    return withCors(request, Response.json({ audits }));
  }

  const geoAuditMatch = path.match(/^\/api\/geo-audits\/(\d+)$/);
  if (geoAuditMatch && request.method === "GET") {
    const id = Number.parseInt(geoAuditMatch[1]!, 10);
    const projectIds = await listAccessibleProjectIds(userId);
    const [audit] = await db
      .select()
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.id, id))
      .limit(1);
    if (!audit) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    if (
      audit.websiteProjectId != null &&
      !projectIds.includes(audit.websiteProjectId)
    ) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(audit));
  }

  if (path === "/api/competitor-analysis" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    const projectIds = projectId ? [projectId] : await listAccessibleProjectIds(userId);
    if (projectId) {
      const access = await getAccessibleProject(projectId, userId);
      if (!access) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }
    }
    const rows =
      projectIds.length === 0
        ? []
        : await db
            .select()
            .from(competitorAnalysesTable)
            .where(inArray(competitorAnalysesTable.websiteProjectId, projectIds))
            .orderBy(desc(competitorAnalysesTable.createdAt))
            .limit(50);
    return withCors(
      request,
      Response.json({
        analyses: rows.map((row) => ({
          id: row.id,
          competitorUrl: row.competitorUrl,
          industry: row.industry,
          location: row.location,
          stage: row.stage,
          websiteProjectId: row.websiteProjectId,
          createdAt: row.createdAt,
          ...(row.result ?? {}),
        })),
      }),
    );
  }

  const competitorAnalysisMatch = path.match(/^\/api\/competitor-analyses\/(\d+)$/);
  if (competitorAnalysisMatch && request.method === "GET") {
    const id = Number.parseInt(competitorAnalysisMatch[1]!, 10);
    if (!Number.isFinite(id)) {
      return withCors(request, Response.json({ error: "Invalid analysis id" }, { status: 400 }));
    }

    const [row] = await db
      .select()
      .from(competitorAnalysesTable)
      .where(eq(competitorAnalysesTable.id, id))
      .limit(1);

    if (!row) {
      return withCors(request, Response.json({ error: "Competitor analysis not found" }, { status: 404 }));
    }

    if (row.websiteProjectId) {
      const access = await getAccessibleProject(row.websiteProjectId, userId);
      if (!access) {
        return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
      }
    }

    return withCors(
      request,
      Response.json({
        id: row.id,
        competitorUrl: row.competitorUrl,
        industry: row.industry,
        location: row.location,
        stage: row.stage,
        websiteProjectId: row.websiteProjectId,
        createdAt: row.createdAt,
        ...(row.result ?? {}),
      }),
    );
  }

  const contentMatch = path.match(/^\/api\/content-pieces\/(\d+)$/);
  if (contentMatch && request.method === "GET") {
    const id = Number.parseInt(contentMatch[1]!, 10);
    const accessibleIds = await listAccessibleProjectIds(userId);
    if (accessibleIds.length === 0) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const [piece] = await db
      .select(getTableColumns(contentPiecesTable))
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.id, id),
          inArray(contentPiecesTable.websiteProjectId, accessibleIds),
        ),
      )
      .limit(1);
    if (!piece) {
      return withCors(
        request,
        Response.json({ error: "Content piece not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json(piece));
  }

  if (path === "/api/content-pieces" && request.method === "GET") {
    const accessibleIds = await listAccessibleProjectIds(userId);
    const pieces =
      accessibleIds.length === 0
        ? []
        : await db
            .select(getTableColumns(contentPiecesTable))
            .from(contentPiecesTable)
            .where(inArray(contentPiecesTable.websiteProjectId, accessibleIds))
            .orderBy(desc(contentPiecesTable.updatedAt))
            .limit(100);
    return withCors(request, Response.json(pieces));
  }

  return null;
}
