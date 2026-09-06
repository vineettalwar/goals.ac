import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable } from "@workspace/db/schema";
import { rankDropToOpportunity } from "@workspace/seo-tools/keywordGapAnalyzer";
import { getGscQueryRowsForProject } from "../analytics/gsc-search-analytics-service";
import { defaultSyncDateRange } from "@workspace/seo-tools/analyticsDateRange";
import { priorPeriodRange } from "@workspace/seo-tools/gscSearchAnalytics";
import { logger } from "../core/logger";

export type OpportunityBrief = {
  workingTitle: string;
  targetKeyword: string;
  searchIntent: string;
  angle: string;
  format: string;
  wordCount: number;
  outline: string[];
  context: {
    estimatedVolume?: string | null;
    difficulty?: string | null;
    gscPosition?: number | null;
    gscImpressions?: number | null;
    rankPosition?: number | null;
    serpFeatures?: Record<string, unknown> | null;
    source: string;
    opportunityScore: number;
  };
};

export async function buildBriefFromOpportunity(opportunityId: number): Promise<OpportunityBrief> {
  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");

  const { startDate, endDate } = defaultSyncDateRange();
  const gscRows = await getGscQueryRowsForProject(opp.websiteProjectId, startDate, endDate);
  const gscMatch = gscRows.find((row) => row.query.toLowerCase() === opp.keyword.toLowerCase());

  const { trackedKeywordsTable, keywordRankSnapshotsTable } = await import("@workspace/db/schema");
  const [tracked] = await db
    .select({ id: trackedKeywordsTable.id })
    .from(trackedKeywordsTable)
    .where(
      and(
        eq(trackedKeywordsTable.websiteProjectId, opp.websiteProjectId),
        eq(trackedKeywordsTable.keyword, opp.keyword),
        eq(trackedKeywordsTable.isActive, true),
      ),
    )
    .limit(1);

  let rankPosition: number | null = null;
  let serpFeatures: Record<string, unknown> | null = null;
  if (tracked) {
    const [snapshot] = await db
      .select({
        position: keywordRankSnapshotsTable.position,
        serpFeatures: keywordRankSnapshotsTable.serpFeatures,
      })
      .from(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, tracked.id))
      .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
      .limit(1);
    rankPosition = snapshot?.position ?? null;
    serpFeatures = (snapshot?.serpFeatures as Record<string, unknown>) ?? null;
  }

  const peopleAlsoAsk = Array.isArray(serpFeatures?.peopleAlsoAsk)
    ? (serpFeatures.peopleAlsoAsk as string[]).slice(0, 3)
    : [];

  const outline = [
    `Introduction — why "${opp.keyword}" matters now`,
    `Core concepts and definitions`,
    opp.suggestedAngle,
    ...peopleAlsoAsk.map((question) => `FAQ: ${question}`),
    "Actionable next steps for the reader",
  ];

  return {
    workingTitle: opp.suggestedTitle,
    targetKeyword: opp.keyword,
    searchIntent: opp.intent ?? "informational",
    angle: opp.suggestedAngle,
    format: "blog_post",
    wordCount: 1500,
    outline,
    context: {
      estimatedVolume: opp.estimatedVolume,
      difficulty: opp.difficulty,
      gscPosition: gscMatch?.position ?? null,
      gscImpressions: gscMatch?.impressions ?? null,
      rankPosition,
      serpFeatures,
      source: opp.source,
      opportunityScore: opp.opportunityScore,
    },
  };
}

export async function findLinkedContentPieceId(
  projectId: number,
  keyword: string,
): Promise<number | null> {
  const { contentPiecesTable } = await import("@workspace/db/schema");
  const needle = keyword.trim().toLowerCase();
  if (!needle) return null;

  const rows = await db
    .select({
      id: contentPiecesTable.id,
      targetKeyword: contentPiecesTable.targetKeyword,
      status: contentPiecesTable.status,
    })
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        inArray(contentPiecesTable.status, ["published", "ready", "draft"]),
      ),
    )
    .limit(300);

  const published = rows.find(
    (row) =>
      row.status === "published" && row.targetKeyword?.trim().toLowerCase() === needle,
  );
  if (published) return published.id;

  const ready = rows.find(
    (row) => row.status === "ready" && row.targetKeyword?.trim().toLowerCase() === needle,
  );
  if (ready) return ready.id;

  const draft = rows.find((row) => row.targetKeyword?.trim().toLowerCase() === needle);
  return draft?.id ?? null;
}

export async function attachLinkedContentPieces<T extends { keyword: string; source: string }>(
  projectId: number,
  opportunities: T[],
): Promise<Array<T & { linkedContentPieceId: number | null }>> {
  const refreshSources = new Set(["rank_drop", "content_refresh"]);
  const map = new Map<string, number | null>();
  for (const opp of opportunities) {
    const key = opp.keyword.toLowerCase();
    if (map.has(key)) continue;
    if (!refreshSources.has(opp.source) && opp.source !== "gsc_query") {
      map.set(key, null);
      continue;
    }
    map.set(key, await findLinkedContentPieceId(projectId, opp.keyword));
  }
  return opportunities.map((opp) => ({
    ...opp,
    linkedContentPieceId: map.get(opp.keyword.toLowerCase()) ?? null,
  }));
}

export async function createRankDropOpportunity(params: {
  projectId: number;
  keyword: string;
  previousPosition: number;
  currentPosition: number;
}): Promise<void> {
  const opp = rankDropToOpportunity(params);
  const [existing] = await db
    .select({ id: keywordOpportunitiesTable.id })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, params.projectId),
        eq(keywordOpportunitiesTable.keyword, params.keyword),
        eq(keywordOpportunitiesTable.status, "open"),
      ),
    )
    .limit(1);
  if (existing) return;

  const linkedPieceId = await findLinkedContentPieceId(params.projectId, params.keyword);
  const angle = linkedPieceId
    ? `${opp.suggestedAngle} Open the existing draft/piece #${linkedPieceId} and refresh with Fix gaps.`
    : opp.suggestedAngle;

  await db.insert(keywordOpportunitiesTable).values({
    websiteProjectId: params.projectId,
    keyword: opp.keyword,
    source: "rank_drop",
    estimatedVolume: opp.estimatedVolume ?? null,
    difficulty: opp.difficulty ?? null,
    opportunityScore: opp.opportunityScore,
    intent: opp.intent ?? null,
    suggestedTitle: opp.suggestedTitle,
    suggestedAngle: angle,
    status: "open",
  });
}

/**
 * When GSC clicks fall sharply vs the prior period for keywords tied to
 * existing content, open a content_refresh opportunity.
 */
export async function createClickDeclineRefreshOpportunities(
  projectId: number,
): Promise<number> {
  const { contentPiecesTable } = await import("@workspace/db/schema");
  const recentRange = defaultSyncDateRange(14);
  const priorRange = priorPeriodRange(recentRange.startDate, recentRange.endDate);

  const [recentRows, priorRows, pieces] = await Promise.all([
    getGscQueryRowsForProject(projectId, recentRange.startDate, recentRange.endDate),
    getGscQueryRowsForProject(projectId, priorRange.startDate, priorRange.endDate),
    db
      .select({
        id: contentPiecesTable.id,
        targetKeyword: contentPiecesTable.targetKeyword,
        title: contentPiecesTable.title,
      })
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.websiteProjectId, projectId),
          inArray(contentPiecesTable.status, ["published", "ready"]),
        ),
      )
      .limit(200),
  ]);

  function aggregateClicks(
    rows: Array<{ query: string; clicks: number; impressions: number }>,
  ): Map<string, { clicks: number; impressions: number }> {
    const map = new Map<string, { clicks: number; impressions: number }>();
    for (const row of rows) {
      const key = row.query.toLowerCase();
      const prev = map.get(key) ?? { clicks: 0, impressions: 0 };
      map.set(key, {
        clicks: prev.clicks + (row.clicks ?? 0),
        impressions: prev.impressions + (row.impressions ?? 0),
      });
    }
    return map;
  }

  const recent = aggregateClicks(recentRows);
  const prior = aggregateClicks(priorRows);
  let inserted = 0;

  for (const piece of pieces) {
    const keyword = piece.targetKeyword?.trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    const priorMetrics = prior.get(key);
    const recentMetrics = recent.get(key);
    if (!priorMetrics || priorMetrics.clicks < 10) continue;
    const recentClicks = recentMetrics?.clicks ?? 0;
    if (recentClicks > priorMetrics.clicks * 0.6) continue;

    const [existing] = await db
      .select({ id: keywordOpportunitiesTable.id })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.keyword, keyword),
          inArray(keywordOpportunitiesTable.status, ["open", "queued"]),
        ),
      )
      .limit(1);
    if (existing) continue;

    const dropPct = Math.round((1 - recentClicks / priorMetrics.clicks) * 100);
    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword,
      source: "content_refresh",
      estimatedVolume: `${priorMetrics.clicks} clicks prior · ${recentClicks} recent`,
      difficulty: "medium",
      opportunityScore: Math.min(95, 55 + Math.min(35, dropPct)),
      intent: "informational",
      suggestedTitle: `Refresh: ${piece.title || keyword}`,
      suggestedAngle: `GSC clicks dropped ~${dropPct}% vs the prior 14 days. Refresh the published article for "${keyword}" with updated sections, FAQ, and SERP gaps.`,
      status: "open",
    });
    inserted += 1;
    if (inserted >= 5) break;
  }

  return inserted;
}
