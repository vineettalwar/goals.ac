import { QUEUES, type GscSearchAnalyticsSyncJobData, type GscSearchAnalyticsSyncPayload, type PgBoss } from "@workspace/jobs";
import {
  syncGscSearchAnalytics,
  sweepGscSyncProjects,
} from "@workspace/content-engine/analytics/gsc-search-analytics-service";
import { discoverOpportunities } from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

/** Daily at 07:00 UTC */
export const GSC_SEARCH_ANALYTICS_SYNC_CRON = "0 7 * * *";

function isProjectPayload(data: GscSearchAnalyticsSyncJobData): data is GscSearchAnalyticsSyncPayload {
  return typeof (data as Partial<GscSearchAnalyticsSyncPayload>).projectId === "number";
}

export async function processGscSearchAnalyticsSync(
  data: GscSearchAnalyticsSyncJobData,
): Promise<void> {
  if (isProjectPayload(data)) {
    await runGscSyncForProject(data.projectId, data.userId);
  } else {
    await sweepGscSyncProjects();
  }
}

export async function registerGscSearchAnalyticsSyncHandler(boss: PgBoss): Promise<void> {
  await boss.work<GscSearchAnalyticsSyncJobData>(QUEUES.gscSearchAnalyticsSync, async ([job]) => {
    await processGscSearchAnalyticsSync(job.data);
  });
}

async function runGscSyncForProject(projectId: number, userId?: number): Promise<void> {
  try {
    await syncGscSearchAnalytics(projectId);
    const [project] = await db
      .select({ userId: websiteProjectsTable.userId })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);
    if (project) {
      await discoverOpportunities(projectId, userId ?? project.userId, { sources: ["gsc"] });
    }
  } catch (err) {
    logger.error({ err, projectId }, "GSC search analytics sync failed");
  }
}

export { runGscSyncForProject };
