import { db } from "./db";
import { geoAuditsTable, competitorAnalysesTable } from "@workspace/db/schema-sqlite";
import { desc, eq, inArray } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { requireBoundProjectAccess } from "@workspace/cf-edge/project-access";
import {
  getAccessibleProject,
  listAccessibleProjectIds,
  parsePositiveInt,
} from "./project-access";

export async function handleAnalysisRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const url = new URL(request.url);

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
        .where(eq(geoAuditsTable.websiteProjectId, projectId))
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
            .where(inArray(geoAuditsTable.websiteProjectId, projectIds))
            .orderBy(desc(geoAuditsTable.createdAt))
            .limit(50);
    return withCors(request, Response.json({ audits }));
  }

  const geoAuditMatch = path.match(/^\/api\/geo-audits\/(\d+)$/);
  if (geoAuditMatch && request.method === "GET") {
    const id = Number.parseInt(geoAuditMatch[1]!, 10);
    const [audit] = await db
      .select()
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.id, id))
      .limit(1);
    if (!audit) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const access = await requireBoundProjectAccess(audit.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
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

    const access = await requireBoundProjectAccess(row.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
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

  return null;
}
