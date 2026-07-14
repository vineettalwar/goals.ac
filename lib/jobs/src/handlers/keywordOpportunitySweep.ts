import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { KeywordOpportunitySweepJobData, KeywordOpportunitySweepPayload, PgBoss } from "@workspace/jobs";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import {
  discoverOpportunities,
  autoQueueHighScoreOpportunities,
} from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { logger } from "../logger";

/** Weekly on Sunday at 09:00 UTC */
export const KEYWORD_OPPORTUNITY_SWEEP_CRON = "0 9 * * 0";

function isProjectPayload(data: KeywordOpportunitySweepJobData): data is KeywordOpportunitySweepPayload {
  return typeof (data as Partial<KeywordOpportunitySweepPayload>).projectId === "number";
}

export async function registerKeywordOpportunitySweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<KeywordOpportunitySweepJobData>(QUEUES.keywordOpportunitySweep, async ([job]) => {
    const data = job.data;
    if (isProjectPayload(data)) {
      await runOpportunityDiscoveryForProject(data.projectId, data.userId);
    } else {
      await sweepOpportunityProjects();
    }
  });
}

async function sweepOpportunityProjects(): Promise<void> {
  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      userId: websiteProjectsTable.userId,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable);

  const due = projects.filter((p) => {
    const s = parseAutopilotSettings(p.autopilotSettings);
    return s.enabled || s.autoQueueOpportunities;
  });

  logger.info({ count: due.length }, "Keyword opportunity sweep: projects due");

  for (const project of due) {
    await enqueue(QUEUES.keywordOpportunitySweep, { projectId: project.id, userId: project.userId });
  }
}

async function runOpportunityDiscoveryForProject(projectId: number, userId?: number): Promise<void> {
  const [project] = await db
    .select({ userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return;

  const uid = userId ?? project.userId;
  try {
    await discoverOpportunities(projectId, uid);
    await autoQueueHighScoreOpportunities(projectId, uid);
  } catch (err) {
    logger.error({ err, projectId }, "Keyword opportunity discovery failed");
  }
}

export { runOpportunityDiscoveryForProject };
