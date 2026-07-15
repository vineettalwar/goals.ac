import { db, sumAsInt } from "@workspace/db";
import {
  briefsTable,
  competitorAnalysesTable,
  contentItemsTable,
  contentPiecesTable,
  contentStrategiesTable,
  geoAuditsTable,
  goalsTable,
  keywordAnalysesTable,
  projectRoadmapsTable,
  roadmapsTable,
  seoArticlesTable,
  trackedKeywordsTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { getAccessibleProject, requireProjectAccess } from "./project-access";

export async function handleStudioRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;
  const url = new URL(request.url);

  if (path === "/api/content-strategies" && method === "GET") {
    const [user] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (user?.role !== "admin" && user?.role !== "super_admin") {
      return withCors(request, Response.json({ error: "Forbidden" }, { status: 403 }));
    }

    const roadmapIdParam = url.searchParams.get("roadmapId");
    const roadmapId = roadmapIdParam ? Number(roadmapIdParam) : null;

    const strategies =
      roadmapId && !Number.isNaN(roadmapId)
        ? await db
            .select()
            .from(contentStrategiesTable)
            .where(eq(contentStrategiesTable.roadmapId, roadmapId))
            .orderBy(desc(contentStrategiesTable.createdAt))
        : await db.select().from(contentStrategiesTable).orderBy(desc(contentStrategiesTable.createdAt));

    return withCors(request, Response.json(strategies));
  }

  const strategyMatch = path.match(/^\/api\/content-strategies\/(\d+)$/);
  if (strategyMatch && method === "GET") {
    const strategyId = Number.parseInt(strategyMatch[1]!, 10);
    const [strategy] = await db
      .select()
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.id, strategyId))
      .limit(1);
    if (!strategy) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    const items = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.strategyId, strategyId))
      .orderBy(contentItemsTable.day);
    return withCors(request, Response.json({ strategy, items }));
  }

  if (path === "/api/goals" && method === "GET") {
    const projectId = Number(url.searchParams.get("projectId"));
    if (!Number.isFinite(projectId)) {
      return withCors(request, Response.json({ error: "projectId is required" }, { status: 400 }));
    }
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const goals = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.projectId, projectId))
      .orderBy(desc(goalsTable.createdAt));
    return withCors(request, Response.json({ goals }));
  }

  const goalMatch = path.match(/^\/api\/goals\/(\d+)$/);
  if (goalMatch && method === "GET") {
    const goalId = Number.parseInt(goalMatch[1]!, 10);
    const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
    if (!goal) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    const access = await requireProjectAccess(goal.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    return withCors(request, Response.json(goal));
  }

  if (path === "/api/briefs" && method === "GET") {
    const projectId = url.searchParams.get("projectId");
    const goalId = url.searchParams.get("goalId");
    if (projectId) {
      const pid = Number(projectId);
      const access = await requireProjectAccess(pid, userId);
      if (!access.ok) {
        return withCors(request, Response.json({ error: access.error }, { status: access.status }));
      }
      const goals = await db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.projectId, pid))
        .orderBy(desc(goalsTable.createdAt));
      const goalIds = goals.map((g) => g.id);
      const briefs =
        goalIds.length > 0
          ? await db
              .select()
              .from(briefsTable)
              .where(inArray(briefsTable.goalId, goalIds))
              .orderBy(desc(briefsTable.updatedAt))
          : [];
      return withCors(request, Response.json({ briefs }));
    }
    if (goalId) {
      const gid = Number(goalId);
      const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, gid)).limit(1);
      if (!goal) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
      const access = await requireProjectAccess(goal.projectId, userId);
      if (!access.ok) {
        return withCors(request, Response.json({ error: access.error }, { status: access.status }));
      }
      const briefs = await db
        .select()
        .from(briefsTable)
        .where(eq(briefsTable.goalId, gid))
        .orderBy(desc(briefsTable.updatedAt));
      return withCors(request, Response.json({ briefs }));
    }
    return withCors(request, Response.json({ error: "projectId or goalId required" }, { status: 400 }));
  }

  const roadmapSlugMatch = path.match(/^\/api\/roadmaps\/([^/]+)$/);
  if (roadmapSlugMatch && method === "GET") {
    const slug = roadmapSlugMatch[1]!;
    const [roadmap] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);
    if (!roadmap) {
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }
    return withCors(request, Response.json(roadmap));
  }

  const projectContentMatch = path.match(/^\/api\/website-projects\/(\d+)\/content$/);
  if (projectContentMatch && method === "GET") {
    const projectId = Number.parseInt(projectContentMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const [
      contentStrategies,
      seoArticles,
      geoAudits,
      competitorAnalyses,
      keywordAnalyses,
      trackedKeywords,
      pinnedRoadmapLinks,
      contentPieces,
      projectGoals,
    ] = await Promise.all([
      db
        .select()
        .from(contentStrategiesTable)
        .where(eq(contentStrategiesTable.websiteProjectId, projectId))
        .orderBy(desc(contentStrategiesTable.createdAt)),
      db
        .select()
        .from(seoArticlesTable)
        .where(eq(seoArticlesTable.websiteProjectId, projectId))
        .orderBy(desc(seoArticlesTable.createdAt)),
      db
        .select()
        .from(geoAuditsTable)
        .where(eq(geoAuditsTable.websiteProjectId, projectId))
        .orderBy(desc(geoAuditsTable.createdAt)),
      db
        .select()
        .from(competitorAnalysesTable)
        .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
        .orderBy(desc(competitorAnalysesTable.createdAt)),
      db
        .select()
        .from(keywordAnalysesTable)
        .where(eq(keywordAnalysesTable.websiteProjectId, projectId))
        .orderBy(desc(keywordAnalysesTable.createdAt)),
      db
        .select()
        .from(trackedKeywordsTable)
        .where(and(eq(trackedKeywordsTable.websiteProjectId, projectId), eq(trackedKeywordsTable.isActive, true)))
        .orderBy(desc(trackedKeywordsTable.createdAt)),
      db
        .select({ roadmapId: projectRoadmapsTable.roadmapId })
        .from(projectRoadmapsTable)
        .where(eq(projectRoadmapsTable.projectId, projectId)),
      db
        .select()
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, projectId))
        .orderBy(desc(contentPiecesTable.updatedAt))
        .limit(50),
      db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.projectId, projectId))
        .orderBy(desc(goalsTable.updatedAt)),
    ]);

    const roadmapIds = pinnedRoadmapLinks.map((r) => r.roadmapId);
    const roadmaps =
      roadmapIds.length > 0
        ? await db
            .select()
            .from(roadmapsTable)
            .where(inArray(roadmapsTable.id, roadmapIds))
            .orderBy(desc(roadmapsTable.createdAt))
        : [];

    const strategyIds = contentStrategies.map((s) => s.id);
    const contentItems =
      strategyIds.length > 0
        ? await db
            .select()
            .from(contentItemsTable)
            .where(inArray(contentItemsTable.strategyId, strategyIds))
            .orderBy(contentItemsTable.day)
        : [];

    return withCors(
      request,
      Response.json({
        contentStrategies,
        contentItems,
        seoArticles,
        geoAudits,
        competitorAnalyses,
        keywordAnalyses,
        trackedKeywords,
        roadmaps,
        contentPieces,
        goals: projectGoals,
      }),
    );
  }

  return null;
}
