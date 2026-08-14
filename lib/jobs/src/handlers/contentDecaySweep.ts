import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentDecaySweepJobData, ContentDecaySweepPayload, PgBoss } from "@workspace/jobs";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { discoverContentDecay } from "@workspace/content-engine/strategy/content-decay-service";
import { logger } from "../logger";

/**
 * Weekly on Monday at 07:00 UTC.
 *
 * Deliberately after the Sunday keyword sweep: a refresh opportunity for a page
 * that already ranks should be in the queue before new-article opportunities
 * compete for the same autopilot slot.
 */
export const CONTENT_DECAY_SWEEP_CRON = "0 7 * * 1";

function isProjectPayload(data: ContentDecaySweepJobData): data is ContentDecaySweepPayload {
  return typeof (data as Partial<ContentDecaySweepPayload>).projectId === "number";
}

export async function processContentDecaySweep(data: ContentDecaySweepJobData): Promise<void> {
  if (isProjectPayload(data)) {
    const inserted = await discoverContentDecay(data.projectId);
    logger.info({ projectId: data.projectId, inserted }, "Content decay sweep for project");
    return;
  }

  await sweepDecayProjects();
}

export async function registerContentDecaySweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentDecaySweepJobData>(QUEUES.contentDecaySweep, async ([job]) => {
    await processContentDecaySweep(job.data);
  });
}

async function sweepDecayProjects(): Promise<void> {
  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable);

  const due = projects.filter((project) => {
    const settings = parseAutopilotSettings(project.autopilotSettings);
    return settings.enabled || settings.autoQueueOpportunities;
  });

  logger.info({ count: due.length }, "Content decay sweep: projects due");

  for (const project of due) {
    await enqueue(QUEUES.contentDecaySweep, { projectId: project.id });
  }
}
