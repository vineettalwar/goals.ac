import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { enqueue } from "@workspace/jobs/boss";
import { QUEUES } from "@workspace/jobs/queues";
import { getGa4SyncStatus } from "../analytics/ga4-analytics-service";
import { getGscSyncStatus } from "../analytics/gsc-search-analytics-service";
import { enqueueGscUrlInspectionAfterPublish } from "../analytics/enqueue-gsc-url-inspection";
import { logger } from "../core/logger";

export type MeasureScheduleResult = {
  gscQueued: boolean;
  ga4Queued: boolean;
  inspectQueued: boolean;
  gscConnected: boolean;
  ga4Connected: boolean;
};

/**
 * After a piece reaches published: queue GSC/GA sync when those properties
 * are connected. Offline / no credentials → records the skip, does not invent metrics.
 */
export async function scheduleMeasureAfterPublish(input: {
  projectId: number;
  userId?: number;
  contentPieceId: number;
  publishedUrl?: string | null;
  publishPlatform?: string | null;
}): Promise<MeasureScheduleResult> {
  const [gsc, ga4] = await Promise.all([getGscSyncStatus(input.projectId), getGa4SyncStatus(input.projectId)]);
  const result: MeasureScheduleResult = {
    gscQueued: false,
    ga4Queued: false,
    inspectQueued: false,
    gscConnected: gsc.connected,
    ga4Connected: ga4.connected,
  };

  try {
    if (gsc.connected) {
      await enqueue(QUEUES.gscSearchAnalyticsSync, { projectId: input.projectId, userId: input.userId });
      result.gscQueued = true;
    }
    if (ga4.connected) {
      await enqueue(QUEUES.ga4AnalyticsSync, { projectId: input.projectId, userId: input.userId });
      result.ga4Queued = true;
    }
    if (input.publishedUrl && input.publishPlatform) {
      await enqueueGscUrlInspectionAfterPublish({
        projectId: input.projectId,
        publishedUrl: input.publishedUrl,
        publishPlatform: input.publishPlatform,
        contentPieceId: input.contentPieceId,
      });
      result.inspectQueued = /^wordpress$/i.test(input.publishPlatform) && /^https?:\/\//i.test(input.publishedUrl);
    }
  } catch (err) {
    logger.warn({ err, projectId: input.projectId, contentPieceId: input.contentPieceId }, "Measure enqueue failed");
  }

  try {
    const [piece] = await db
      .select({ pieceMetadata: contentPiecesTable.pieceMetadata })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, input.contentPieceId))
      .limit(1);
    const meta = (piece?.pieceMetadata ?? {}) as Record<string, unknown>;
    await db
      .update(contentPiecesTable)
      .set({
        pieceMetadata: {
          ...meta,
          measure: {
            scheduledAt: new Date().toISOString(),
            gscQueued: result.gscQueued,
            ga4Queued: result.ga4Queued,
            gscConnected: result.gscConnected,
            ga4Connected: result.ga4Connected,
          },
        },
      })
      .where(eq(contentPiecesTable.id, input.contentPieceId));
  } catch (err) {
    logger.warn({ err, contentPieceId: input.contentPieceId }, "Measure metadata write failed");
  }

  return result;
}
