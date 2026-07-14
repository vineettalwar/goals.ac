import { QUEUES, type Ga4AnalyticsSyncJobData, type Ga4AnalyticsSyncPayload, type PgBoss } from "@workspace/jobs";
import {
  syncGa4PageMetrics,
  sweepGa4SyncProjects,
} from "@workspace/content-engine/analytics/ga4-analytics-service";
import { logger } from "../logger";

/** Daily at 08:00 UTC (after GSC at 07:00) */
export const GA4_ANALYTICS_SYNC_CRON = "0 8 * * *";

function isProjectPayload(data: Ga4AnalyticsSyncJobData): data is Ga4AnalyticsSyncPayload {
  return typeof (data as Partial<Ga4AnalyticsSyncPayload>).projectId === "number";
}

export async function registerGa4AnalyticsSyncHandler(boss: PgBoss): Promise<void> {
  await boss.work<Ga4AnalyticsSyncJobData>(QUEUES.ga4AnalyticsSync, async ([job]) => {
    const data = job.data;
    if (isProjectPayload(data)) {
      await runGa4SyncForProject(data.projectId);
    } else {
      await sweepGa4SyncProjects();
    }
  });
}

async function runGa4SyncForProject(projectId: number): Promise<void> {
  try {
    await syncGa4PageMetrics(projectId);
  } catch (err) {
    logger.error({ err, projectId }, "GA4 analytics sync failed");
  }
}

export { runGa4SyncForProject };
