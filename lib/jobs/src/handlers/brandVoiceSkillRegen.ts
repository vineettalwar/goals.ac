import { QUEUES, type BrandVoiceSkillRegenJobData, type PgBoss } from "@workspace/jobs";
import { regenerateBrandVoiceSkill } from "@workspace/content-engine/brand-voice-skill";
import { logger } from "../logger";

export async function registerBrandVoiceSkillRegenHandler(boss: PgBoss): Promise<void> {
  await boss.work<BrandVoiceSkillRegenJobData>(QUEUES.brandVoiceSkillRegen, async ([job]) => {
    const { projectId } = job.data;
    try {
      await regenerateBrandVoiceSkill(projectId);
    } catch (err) {
      logger.error({ err, projectId }, "Brand voice skill regen job failed");
    }
  });
}
