import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  contentPiecesTable,
  goalsTable,
  usersTable,
  brandProfilesTable,
  briefsTable,
  geoAuditsTable,
  trackedKeywordsTable,
  keywordOpportunitiesTable,
  competitorAnalysesTable,
  roadmapsTable,
  companiesTable,
  organizationsTable,
  organizationMembersTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq, getTableColumns, inArray, isNull, or } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import {
  ownedProject,
  parsePositiveInt,
  userProjectIds,
} from "./project-access";

import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  maskCmsCredentials,
} from "@workspace/content-engine/support/publishing/cms-integrations";

export async function handleAuthenticatedRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (path === "/api/auth/me" && request.method === "GET") {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      return withCors(request, Response.json({ error: "User not found" }, { status: 404 }));
    }
    return withCors(request, Response.json({ user }));
  }

  if (path === "/api/companies" && request.method === "GET") {
    const companies = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.userId, userId));
    return withCors(request, Response.json({ companies }));
  }

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
    const limit = Math.min(parsePositiveInt(url.searchParams.get("limit")) ?? 20, 50);
    const roadmaps = await db
      .select()
      .from(roadmapsTable)
      .orderBy(desc(roadmapsTable.createdAt))
      .limit(limit);
    return withCors(request, Response.json({ roadmaps }));
  }

  if (path === "/api/website-projects" && request.method === "GET") {
    const projects = await db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId))
      .orderBy(desc(websiteProjectsTable.updatedAt));
    return withCors(request, Response.json(projects));
  }

  const projectMatch = path.match(/^\/api\/website-projects\/(\d+)$/);
  if (projectMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
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

  const projectCmsMatch = path.match(/^\/api\/website-projects\/(\d+)\/cms-integrations$/);
  if (projectCmsMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectCmsMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    return withCors(
      request,
      Response.json(
        maskCmsCredentials(
          decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials),
        ),
      ),
    );
  }

  const projectPiecesMatch = path.match(/^\/api\/website-projects\/(\d+)\/content-pieces$/);
  if (projectPiecesMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectPiecesMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
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

  const projectContentMatch = path.match(/^\/api\/website-projects\/(\d+)\/content$/);
  if (projectContentMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectContentMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const [contentPieces, geoAudits, competitorAnalyses, projectGoals] = await Promise.all([
      db
        .select(getTableColumns(contentPiecesTable))
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, projectId))
        .orderBy(desc(contentPiecesTable.updatedAt))
        .limit(50),
      db
        .select()
        .from(geoAuditsTable)
        .where(
          or(
            eq(geoAuditsTable.websiteProjectId, projectId),
            isNull(geoAuditsTable.websiteProjectId),
          ),
        )
        .orderBy(desc(geoAuditsTable.createdAt))
        .limit(20),
      db
        .select()
        .from(competitorAnalysesTable)
        .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
        .orderBy(desc(competitorAnalysesTable.createdAt))
        .limit(20),
      db
        .select(getTableColumns(goalsTable))
        .from(goalsTable)
        .where(eq(goalsTable.projectId, projectId))
        .orderBy(desc(goalsTable.updatedAt)),
    ]);
    return withCors(
      request,
      Response.json({
        contentPieces,
        geoAudits,
        competitorAnalyses,
        goals: projectGoals,
        contentStrategies: [],
        seoArticles: [],
        roadmaps: [],
      }),
    );
  }

  const projectBrandMatch = path.match(/^\/api\/website-projects\/(\d+)\/brand-profile$/);
  if (projectBrandMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectBrandMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);
    return withCors(request, Response.json(brandProfile ?? null));
  }

  const projectAutopilotMatch = path.match(/^\/api\/website-projects\/(\d+)\/autopilot-settings$/);
  if (projectAutopilotMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectAutopilotMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(project.autopilotSettings ?? { enabled: false }));
  }

  const projectVisibilityMatch = path.match(/^\/api\/website-projects\/(\d+)\/visibility-settings$/);
  if (projectVisibilityMatch && request.method === "GET") {
    const projectId = Number.parseInt(projectVisibilityMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(project.visibilitySettings ?? {}));
  }

  const keywordOppMatch = path.match(/^\/api\/website-projects\/(\d+)\/keyword-opportunities$/);
  if (keywordOppMatch && request.method === "GET") {
    const projectId = Number.parseInt(keywordOppMatch[1]!, 10);
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const status = url.searchParams.get("status");
    const opportunities = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(
        status
          ? and(
              eq(keywordOpportunitiesTable.websiteProjectId, projectId),
              eq(keywordOpportunitiesTable.status, status),
            )
          : eq(keywordOpportunitiesTable.websiteProjectId, projectId),
      )
      .orderBy(desc(keywordOpportunitiesTable.createdAt))
      .limit(100);
    return withCors(request, Response.json({ opportunities }));
  }

  if (path === "/api/goals" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (projectId) {
      const project = await ownedProject(projectId, userId);
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
    const goals = await db
      .select(getTableColumns(goalsTable))
      .from(goalsTable)
      .innerJoin(websiteProjectsTable, eq(goalsTable.projectId, websiteProjectsTable.id))
      .where(eq(websiteProjectsTable.userId, userId))
      .orderBy(desc(goalsTable.updatedAt));
    return withCors(request, Response.json({ goals }));
  }

  if (path === "/api/briefs" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }
    const project = await ownedProject(projectId, userId);
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

  if (path === "/api/tracked-keywords" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }
    const project = await ownedProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const trackedKeywords = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.websiteProjectId, projectId))
      .orderBy(desc(trackedKeywordsTable.updatedAt));
    return withCors(request, Response.json({ trackedKeywords }));
  }

  if (path === "/api/geo-audits" && request.method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    const projectIds = await userProjectIds(userId);
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
    const projectIds = await userProjectIds(userId);
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
    const projectIds = projectId ? [projectId] : await userProjectIds(userId);
    if (projectId && !(await ownedProject(projectId, userId))) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
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
    return withCors(request, Response.json({ analyses: rows }));
  }

  const contentMatch = path.match(/^\/api\/content-pieces\/(\d+)$/);
  if (contentMatch && request.method === "GET") {
    const id = Number.parseInt(contentMatch[1]!, 10);
    const [piece] = await db
      .select(getTableColumns(contentPiecesTable))
      .from(contentPiecesTable)
      .innerJoin(
        websiteProjectsTable,
        eq(contentPiecesTable.websiteProjectId, websiteProjectsTable.id),
      )
      .where(and(eq(contentPiecesTable.id, id), eq(websiteProjectsTable.userId, userId)))
      .limit(1);
    if (!piece) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(piece));
  }

  if (path === "/api/content-pieces" && request.method === "GET") {
    const pieces = await db
      .select(getTableColumns(contentPiecesTable))
      .from(contentPiecesTable)
      .innerJoin(
        websiteProjectsTable,
        eq(contentPiecesTable.websiteProjectId, websiteProjectsTable.id),
      )
      .where(eq(websiteProjectsTable.userId, userId))
      .orderBy(desc(contentPiecesTable.updatedAt))
      .limit(100);
    return withCors(request, Response.json(pieces));
  }

  return null;
}
