import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentItemsTable,
  contentStrategiesTable,
  keywordOpportunitiesTable,
  roadmapsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { computePlannedDate } from "./autopilot-orchestrator";
import { parseAutopilotSettings } from "../support/autopilot/autopilot-scheduler";
import { discoverColdStartOpportunities } from "./keyword-opportunity-discover/cold-start";
import { resolveOrgVerticalForProject } from "../support/brand/brand-context-loader";
import { getVerticalPreset } from "../verticals/vertical-presets";
import { logger } from "../core/logger";

export interface DueContentItem {
  itemId: number;
  strategyId: number;
}

export interface DueContentRow {
  itemId: number;
  strategyId: number;
  year: number;
  month: number;
  day: number;
}

/** Calendar day Autopilot uses for "today" — matches `computePlannedDate`'s cap of 28. */
export function plannedDayFromIso(today: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw, dayRaw] = today.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return {
    year: Number.isFinite(year) ? year : 1970,
    month: Number.isFinite(month) ? month : 1,
    day: Math.min(28, Number.isFinite(day) && day > 0 ? day : 1),
  };
}

export function shouldAttemptAutopilotRefill(opts: {
  hasDueItem: boolean;
  autoQueueOpportunities: boolean;
}): boolean {
  return !opts.hasDueItem && opts.autoQueueOpportunities;
}

export function pickOpenOpportunityForRefill<T extends { opportunityScore: number }>(
  open: T[],
  threshold: number,
): T | undefined {
  return open.find((row) => row.opportunityScore >= threshold);
}

export function findNextDueFromRows(rows: DueContentRow[], today: string): DueContentItem | null {
  for (const row of rows) {
    if (computePlannedDate(row.year, row.month, row.day) <= today) {
      return { itemId: row.itemId, strategyId: row.strategyId };
    }
  }
  return null;
}

export async function findNextDueContentItem(
  projectId: number,
  today: string,
): Promise<DueContentItem | null> {
  const rows = await db
    .select({
      itemId: contentItemsTable.id,
      strategyId: contentItemsTable.strategyId,
      day: contentItemsTable.day,
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

  return findNextDueFromRows(rows, today);
}

async function getOrCreateAutopilotStrategy(
  projectId: number,
  today: string,
): Promise<number> {
  const { year, month } = plannedDayFromIso(today);

  const [thisMonth] = await db
    .select({ id: contentStrategiesTable.id })
    .from(contentStrategiesTable)
    .where(
      and(
        eq(contentStrategiesTable.websiteProjectId, projectId),
        eq(contentStrategiesTable.year, year),
        eq(contentStrategiesTable.month, month),
      ),
    )
    .limit(1);
  if (thisMonth) return thisMonth.id;

  const [anyStrategy] = await db
    .select({
      id: contentStrategiesTable.id,
      roadmapId: contentStrategiesTable.roadmapId,
      industry: contentStrategiesTable.industry,
      location: contentStrategiesTable.location,
      stage: contentStrategiesTable.stage,
    })
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.websiteProjectId, projectId))
    .orderBy(desc(contentStrategiesTable.year), desc(contentStrategiesTable.month))
    .limit(1);

  if (anyStrategy) {
    const [created] = await db
      .insert(contentStrategiesTable)
      .values({
        roadmapId: anyStrategy.roadmapId,
        websiteProjectId: projectId,
        industry: anyStrategy.industry,
        location: anyStrategy.location,
        stage: anyStrategy.stage,
        month,
        year,
      })
      .returning({ id: contentStrategiesTable.id });
    return created.id;
  }

  const vertical = await resolveOrgVerticalForProject(projectId);
  const preset = getVerticalPreset(vertical);
  const slug = `autopilot-${projectId}`;

  const [insertedRoadmap] = await db
    .insert(roadmapsTable)
    .values({
      slug,
      industry: preset.label,
      location: "Global",
      stage: "Autopilot",
      content: { source: "autopilot", generatedForProjectId: projectId },
    })
    .onConflictDoNothing({ target: roadmapsTable.slug })
    .returning();

  const roadmapRow =
    insertedRoadmap ??
    (await db.select().from(roadmapsTable).where(eq(roadmapsTable.slug, slug)).limit(1))[0];
  if (!roadmapRow) throw new Error("Failed to create autopilot roadmap");

  const [created] = await db
    .insert(contentStrategiesTable)
    .values({
      roadmapId: roadmapRow.id,
      websiteProjectId: projectId,
      industry: roadmapRow.industry,
      location: roadmapRow.location,
      stage: roadmapRow.stage,
      month,
      year,
    })
    .returning({ id: contentStrategiesTable.id });
  return created.id;
}

async function loadOpenOpportunities(projectId: number) {
  return db
    .select()
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        eq(keywordOpportunitiesTable.status, "open"),
      ),
    )
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore));
}

async function insertDueTodayItem(opts: {
  strategyId: number;
  today: string;
  title: string;
  topicAngle: string;
  primaryKeyword: string;
  opportunityId: number;
}): Promise<DueContentItem> {
  const { day } = plannedDayFromIso(opts.today);
  const [item] = await db
    .insert(contentItemsTable)
    .values({
      strategyId: opts.strategyId,
      day,
      title: opts.title,
      format: "Blog article",
      topicAngle: opts.topicAngle,
      primaryKeyword: opts.primaryKeyword,
      status: "draft",
    })
    .returning({ id: contentItemsTable.id });

  await db
    .update(keywordOpportunitiesTable)
    .set({ status: "queued", contentItemId: item.id })
    .where(eq(keywordOpportunitiesTable.id, opts.opportunityId));

  return { itemId: item.id, strategyId: opts.strategyId };
}

/**
 * Returns the next due calendar draft, or inserts one due-today item from a
 * keyword opportunity / cold-start seed. Never overwrites existing drafts.
 */
export async function fillDueAutopilotItem(
  projectId: number,
  userId: number,
  today: string,
): Promise<DueContentItem | null> {
  const due = await findNextDueContentItem(projectId, today);
  if (due) return due;

  const [project] = await db
    .select({
      id: websiteProjectsTable.id,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return null;

  const settings = parseAutopilotSettings(project.autopilotSettings);
  if (!shouldAttemptAutopilotRefill({ hasDueItem: false, autoQueueOpportunities: settings.autoQueueOpportunities === true })) {
    return null;
  }

  const threshold = settings.opportunityScoreThreshold ?? 60;
  let open = await loadOpenOpportunities(projectId);
  let opportunity = pickOpenOpportunityForRefill(open, threshold);

  if (!opportunity) {
    try {
      await discoverColdStartOpportunities(projectId, userId);
    } catch (err) {
      logger.warn({ err, projectId }, "Autopilot refill: cold-start discovery failed");
    }
    open = await loadOpenOpportunities(projectId);
    opportunity = pickOpenOpportunityForRefill(open, 0);
  }

  if (!opportunity) {
    logger.info({ projectId }, "Autopilot refill: no opportunity to queue");
    return null;
  }

  const strategyId = await getOrCreateAutopilotStrategy(projectId, today);
  return insertDueTodayItem({
    strategyId,
    today,
    title: opportunity.suggestedTitle,
    topicAngle: opportunity.suggestedAngle,
    primaryKeyword: opportunity.keyword,
    opportunityId: opportunity.id,
  });
}
