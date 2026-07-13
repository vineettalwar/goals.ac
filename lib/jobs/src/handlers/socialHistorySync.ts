import {
  QUEUES,
  type SocialHistorySyncJobData,
  type SocialHistorySyncPayload,
  type PgBoss,
} from "@workspace/jobs";
import { syncSocialHistory, sweepSocialHistorySyncProjects } from "@workspace/content-engine/social-history-sync-service";
import { isValidSocialPlatform } from "@workspace/content-engine/platform-voice";
import type { SocialPlatformId } from "@workspace/db/schema";
import { logger } from "../logger";

/** Weekly Monday 10:00 UTC — after brand voice resync */
export const SOCIAL_HISTORY_SYNC_CRON = "0 10 * * 1";

function isProjectPayload(data: SocialHistorySyncJobData): data is SocialHistorySyncPayload {
  return typeof (data as Partial<SocialHistorySyncPayload>).projectId === "number";
}

export async function registerSocialHistorySyncHandler(boss: PgBoss): Promise<void> {
  await boss.work<SocialHistorySyncJobData>(QUEUES.socialHistorySync, async ([job]) => {
    const data = job.data;
    if (isProjectPayload(data)) {
      const platform =
        data.platform && isValidSocialPlatform(data.platform)
          ? (data.platform as SocialPlatformId)
          : undefined;
      await syncSocialHistory(data.projectId, data.userId, platform);
    } else {
      await sweepSocialHistorySyncProjects();
    }
  });
}
