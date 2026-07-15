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

export type CommandCenterOpportunityPreview = {
  id: number;
  keyword: string;
  opportunityScore: number;
  suggestedTitle: string;
  source: string;
};

export type CommandCenterSummary = {
  openOpportunities: number;
  queuedOpportunities: number;
  calendarDraftItems: number;
  draftsNeedingReview: number;
  generatingPieces: number;
  latestGeoScore: number | null;
  latestGeoAuditAt: string | null;
  llmCitationRate: number | null;
  topOpportunities: CommandCenterOpportunityPreview[];
  internalLinkCoverage: number | null;
  internalLinkSuggestions: number;
};

export async function loadCommandCenterSummary(projectId: number): Promise<CommandCenterSummary> {
  const [
    openRows,
    queuedRows,
    pieceRows,
    geoRows,
    llmRows,
    topOpps,
    strategyRows,
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
        pieceMetadata: contentPiecesTable.pieceMetadata,
      })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId)),
    db
      .select({
        geoScore: geoAuditsTable.geoScore,
        createdAt: geoAuditsTable.createdAt,
      })
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.websiteProjectId, projectId))
      .orderBy(desc(geoAuditsTable.createdAt))
      .limit(1),
    db
      .select({ cited: llmVisibilitySnapshotsTable.cited })
      .from(llmVisibilitySnapshotsTable)
      .where(eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId))
      .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt))
      .limit(40),
    db
      .select({
        id: keywordOpportunitiesTable.id,
        keyword: keywordOpportunitiesTable.keyword,
        opportunityScore: keywordOpportunitiesTable.opportunityScore,
        suggestedTitle: keywordOpportunitiesTable.suggestedTitle,
        source: keywordOpportunitiesTable.source,
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
  let internalLinkSuggestions = 0;
  let pagesWithInbound = 0;
  for (const row of pieceRows) {
    if (row.status === "draft") draftsNeedingReview += 1;
    if (row.status === "generating") generatingPieces += 1;
    const meta = (row.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { suggestedSlug: string }[];
    };
    const suggestions = meta.internalLinkSuggestions?.length ?? 0;
    internalLinkSuggestions += suggestions;
    if (suggestions > 0 || row.status === "published") pagesWithInbound += 1;
  }
  const internalLinkCoverage =
    pieceRows.length === 0
      ? null
      : Math.round((pagesWithInbound / pieceRows.length) * 100);

  const latestGeo = geoRows[0];
  let llmCitationRate: number | null = null;
  if (llmRows.length > 0) {
    const cited = llmRows.filter((row) => row.cited).length;
    llmCitationRate = Math.round((cited / llmRows.length) * 100);
  }

  return {
    openOpportunities: openRows[0]?.count ?? 0,
    queuedOpportunities: queuedRows[0]?.count ?? 0,
    calendarDraftItems,
    draftsNeedingReview,
    generatingPieces,
    latestGeoScore: latestGeo?.geoScore ?? null,
    latestGeoAuditAt: latestGeo?.createdAt ? String(latestGeo.createdAt) : null,
    llmCitationRate,
    topOpportunities: topOpps,
    internalLinkCoverage,
    internalLinkSuggestions,
  };
}
