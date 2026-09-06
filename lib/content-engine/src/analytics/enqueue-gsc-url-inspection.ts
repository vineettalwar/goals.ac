import { enqueue, QUEUES } from "@workspace/jobs";
import { logger } from "../core/logger";
import { wasRecentlyInspected } from "./gsc-url-inspection-rate-limit";

export interface EnqueueGscInspectionInput {
  projectId: number;
  publishedUrl: string;
  publishPlatform: string;
  contentPieceId?: number;
  publishRecordId?: number;
}

/**
 * Fire-and-forget: enqueue a GSC URL Inspection after a successful
 * WordPress publish. Never blocks or fails the publish itself.
 * Only fires for wordpress (case-insensitive) and http(s) URLs.
 */
export async function enqueueGscUrlInspectionAfterPublish(
  input: EnqueueGscInspectionInput,
): Promise<void> {
  try {
    if (!/^wordpress$/i.test(input.publishPlatform)) return;
    if (!/^https?:\/\//i.test(input.publishedUrl)) return;

    if (await wasRecentlyInspected(input.projectId, input.publishedUrl)) {
      logger.info(
        { projectId: input.projectId, url: input.publishedUrl },
        "GSC URL Inspection skipped (rate-limited)",
      );
      return;
    }

    await enqueue(QUEUES.gscUrlInspection, {
      projectId: input.projectId,
      inspectionUrl: input.publishedUrl,
      contentPieceId: input.contentPieceId,
      publishRecordId: input.publishRecordId,
    });
  } catch {
    // Never block publish
  }
}
