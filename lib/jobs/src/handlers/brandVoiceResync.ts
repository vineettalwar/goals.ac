import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import {
  QUEUES,
  type BrandVoiceResyncJobData,
  type BrandVoiceResyncPayload,
  type PgBoss,
} from "@workspace/jobs";
import { ingestBrandVoiceDocuments } from "@workspace/content-engine/brand/brand-voice-indexer";
import { loadCmsContentForBrandVoice } from "@workspace/content-engine/support/brand/brand-scan-context";
import { syncSocialHistory } from "@workspace/content-engine/social/social-history-sync-service";
import { logger } from "../logger";

/** Weekly Monday 09:00 UTC */
export const BRAND_VOICE_RESYNC_CRON = "0 9 * * 1";

function isProjectPayload(data: BrandVoiceResyncJobData): data is BrandVoiceResyncPayload {
  return typeof (data as Partial<BrandVoiceResyncPayload>).projectId === "number";
}

export async function processBrandVoiceResync(data: BrandVoiceResyncJobData): Promise<void> {
  if (isProjectPayload(data)) {
    await runBrandVoiceResyncForProject(data.projectId, data.userId);
  } else {
    await sweepBrandVoiceResync();
  }
}

export async function registerBrandVoiceResyncHandler(boss: PgBoss): Promise<void> {
  await boss.work<BrandVoiceResyncJobData>(QUEUES.brandVoiceResync, async ([job]) => {
    await processBrandVoiceResync(job.data);
  });
}

async function sweepBrandVoiceResync(): Promise<void> {
  const projects = await db
    .select({ id: websiteProjectsTable.id, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable);

  for (const project of projects) {
    await runBrandVoiceResyncForProject(project.id, project.userId).catch((err) => {
      logger.warn({ err, projectId: project.id }, "Brand voice resync failed for project");
    });
  }
}

export async function runBrandVoiceResyncForProject(
  projectId: number,
  userId?: number,
): Promise<void> {
  const cmsDocs = await loadCmsContentForBrandVoice(projectId);
  if (cmsDocs.length > 0) {
    await ingestBrandVoiceDocuments(projectId, cmsDocs);
  }

  if (userId) {
    await syncSocialHistory(projectId, userId);
  }
}
