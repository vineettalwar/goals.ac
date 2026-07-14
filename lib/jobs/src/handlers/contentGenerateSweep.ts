import { eq, and, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  contentStrategiesTable,
  contentItemsTable,
} from "@workspace/db/schema";
import { QUEUES, enqueue } from "@workspace/jobs";
import type {
  ContentGenerateSweepJobData,
  ContentGenerateSweepPayload,
  PgBoss,
} from "@workspace/jobs";
import { computePlannedDate } from "@workspace/content-engine/strategy/autopilot-orchestrator";
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

export async function registerContentGenerateSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentGenerateSweepJobData>(QUEUES.contentGenerateSweep, async ([job]) => {
    const data = job.data;
    if (isProjectSweepPayload(data)) {
      await runAutopilotForProject(data.projectId);
    } else {
      await sweepAutopilotProjects();
    }
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

async function findNextDueContentItem(
  projectId: number,
  today: string,
): Promise<{ itemId: number; strategyId: number } | null> {
  const rows = await db
    .select({
      itemId: contentItemsTable.id,
      strategyId: contentItemsTable.strategyId,
      day: contentItemsTable.day,
      status: contentItemsTable.status,
      year: contentStrategiesTable.year,
      month: contentStrategiesTable.month,
    })
    .from(contentItemsTable)
    .innerJoin(contentStrategiesTable, eq(contentItemsTable.strategyId, contentStrategiesTable.id))
    .where(
      and(
        eq(contentStrategiesTable.websiteProjectId, projectId),
        eq(contentItemsTable.status, "draft"),
      ),
    )
    .orderBy(asc(contentStrategiesTable.year), asc(contentStrategiesTable.month), asc(contentItemsTable.day));

  for (const row of rows) {
    const plannedDate = computePlannedDate(row.year, row.month, row.day);
    if (plannedDate <= today) {
      return { itemId: row.itemId, strategyId: row.strategyId };
    }
  }

  return null;
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
  const next = await findNextDueContentItem(projectId, today);
  if (!next) {
    logger.info({ projectId }, "Autopilot: no due content items");
    return;
  }

  await enqueue(QUEUES.contentGenerate, {
    contentItemId: next.itemId,
    projectId,
    userId: project.userId,
    generateVariants: true,
    triggeredByAutopilot: true,
  });

  await db
    .update(websiteProjectsTable)
    .set({
      autopilotSettings: {
        ...settings,
        lastRunAt: new Date().toISOString(),
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  logger.info({ projectId, contentItemId: next.itemId }, "Autopilot: enqueued content generation");
}
