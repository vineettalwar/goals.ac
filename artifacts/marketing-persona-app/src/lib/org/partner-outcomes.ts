import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, publishRecordsTable } from "@workspace/db/schema";

const PROJECT_CAP = 20;

export type PartnerOutcomeRow = {
  draftsNeedingReview: number;
  generatingPieces: number;
  recentPublishFail: number;
  publishedCount: number;
  draftCount: number;
};

/**
 * Batched partner outcomes — one piece-status query + one publish-fail query.
 * Replaces N× loadCommandCenterSummary for the clients list.
 */
export async function loadPartnerOutcomesByProjectId(
  projectIds: number[],
): Promise<Map<number, PartnerOutcomeRow>> {
  const capped = projectIds.slice(0, PROJECT_CAP);
  const map = new Map<number, PartnerOutcomeRow>();
  for (const id of capped) {
    map.set(id, {
      draftsNeedingReview: 0,
      generatingPieces: 0,
      recentPublishFail: 0,
      publishedCount: 0,
      draftCount: 0,
    });
  }
  if (capped.length === 0) return map;

  const [pieceRows, failRows] = await Promise.all([
    db
      .select({
        projectId: contentPiecesTable.websiteProjectId,
        draftsNeedingReview: sql<number>`count(*) filter (where ${contentPiecesTable.status} = 'draft')`.mapWith(
          Number,
        ),
        generatingPieces: sql<number>`count(*) filter (where ${contentPiecesTable.status} = 'generating')`.mapWith(
          Number,
        ),
        publishedCount: sql<number>`count(*) filter (where ${contentPiecesTable.status} in ('published', 'ready'))`.mapWith(
          Number,
        ),
        draftCount: sql<number>`count(*) filter (where ${contentPiecesTable.status} != 'published')`.mapWith(
          Number,
        ),
      })
      .from(contentPiecesTable)
      .where(inArray(contentPiecesTable.websiteProjectId, capped))
      .groupBy(contentPiecesTable.websiteProjectId),
    db
      .select({
        projectId: publishRecordsTable.websiteProjectId,
        recentPublishFail: sql<number>`count(*)`.mapWith(Number),
      })
      .from(publishRecordsTable)
      .where(
        and(
          inArray(publishRecordsTable.websiteProjectId, capped),
          eq(publishRecordsTable.status, "failed"),
        ),
      )
      .groupBy(publishRecordsTable.websiteProjectId),
  ]);

  for (const row of pieceRows) {
    const cur = map.get(row.projectId);
    if (!cur) continue;
    cur.draftsNeedingReview = row.draftsNeedingReview;
    cur.generatingPieces = row.generatingPieces;
    cur.publishedCount = row.publishedCount;
    cur.draftCount = row.draftCount;
  }
  for (const row of failRows) {
    if (row.projectId == null) continue;
    const cur = map.get(row.projectId);
    if (!cur) continue;
    cur.recentPublishFail = row.recentPublishFail;
  }
  return map;
}
