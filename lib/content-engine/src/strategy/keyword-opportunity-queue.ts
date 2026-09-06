import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  keywordOpportunitiesTable,
  contentStrategiesTable,
  contentItemsTable,
} from "@workspace/db/schema";
import { parseAutopilotSettings } from "../support/autopilot/autopilot-scheduler";
import { logger } from "../core/logger";

export async function queueOpportunityToStrategy(
  opportunityId: number,
  userId: number,
): Promise<{ contentItemId: number; strategyId: number }> {
  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");
  if (opp.status === "queued") throw new Error("Opportunity already queued");

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, opp.websiteProjectId))
    .limit(1);
  if (!project) throw new Error("Access denied");

  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.websiteProjectId, opp.websiteProjectId))
    .orderBy(desc(contentStrategiesTable.year), desc(contentStrategiesTable.month))
    .limit(1);

  if (!strategy) {
    throw new Error("No content strategy found. Generate a 30-day strategy first.");
  }

  const draftItems = await db
    .select()
    .from(contentItemsTable)
    .where(and(eq(contentItemsTable.strategyId, strategy.id), eq(contentItemsTable.status, "draft")))
    .orderBy(asc(contentItemsTable.day))
    .limit(1);

  let contentItemId: number;

  if (draftItems.length > 0) {
    const item = draftItems[0]!;
    await db
      .update(contentItemsTable)
      .set({
        title: opp.suggestedTitle,
        topicAngle: opp.suggestedAngle,
        primaryKeyword: opp.keyword,
        format: "Blog article",
      })
      .where(eq(contentItemsTable.id, item.id));
    contentItemId = item.id;
  } else {
    const [newItem] = await db
      .insert(contentItemsTable)
      .values({
        strategyId: strategy.id,
        day: 29,
        title: opp.suggestedTitle,
        format: "Blog article",
        topicAngle: opp.suggestedAngle,
        primaryKeyword: opp.keyword,
        status: "draft",
      })
      .returning();
    contentItemId = newItem.id;
  }

  await db
    .update(keywordOpportunitiesTable)
    .set({ status: "queued", contentItemId })
    .where(eq(keywordOpportunitiesTable.id, opportunityId));

  return { contentItemId, strategyId: strategy.id };
}

export async function autoQueueHighScoreOpportunities(projectId: number, userId: number): Promise<number> {
  const [project] = await db
    .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project) return 0;

  const settings = parseAutopilotSettings(project.autopilotSettings);
  if (!settings.autoQueueOpportunities) return 0;

  const threshold = settings.opportunityScoreThreshold ?? 60;

  const open = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        eq(keywordOpportunitiesTable.status, "open"),
      ),
    )
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore));

  let queued = 0;
  for (const opp of open) {
    if (opp.opportunityScore < threshold) break;
    try {
      await queueOpportunityToStrategy(opp.id, userId);
      queued += 1;
      if (queued >= 3) break;
    } catch (err) {
      logger.warn({ err, opportunityId: opp.id }, "Auto-queue opportunity failed");
      break;
    }
  }

  return queued;
}

export async function queueOpportunityAndGenerate(
  opportunityId: number,
  userId: number,
): Promise<{
  contentItemId: number;
  strategyId: number;
  primaryPieceId: number;
}> {
  const queued = await queueOpportunityToStrategy(opportunityId, userId);
  const { generateFromContentItem } = await import("./autopilot-orchestrator");
  const [opp] = await db
    .select({ websiteProjectId: keywordOpportunitiesTable.websiteProjectId })
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");

  const generated = await generateFromContentItem(
    queued.contentItemId,
    opp.websiteProjectId,
    userId,
    { generateVariants: false },
  );

  return {
    contentItemId: queued.contentItemId,
    strategyId: queued.strategyId,
    primaryPieceId: generated.primaryPieceId,
  };
}
