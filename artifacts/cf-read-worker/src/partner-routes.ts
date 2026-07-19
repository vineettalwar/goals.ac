import { db } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { eq, inArray, sql } from "drizzle-orm";
import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { withCors } from "@workspace/cf-edge/cors";
import {
  listAccessibleProjects,
  requireSiteAdminAccess,
} from "@workspace/cf-edge/project-access";
import { loadCommandCenterSummary } from "@workspace/content-engine/analytics/command-center-service";
import { loadProjectVisibilitySummary } from "./visibility-routes";

const PARTNER_PROJECT_CAP = 20;

type ProjectInternalLinkSummary = {
  coverageScore: number;
};

async function getProjectInternalLinkSummary(
  projectId: number,
): Promise<ProjectInternalLinkSummary> {
  const pieces = await db
    .select({
      title: contentPiecesTable.title,
      status: contentPiecesTable.status,
      bodyMarkdown: contentPiecesTable.bodyMarkdown,
      pieceMetadata: contentPiecesTable.pieceMetadata,
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId))
    .limit(50);

  type PageNode = { slug: string; inbound: number; status: string };
  const pages: PageNode[] = [];

  for (const piece of pieces) {
    const slug = piece.title.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    pages.push({
      slug,
      inbound: 0,
      status: piece.status,
    });
  }

  const slugSet = new Map(pages.map((page) => [page.slug, page]));

  for (const piece of pieces) {
    const meta = (piece.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { suggestedSlug: string }[];
    };
    for (const link of meta.internalLinkSuggestions ?? []) {
      const normalized =
        link.suggestedSlug.replace(/^\//, "").split("/").pop() ?? link.suggestedSlug;
      const target =
        slugSet.get(normalized) ??
        [...slugSet.values()].find((page) => link.suggestedSlug.includes(page.slug));
      if (target) target.inbound += 1;
    }
  }

  const orphans = pages.filter((page) => page.inbound === 0 && page.status === "published");
  const coverageScore =
    pages.length === 0 ? 0 : Math.round(((pages.length - orphans.length) / pages.length) * 100);

  return { coverageScore };
}

async function listPartnerProjects(session: SessionClaims, userId: number) {
  if (session.supportOrganizationId != null) {
    return db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, session.supportOrganizationId));
  }
  const projects = await listAccessibleProjects(userId);
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    url: project.url,
  }));
}

async function assertPartnerAccess(
  userId: number,
  session: SessionClaims,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (session.supportOrganizationId != null) {
    return { ok: true };
  }
  return requireSiteAdminAccess(userId);
}

export async function handlePartnerRead(
  request: Request,
  path: string,
  userId: number,
  session: SessionClaims,
): Promise<Response | null> {
  if (path !== "/api/partner/projects" || request.method !== "GET") return null;

  const access = await assertPartnerAccess(userId, session);
  if (!access.ok) {
    return withCors(request, Response.json({ error: access.error }, { status: access.status }));
  }

  const allProjects = await listPartnerProjects(session, userId);
  const projects = allProjects.slice(0, PARTNER_PROJECT_CAP);
  const projectIds = projects.map((p) => p.id);

  const pieceCounts =
    projectIds.length === 0
      ? []
      : await db
          .select({
            projectId: contentPiecesTable.websiteProjectId,
            publishedCount:
              sql<number>`sum(case when ${contentPiecesTable.status} = 'published' then 1 else 0 end)`.mapWith(
                Number,
              ),
            draftCount:
              sql<number>`sum(case when ${contentPiecesTable.status} != 'published' then 1 else 0 end)`.mapWith(
                Number,
              ),
          })
          .from(contentPiecesTable)
          .where(inArray(contentPiecesTable.websiteProjectId, projectIds))
          .groupBy(contentPiecesTable.websiteProjectId);

  const countByProject = new Map(
    pieceCounts.map((row) => [
      row.projectId,
      { published: row.publishedCount, draft: row.draftCount },
    ]),
  );

  const rows = await Promise.all(
    projects.map(async (project) => {
      const [visibility, links, summary] = await Promise.all([
        loadProjectVisibilitySummary(project.id),
        getProjectInternalLinkSummary(project.id),
        loadCommandCenterSummary(project.id),
      ]);
      const counts = countByProject.get(project.id) ?? { published: 0, draft: 0 };

      return {
        id: project.id,
        name: project.name,
        url: project.url,
        visibilityScore: visibility.visibilityScore,
        visibilityDelta: visibility.visibilityDelta,
        geoScore: summary.latestGeoScore ?? visibility.latestGeoScore,
        linkCoverage: links.coverageScore,
        publishedCount: counts.published,
        draftCount: counts.draft,
        draftsNeedingReview: summary.draftsNeedingReview,
        generatingPieces: summary.generatingPieces,
        llmCitationRate: summary.llmCitationRate,
        recentPublishOk: summary.publishHealth?.ok ?? 0,
        recentPublishFail: summary.publishHealth?.failed ?? 0,
        internalLinkCoverage: summary.internalLinkCoverage ?? links.coverageScore,
      };
    }),
  );

  return withCors(
    request,
    Response.json({
      generatedAt: new Date().toISOString(),
      projects: rows,
    }),
  );
}
