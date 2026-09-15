import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  contentItemsTable,
} from "@workspace/db/schema";
import { QUEUES, enqueue } from "@workspace/jobs";
import type {
  ContentGenerateSweepJobData,
  ContentGenerateSweepPayload,
  PgBoss,
} from "@workspace/jobs";
import { fillDueAutopilotItem } from "@workspace/content-engine/strategy/autopilot-refill";
import {
  listActionQueueItems,
  pickAutopilotQueueWork,
  startExecuteActionRun,
} from "@workspace/content-engine/agent-loop";
import {
  parseAutopilotSettings,
  shouldRunAutopilot,
  todayInTimezone,
} from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { logger } from "../logger";

/** Every hour at :30 — handler checks project timezone + preferredRunHour. */
export const CONTENT_GENERATE_SWEEP_CRON = "30 * * * *";

function isProjectSweepPayload(
  data: ContentGenerateSweepJobData,
): data is ContentGenerateSweepPayload {
  return typeof (data as Partial<ContentGenerateSweepPayload>).projectId === "number";
}

export async function processContentGenerateSweep(data: ContentGenerateSweepJobData): Promise<void> {
  if (isProjectSweepPayload(data)) {
    await runAutopilotForProject(data.projectId);
  } else {
    await sweepAutopilotProjects();
  }
}

export async function registerContentGenerateSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentGenerateSweepJobData>(QUEUES.contentGenerateSweep, async ([job]) => {
    await processContentGenerateSweep(job.data);
  });
}

async function sweepAutopilotProjects(): Promise<void> {
  const projects = await db
    .select({
      id: websiteProjectsTable.id,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable);

  const due = projects.filter((p) => shouldRunAutopilot(parseAutopilotSettings(p.autopilotSettings)));

  logger.info({ count: due.length }, "Content generate sweep: autopilot projects due");

  for (const project of due) {
    await enqueue(QUEUES.contentGenerateSweep, { projectId: project.id });
  }
}

export async function runAutopilotForProject(projectId: number): Promise<void> {
  const [project] = await db
    .select({
      id: websiteProjectsTable.id,
      userId: websiteProjectsTable.userId,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!project) {
    logger.warn({ projectId }, "Autopilot: project not found");
    return;
  }

  const settings = parseAutopilotSettings(project.autopilotSettings);
  if (!shouldRunAutopilot(settings)) {
    return;
  }

  const today = todayInTimezone(settings.timezone);
  const queueItems = await listActionQueueItems(projectId);
  const preferred = pickAutopilotQueueWork(queueItems);
  if (preferred) {
    try {
      const started = await startExecuteActionRun({
        projectId,
        userId: project.userId,
        actionId: preferred.id,
      });
      await enqueue(QUEUES.agentLoop, started.payload);
      logger.info(
        { projectId, actionId: preferred.id, runId: started.runId, score: preferred.opportunityScore },
        "Autopilot: enqueued action-queue item",
      );
      return;
    } catch (err) {
      logger.warn({ projectId, actionId: preferred.id, err }, "Autopilot: action-queue claim failed, falling back to calendar");
    }
  }

  const next = await fillDueAutopilotItem(projectId, project.userId, today);
  if (!next) {
    logger.info({ projectId }, "Autopilot: no due content items");
    return;
  }

  // Atomic claim: prevents duplicate generation/billing when overlapping
  // sweeps select the same due item.
  const claimed = await db
    .update(contentItemsTable)
    .set({ status: "queued" })
    .where(and(eq(contentItemsTable.id, next.itemId), eq(contentItemsTable.status, "draft")))
    .returning({ id: contentItemsTable.id });
  if (claimed.length === 0) {
    logger.info({ projectId, contentItemId: next.itemId }, "Autopilot: item already claimed");
    return;
  }

  await enqueue(QUEUES.contentGenerate, {
    contentItemId: next.itemId,
    projectId,
    userId: project.userId,
    generateVariants: true,
    triggeredByAutopilot: true,
  });

  // Do not stamp lastRunAt here — HIGH-7: if generation fails after enqueue,
  // shouldRunAutopilot must still allow a retry on the next sweep. Stamp on
  // successful generate completion in contentGenerate.ts instead.

  logger.info({ projectId, contentItemId: next.itemId }, "Autopilot: enqueued content generation");
}
