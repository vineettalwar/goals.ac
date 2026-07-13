import { QUEUES, type BrandVoiceIndexJobData, type PgBoss } from "@workspace/jobs";
import { indexBrandVoiceSources } from "@workspace/content-engine/brand-voice-indexer";
import { logger } from "../logger";

export async function registerBrandVoiceIndexHandler(boss: PgBoss): Promise<void> {
  await boss.work<BrandVoiceIndexJobData>(QUEUES.brandVoiceIndex, async ([job]) => {
    const { projectId, sourceIds, regenerateSkill } = job.data;
    try {
      await indexBrandVoiceSources(projectId, sourceIds, { regenerateSkill });
    } catch (err) {
      logger.error({ err, projectId }, "Brand voice index job failed");
    }
  });
}
