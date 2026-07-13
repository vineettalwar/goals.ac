import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  contentStrategiesTable,
  contentItemsTable,
  seoArticlesTable,
  geoAuditsTable,
  competitorAnalysesTable,
  keywordAnalysesTable,
  trackedKeywordsTable,
  projectRoadmapsTable,
  roadmapsTable,
} from "@workspace/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/org-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireProjectAccess(id, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [
    contentStrategies,
    seoArticles,
    geoAudits,
    competitorAnalyses,
    keywordAnalyses,
    trackedKeywords,
    pinnedRoadmapLinks,
  ] = await Promise.all([
    db.select().from(contentStrategiesTable).where(eq(contentStrategiesTable.websiteProjectId, id)).orderBy(desc(contentStrategiesTable.createdAt)),
    db.select().from(seoArticlesTable).where(eq(seoArticlesTable.websiteProjectId, id)).orderBy(desc(seoArticlesTable.createdAt)),
    db.select().from(geoAuditsTable).where(eq(geoAuditsTable.websiteProjectId, id)).orderBy(desc(geoAuditsTable.createdAt)),
    db.select().from(competitorAnalysesTable).where(eq(competitorAnalysesTable.websiteProjectId, id)).orderBy(desc(competitorAnalysesTable.createdAt)),
    db.select().from(keywordAnalysesTable).where(eq(keywordAnalysesTable.websiteProjectId, id)).orderBy(desc(keywordAnalysesTable.createdAt)),
    db.select().from(trackedKeywordsTable).where(and(eq(trackedKeywordsTable.websiteProjectId, id), eq(trackedKeywordsTable.isActive, true))).orderBy(desc(trackedKeywordsTable.createdAt)),
    db.select({ roadmapId: projectRoadmapsTable.roadmapId }).from(projectRoadmapsTable).where(eq(projectRoadmapsTable.projectId, id)),
  ]);

  const roadmapIds = pinnedRoadmapLinks.map((r) => r.roadmapId);
  const roadmaps =
    roadmapIds.length > 0
      ? await db.select().from(roadmapsTable).where(inArray(roadmapsTable.id, roadmapIds)).orderBy(desc(roadmapsTable.createdAt))
      : [];

  const strategyIds = contentStrategies.map((s) => s.id);
  const contentItems =
    strategyIds.length > 0
      ? await db.select().from(contentItemsTable).where(inArray(contentItemsTable.strategyId, strategyIds)).orderBy(contentItemsTable.day)
      : [];

  return NextResponse.json({
    contentStrategies,
    contentItems,
    seoArticles,
    geoAudits,
    competitorAnalyses,
    keywordAnalyses,
    trackedKeywords,
    roadmaps,
  });
}
