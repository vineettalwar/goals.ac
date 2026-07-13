import { QUEUES, type SocialMetricsSyncJobData, type SocialMetricsSyncPayload, type PgBoss } from "@workspace/jobs";
import {
  syncSocialPostMetrics,
  sweepSocialMetricsSyncProjects,
} from "@workspace/content-engine/social-metrics-service";
import { logger } from "../logger";

/** Daily at 09:00 UTC */
export const SOCIAL_METRICS_SYNC_CRON = "0 9 * * *";

function isProjectPayload(data: SocialMetricsSyncJobData): data is SocialMetricsSyncPayload {
  return typeof (data as Partial<SocialMetricsSyncPayload>).projectId === "number";
}

export async function registerSocialMetricsSyncHandler(boss: PgBoss): Promise<void> {
  await boss.work<SocialMetricsSyncJobData>(QUEUES.socialMetricsSync, async ([job]) => {
    const data = job.data;
    if (isProjectPayload(data)) {
      await runSocialMetricsSyncForProject(data.projectId, data.userId);
    } else {
      await sweepSocialMetricsSyncProjects();
    }
  });
}

async function runSocialMetricsSyncForProject(projectId: number, userId?: number): Promise<void> {
  try {
    const { websiteProjectsTable } = await import("@workspace/db/schema");
    const { db } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [project] = await db
      .select({ userId: websiteProjectsTable.userId })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);
    if (!project) return;
    await syncSocialPostMetrics(projectId, userId ?? project.userId);
  } catch (err) {
    logger.error({ err, projectId }, "Social metrics sync failed");
  }
}

export { runSocialMetricsSyncForProject };
