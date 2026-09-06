import { and, desc, eq } from "drizzle-orm";
import { db, countAsInt } from "@workspace/db";
import {
  contentItemsTable,
  contentPiecesTable,
  contentStrategiesTable,
  geoAuditsTable,
  keywordOpportunitiesTable,
  llmVisibilitySnapshotsTable,
} from "@workspace/db/schema";
import { listPublishRecordsForProject } from "../support/publishing/publish-records";
import { getProjectInternalLinkSummary } from "./internal-links-summary";

export type CommandCenterOpportunityPreview = {
  id: number;
  keyword: string;
  opportunityScore: number;
  suggestedTitle: string;
  source: string;
  competitorUrl?: string | null;
};

export type CommandCenterRecentPiece = {
  id: number;
  title: string;
  status: string;
  updatedAt: string;
};

export type CommandCenterRecentPublish = {
  id: number;
  contentPieceId: number;
  provider: string;
  status: string;
  pieceTitle: string | null;
  remoteUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type CommandCenterPublishHealth = {
  ok: number;
  failed: number;
  lastAt: string | null;
};

export type CommandCenterSummary = {
  openOpportunities: number;
  queuedOpportunities: number;
  calendarDraftItems: number;
  draftsNeedingReview: number;
  generatingPieces: number;
  /** Pieces with status `published` or `ready`. */
  publishedCount: number;
  draftCount: number;
  publishHealth: CommandCenterPublishHealth;
  latestGeoScore: number | null;
  /** Second-latest GEO audit score; null when fewer than 2 audits. */
  previousGeoScore: number | null;
  latestGeoAuditAt: string | null;
  llmCitationRate: number | null;
  /** Citation-rate change vs prior 14-day window (percentage points); null when either window empty. */
  llmCitationDelta: number | null;
  topOpportunities: CommandCenterOpportunityPreview[];
  /** Coverage % from the same rules as `/internal-links`; null when no pages in map. */
  internalLinkCoverage: number | null;
  /** Published pages with zero inbound links; null when coverage unavailable. */
  internalLinkOrphanCount: number | null;
  internalLinkSuggestions: number;
  recentPieces: CommandCenterRecentPiece[];
  recentPublishes: CommandCenterRecentPublish[];
};

export async function loadCommandCenterSummary(projectId: number): Promise<CommandCenterSummary> {
  const [
    openRows,
    queuedRows,
    pieceRows,
    recentPieceRows,
    geoRows,
    llmRows,
    topOpps,
    strategyRows,
    publishRows,
    linkSummary,
  ] = await Promise.all([
    db
      .select({ count: countAsInt() })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.status, "open"),
        ),
      ),
    db
      .select({ count: countAsInt() })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.status, "queued"),
        ),
      ),
    db
      .select({
        status: contentPiecesTable.status,
      })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId)),
    db
      .select({
        id: contentPiecesTable.id,
        title: contentPiecesTable.title,
        status: contentPiecesTable.status,
        updatedAt: contentPiecesTable.updatedAt,
      })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId))
      .orderBy(desc(contentPiecesTable.updatedAt))
      .limit(5),
    db
      .select({
        geoScore: geoAuditsTable.geoScore,
        createdAt: geoAuditsTable.createdAt,
      })
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.websiteProjectId, projectId))
      .orderBy(desc(geoAuditsTable.createdAt))
      .limit(2),
    db
      .select({
        cited: llmVisibilitySnapshotsTable.cited,
        checkedAt: llmVisibilitySnapshotsTable.checkedAt,
      })
      .from(llmVisibilitySnapshotsTable)
      .where(eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId))
      .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt))
      .limit(80),
    db
      .select({
        id: keywordOpportunitiesTable.id,
        keyword: keywordOpportunitiesTable.keyword,
        opportunityScore: keywordOpportunitiesTable.opportunityScore,
        suggestedTitle: keywordOpportunitiesTable.suggestedTitle,
        source: keywordOpportunitiesTable.source,
        competitorUrl: keywordOpportunitiesTable.competitorUrl,
      })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.status, "open"),
        ),
      )
      .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
      .limit(3),
    db
      .select({ id: contentStrategiesTable.id })
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.websiteProjectId, projectId))
      .orderBy(desc(contentStrategiesTable.year), desc(contentStrategiesTable.month))
      .limit(1),
    listPublishRecordsForProject(projectId, 5),
    getProjectInternalLinkSummary(projectId),
  ]);

  let calendarDraftItems = 0;
  const strategyId = strategyRows[0]?.id;
  if (strategyId) {
    const [draftCount] = await db
      .select({ count: countAsInt() })
      .from(contentItemsTable)
      .where(
        and(eq(contentItemsTable.strategyId, strategyId), eq(contentItemsTable.status, "draft")),
      );
    calendarDraftItems = draftCount?.count ?? 0;
  }

  let draftsNeedingReview = 0;
  let generatingPieces = 0;
  let publishedCount = 0;
  let draftCount = 0;
  for (const row of pieceRows) {
    if (row.status === "draft") {
      draftsNeedingReview += 1;
      draftCount += 1;
    }
    if (row.status === "generating") generatingPieces += 1;
    if (row.status === "published" || row.status === "ready") publishedCount += 1;
  }

  let publishOk = 0;
  let publishFailed = 0;
  let publishLastAt: string | null = null;
  for (const row of publishRows) {
    if (row.status === "published") publishOk += 1;
    if (row.status === "failed") publishFailed += 1;
    if (!publishLastAt) {
      publishLastAt = row.publishedAt
        ? String(row.publishedAt)
        : row.createdAt
          ? String(row.createdAt)
          : null;
    }
  }

  const hasLinkMap = linkSummary.pageCount > 0;
  const internalLinkCoverage = hasLinkMap ? linkSummary.coverageScore : null;
  const internalLinkOrphanCount = hasLinkMap ? linkSummary.orphanCount : null;
  const internalLinkSuggestions = linkSummary.suggestionCount;

  const latestGeo = geoRows[0];
  const previousGeo = geoRows[1];
  let llmCitationRate: number | null = null;
  let llmCitationDelta: number | null = null;
  if (llmRows.length > 0) {
    const cited = llmRows.filter((row) => row.cited).length;
    llmCitationRate = Math.round((cited / llmRows.length) * 100);

    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 14);
    const priorCutoff = new Date();
    priorCutoff.setDate(priorCutoff.getDate() - 28);
    const rate = (rows: { cited: boolean }[]) =>
      rows.length === 0 ? null : Math.round((rows.filter((r) => r.cited).length / rows.length) * 100);
    const recent = llmRows.filter((row) => new Date(row.checkedAt) >= recentCutoff);
    const prior = llmRows.filter((row) => {
      const at = new Date(row.checkedAt);
      return at >= priorCutoff && at < recentCutoff;
    });
    const recentRate = rate(recent);
    const priorRate = rate(prior);
    if (recentRate != null && priorRate != null) {
      llmCitationDelta = recentRate - priorRate;
    }
  }

  return {
    openOpportunities: openRows[0]?.count ?? 0,
    queuedOpportunities: queuedRows[0]?.count ?? 0,
    calendarDraftItems,
    draftsNeedingReview,
    generatingPieces,
    publishedCount,
    draftCount,
    publishHealth: { ok: publishOk, failed: publishFailed, lastAt: publishLastAt },
    latestGeoScore: latestGeo?.geoScore ?? null,
    previousGeoScore: previousGeo?.geoScore ?? null,
    latestGeoAuditAt: latestGeo?.createdAt ? String(latestGeo.createdAt) : null,
    llmCitationRate,
    llmCitationDelta,
    topOpportunities: topOpps,
    internalLinkCoverage,
    internalLinkOrphanCount,
    internalLinkSuggestions,
    recentPieces: recentPieceRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: String(row.updatedAt),
    })),
    recentPublishes: publishRows.map((row) => ({
      id: row.id,
      contentPieceId: row.contentPieceId,
      provider: row.provider,
      status: row.status,
      pieceTitle: row.pieceTitle,
      remoteUrl: row.remoteUrl,
      errorMessage: row.errorMessage,
      publishedAt: row.publishedAt ? String(row.publishedAt) : null,
      createdAt: String(row.createdAt),
    })),
  };
}
