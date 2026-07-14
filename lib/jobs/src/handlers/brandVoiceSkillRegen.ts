import { QUEUES, type BrandVoiceSkillRegenJobData, type PgBoss } from "@workspace/jobs";
import { regenerateBrandVoiceSkill } from "@workspace/content-engine/brand/brand-voice-skill";
import {
  cancelWorkerAiBilling,
  completeWorkerAiBilling,
  prepareWorkerAiBilling,
  resolveProjectOwnerUserId,
} from "../worker-billing";
import { logger } from "../logger";

export async function processBrandVoiceSkillRegen(payload: BrandVoiceSkillRegenJobData): Promise<void> {
  const { projectId } = payload;
  const userId = await resolveProjectOwnerUserId(projectId);
  if (!userId) {
    logger.warn({ projectId }, "Brand voice skill regen: project owner not found");
    return;
  }

  const billing = await prepareWorkerAiBilling({
    userId,
    tier: "planning",
    quotaKind: "article",
  });
  if (!billing.ok) {
    logger.warn({ projectId, reason: billing.reason }, "Brand voice skill regen skipped: billing denied");
    return;
  }

  try {
    await regenerateBrandVoiceSkill(projectId);
    await completeWorkerAiBilling(billing.session, {
      userId,
      eventType: "brand_voice_skill",
    });
  } catch (err) {
    await cancelWorkerAiBilling(billing.session, err instanceof Error ? err.message : "brand_voice_skill_failed");
    logger.error({ err, projectId }, "Brand voice skill regen job failed");
    throw err;
  }
}

export async function registerBrandVoiceSkillRegenHandler(boss: PgBoss): Promise<void> {
  await boss.work<BrandVoiceSkillRegenJobData>(QUEUES.brandVoiceSkillRegen, async ([job]) => {
    await processBrandVoiceSkillRegen(job.data);
  });
}
