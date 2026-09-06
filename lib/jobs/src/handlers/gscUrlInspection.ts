import { QUEUES, type GscUrlInspectionPayload, type PgBoss } from "@workspace/jobs";
import { inspectPublishedUrl } from "@workspace/content-engine/analytics/gsc-url-inspection-service";
import { wasRecentlyInspected } from "@workspace/content-engine/analytics/gsc-url-inspection-rate-limit";
import { logger } from "../logger";

export async function processGscUrlInspection(payload: GscUrlInspectionPayload): Promise<void> {
  const { projectId, inspectionUrl, contentPieceId, publishRecordId } = payload;

  if (await wasRecentlyInspected(projectId, inspectionUrl)) {
    logger.info({ projectId, inspectionUrl }, "GSC URL Inspection skipped (rate-limited)");
    return;
  }

  try {
    await inspectPublishedUrl({ projectId, inspectionUrl, contentPieceId, publishRecordId });
    logger.info({ projectId, inspectionUrl }, "GSC URL Inspection job completed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Rate-limit soft failures from Google (HTTP 429 / quota) — let pg-boss retry
    if (/rate.?limit|quota|429/i.test(msg)) {
      logger.warn({ err, projectId, inspectionUrl }, "GSC URL Inspection rate-limited, will retry");
      throw err;
    }
    logger.error({ err, projectId, inspectionUrl }, "GSC URL Inspection job failed");
    throw err;
  }
}

export async function registerGscUrlInspectionHandler(boss: PgBoss): Promise<void> {
  await boss.work<GscUrlInspectionPayload>(QUEUES.gscUrlInspection, async ([job]) => {
    await processGscUrlInspection(job.data);
  });
}
