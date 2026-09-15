import { db } from "./db";
import {
  websiteProjectsTable,
  contentPiecesTable,
  brandProfilesTable,
  roadmapsTable,
  companiesTable,
  organizationsTable,
  organizationMembersTable,
} from "@workspace/db/schema-sqlite";
import { desc, eq, getTableColumns, inArray } from "drizzle-orm";
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
import { parseVisibilitySettings } from "@workspace/content-engine/support/settings/visibility-settings";
import { handleSearchPropertiesGet, handleSearchPropertiesAvailablePost } from "./search-properties";
import { handleOrgMembersRead } from "./org-members";
import {
  handleSocialHistorySyncGet,
  handleSocialMetricsGet,
  handleSocialMetricsSyncGet,
  handleSocialQueueGet,
  handleSocialScheduleSettingsGet,
} from "./social-queue";
import type { ReadWorkerEnv } from "./read-env";

export async function handleWorkspaceRead(
  request: Request,
  path: string,
  userId: number,
  env: ReadWorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

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
      .select({
        id: roadmapsTable.id,
        slug: roadmapsTable.slug,
        industry: roadmapsTable.industry,
        location: roadmapsTable.location,
        stage: roadmapsTable.stage,
        viewCount: roadmapsTable.viewCount,
        createdAt: roadmapsTable.createdAt,
      })
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

  return null;
}
