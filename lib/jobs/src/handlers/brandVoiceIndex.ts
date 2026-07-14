import { QUEUES, type BrandVoiceIndexJobData, type PgBoss } from "@workspace/jobs";
import { indexBrandVoiceSources } from "@workspace/content-engine/brand-voice-indexer";
import {
  cancelWorkerAiBilling,
  completeWorkerAiBilling,
  prepareWorkerAiBilling,
  resolveProjectOwnerUserId,
} from "../worker-billing";
import { logger } from "../logger";

export async function registerBrandVoiceIndexHandler(boss: PgBoss): Promise<void> {
  await boss.work<BrandVoiceIndexJobData>(QUEUES.brandVoiceIndex, async ([job]) => {
    const { projectId, sourceIds, regenerateSkill } = job.data;
    const userId = await resolveProjectOwnerUserId(projectId);
    if (!userId) {
      logger.warn({ projectId }, "Brand voice index: project owner not found");
      return;
    }

    const billing = await prepareWorkerAiBilling({
      userId,
      tier: "execution",
      quotaKind: "article",
    });
    if (!billing.ok) {
      logger.warn({ projectId, reason: billing.reason }, "Brand voice index skipped: billing denied");
      return;
    }

    try {
      await indexBrandVoiceSources(projectId, sourceIds, { regenerateSkill });
      await completeWorkerAiBilling(billing.session, {
        userId,
        eventType: "brand_voice_index",
      });
    } catch (err) {
      await cancelWorkerAiBilling(billing.session, err instanceof Error ? err.message : "brand_voice_index_failed");
      logger.error({ err, projectId }, "Brand voice index job failed");
    }
  });
}
