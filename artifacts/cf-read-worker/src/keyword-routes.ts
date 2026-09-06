import { db } from "@workspace/db";
import {
  articleIdeaSourcesTable,
  gscUrlInspectionsTable,
  keywordOpportunitiesTable,
  keywordRankAlertsTable,
  keywordRankSnapshotsTable,
  trackedKeywordsTable,
} from "@workspace/db/schema-sqlite";
import { listArticleIdeaImports } from "@workspace/content-engine/articles/article-ideas-import-service";
import { loadCommandCenterSummary } from "@workspace/content-engine/analytics/command-center-service";
import { listPublishRecordsForProject } from "@workspace/content-engine/support/publishing/publish-records";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { getAccessibleProject, parsePositiveInt } from "./project-access";

export async function handleKeywordRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  const snapshotsMatch = path.match(/^\/api\/tracked-keywords\/(\d+)\/snapshots$/);
  if (snapshotsMatch && method === "GET") {
    const trackedId = Number.parseInt(snapshotsMatch[1]!, 10);
    const [kw] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, trackedId))
      .limit(1);
    if (!kw) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const project = await getAccessibleProject(kw.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const snapshots = await db
      .select({
        checkedAt: keywordRankSnapshotsTable.checkedAt,
        position: keywordRankSnapshotsTable.position,
        serpFeatures: keywordRankSnapshotsTable.serpFeatures,
      })
      .from(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, trackedId))
      .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
      .limit(90);
    return withCors(request, Response.json({ trackedKeyword: kw, snapshots }));
  }

  const alertsMatch = path.match(/^\/api\/website-projects\/(\d+)\/keyword-alerts$/);
  if (alertsMatch && method === "GET") {
    const projectId = Number.parseInt(alertsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const alerts = await db
      .select()
      .from(keywordRankAlertsTable)
      .where(
        and(
          eq(keywordRankAlertsTable.websiteProjectId, projectId),
          eq(keywordRankAlertsTable.status, "open"),
        ),
      )
      .orderBy(desc(keywordRankAlertsTable.createdAt));
    return withCors(request, Response.json({ alerts }));
  }

  const articleSourcesMatch = path.match(/^\/api\/website-projects\/(\d+)\/article-idea-sources$/);
  if (articleSourcesMatch && method === "GET") {
    const projectId = Number.parseInt(articleSourcesMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const sources = await db
      .select({
        id: articleIdeaSourcesTable.id,
        label: articleIdeaSourcesTable.label,
        spreadsheetId: articleIdeaSourcesTable.spreadsheetId,
        sheetName: articleIdeaSourcesTable.sheetName,
        sheetGid: articleIdeaSourcesTable.sheetGid,
        lastSyncedAt: articleIdeaSourcesTable.lastSyncedAt,
        syncStatus: articleIdeaSourcesTable.syncStatus,
        rowCount: articleIdeaSourcesTable.rowCount,
        syncError: articleIdeaSourcesTable.syncError,
        connected: articleIdeaSourcesTable.encryptedConfig,
        createdAt: articleIdeaSourcesTable.createdAt,
      })
      .from(articleIdeaSourcesTable)
      .where(eq(articleIdeaSourcesTable.projectId, projectId));
    return withCors(
      request,
      Response.json({
        sources: sources.map((row) => ({
          ...row,
          connected: Boolean(row.connected),
          lastSyncedAt: row.lastSyncedAt ?? null,
          createdAt: row.createdAt,
        })),
      }),
    );
  }

  const articleIdeasMatch = path.match(/^\/api\/website-projects\/(\d+)\/article-ideas$/);
  if (articleIdeasMatch && method === "GET") {
    const projectId = Number.parseInt(articleIdeasMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const imports = await listArticleIdeaImports(projectId);
    return withCors(request, Response.json({ imports }));
  }

  if (path === "/api/tracked-keywords" && method === "GET") {
    const projectId = parsePositiveInt(url.searchParams.get("projectId"));
    if (!projectId) {
      return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
    }
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const keywords = await db
      .select()
      .from(trackedKeywordsTable)
      .where(
        and(
          eq(trackedKeywordsTable.websiteProjectId, projectId),
          eq(trackedKeywordsTable.isActive, true),
        ),
      )
      .orderBy(desc(trackedKeywordsTable.createdAt));

    const keywordIds = keywords.map((kw) => kw.id);
    const latestByKeywordId = new Map<
      number,
      { position: number | null; checkedAt: string; serpFeatures: Record<string, unknown> }
    >();

    if (keywordIds.length > 0) {
      const snapshots = await db
        .select()
        .from(keywordRankSnapshotsTable)
        .where(inArray(keywordRankSnapshotsTable.trackedKeywordId, keywordIds))
        .orderBy(desc(keywordRankSnapshotsTable.checkedAt));

      for (const snapshot of snapshots) {
        if (!latestByKeywordId.has(snapshot.trackedKeywordId)) {
          latestByKeywordId.set(snapshot.trackedKeywordId, {
            position: snapshot.position,
            checkedAt: String(snapshot.checkedAt),
            serpFeatures: (snapshot.serpFeatures as Record<string, unknown>) ?? {},
          });
        }
      }
    }

    const withLatest = keywords.map((kw) => ({
      ...kw,
      latestSnapshot: latestByKeywordId.get(kw.id) ?? null,
    }));

    return withCors(request, Response.json({ keywords: withLatest, trackedKeywords: withLatest }));
  }

  const keywordOppMatch = path.match(/^\/api\/website-projects\/(\d+)\/keyword-opportunities$/);
  if (keywordOppMatch && method === "GET") {
    const projectId = Number.parseInt(keywordOppMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const status = url.searchParams.get("status") ?? "open";
    const opportunities = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.status, status as "open" | "queued" | "dismissed"),
        ),
      )
      .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
      .limit(100);
    const { attachLinkedContentPieces } = await import(
      "@workspace/content-engine/strategy/keyword-opportunity-service"
    );
    const enriched = await attachLinkedContentPieces(projectId, opportunities);
    return withCors(request, Response.json({ opportunities: enriched }));
  }

  const refreshQueueMatch = path.match(/^\/api\/website-projects\/(\d+)\/refresh-queue$/);
  if (refreshQueueMatch && method === "GET") {
    const projectId = Number.parseInt(refreshQueueMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const { listRefreshQueueItems } = await import(
      "@workspace/content-engine/strategy/refresh-queue-service"
    );
    const items = await listRefreshQueueItems(projectId);
    return withCors(request, Response.json({ items }));
  }

  const gscInspectionsMatch = path.match(/^\/api\/website-projects\/(\d+)\/gsc-url-inspections$/);
  if (gscInspectionsMatch && method === "GET") {
    const projectId = Number.parseInt(gscInspectionsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
    const contentPieceId = url.searchParams.get("contentPieceId");
    const conditions = [eq(gscUrlInspectionsTable.websiteProjectId, projectId)];
    if (contentPieceId) {
      const cpId = Number(contentPieceId);
      if (!Number.isNaN(cpId)) {
        conditions.push(eq(gscUrlInspectionsTable.contentPieceId, cpId));
      }
    }
    const rows = await db
      .select()
      .from(gscUrlInspectionsTable)
      .where(and(...conditions))
      .orderBy(desc(gscUrlInspectionsTable.inspectedAt))
      .limit(limit);
    return withCors(request, Response.json({ inspections: rows }));
  }

  const commandCenterMatch = path.match(/^\/api\/website-projects\/(\d+)\/command-center$/);
  if (commandCenterMatch && method === "GET") {
    const projectId = Number.parseInt(commandCenterMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const summary = await loadCommandCenterSummary(projectId);
    return withCors(request, Response.json(summary));
  }

  const publishRecordsMatch = path.match(/^\/api\/website-projects\/(\d+)\/publish-records$/);
  if (publishRecordsMatch && method === "GET") {
    const projectId = Number.parseInt(publishRecordsMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const records = await listPublishRecordsForProject(projectId, 50);
    return withCors(request, Response.json({ records }));
  }

  return null;
}
