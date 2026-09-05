import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentStrategiesTable,
  keywordOpportunitiesTable,
  roadmapsTable,
  type OrgVertical,
} from "@workspace/db/schema";
import { enqueue, QUEUES } from "@workspace/jobs";
import {
  queueOpportunityToStrategy,
  discoverColdStartOpportunities,
} from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { getVerticalPreset } from "@workspace/content-engine/vertical-presets";
import { seedColdStartOpportunities } from "./cold-start";

export type DispatchFirstArticleResult =
  | { dispatched: true; contentItemId: number }
  | { dispatched: false; contentItemId: null; error: string };

/**
 * Every project needs a `content_strategies` row before an opportunity can be
 * queued into it (`queueOpportunityToStrategy` requires one). Onboarding does not
 * run the full 30-day AI strategy generator here — that is real AI spend and real
 * latency neither of which belongs on the completion path (PRD D5) — so this
 * creates a minimal roadmap + strategy pair scoped to the project instead.
 */
async function initMinimalStrategy(
  projectId: number,
  vertical: OrgVertical | null | undefined,
): Promise<number> {
  const existing = await db
    .select({ id: contentStrategiesTable.id })
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.websiteProjectId, projectId))
    .orderBy(desc(contentStrategiesTable.createdAt))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const preset = getVerticalPreset(vertical);
  const slug = `onboarding-${projectId}`;
  const now = new Date();

  const [roadmap] = await db
    .insert(roadmapsTable)
    .values({
      slug,
      industry: preset.label,
      location: "Global",
      stage: "New client",
      content: { source: "onboarding", generatedForProjectId: projectId },
    })
    .onConflictDoNothing({ target: roadmapsTable.slug })
    .returning();

  const roadmapRow =
    roadmap ??
    (await db.select().from(roadmapsTable).where(eq(roadmapsTable.slug, slug)).limit(1))[0];
  if (!roadmapRow) throw new Error("Failed to init onboarding roadmap");

  const [strategy] = await db
    .insert(contentStrategiesTable)
    .values({
      roadmapId: roadmapRow.id,
      websiteProjectId: projectId,
      industry: roadmapRow.industry,
      location: roadmapRow.location,
      stage: roadmapRow.stage,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    })
    .returning();

  return strategy.id;
}

/**
 * Picks the opportunity to write the first article from: whatever the firm chose
 * at the `topics` step, or if they skipped picking, the highest-scored open
 * opportunity for the project (seeding cold-start ones first if none exist yet).
 */
async function resolveFirstOpportunityId(
  projectId: number,
  userId: number,
  vertical: OrgVertical | null | undefined,
  topicIds: number[] | undefined,
  competitorUrls: string[] | undefined,
): Promise<number | null> {
  if (topicIds && topicIds.length > 0) {
    const [chosen] = await db
      .select({ id: keywordOpportunitiesTable.id })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.id, topicIds[0]!),
        ),
      )
      .limit(1);
    if (chosen) return chosen.id;
  }

  const [top] = await db
    .select({ id: keywordOpportunitiesTable.id })
    .from(keywordOpportunitiesTable)
    .where(and(eq(keywordOpportunitiesTable.websiteProjectId, projectId), eq(keywordOpportunitiesTable.status, "open")))
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
    .limit(1);
  if (top) return top.id;

  // Cold start (B5 / D6): no GSC data, no competitor gaps queued yet, nothing to
  // pick from. Prefer the vertical-aware, AI-driven generator that fills the
  // preset's seed angles with the brand's real scraped services/offerings —
  // seedColdStartOpportunities is only a fallback for when that comes back empty
  // (no AI client configured, or the AI pass failed), and it's a placeholder-only
  // strip, not a brand-specific idea.
  const discovered = await discoverColdStartOpportunities(projectId, userId).catch(() => 0);
  if (discovered === 0) {
    await seedColdStartOpportunities(projectId, vertical, competitorUrls ?? []);
  }

  const [seeded] = await db
    .select({ id: keywordOpportunitiesTable.id })
    .from(keywordOpportunitiesTable)
    .where(and(eq(keywordOpportunitiesTable.websiteProjectId, projectId), eq(keywordOpportunitiesTable.status, "open")))
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
    .limit(1);
  return seeded?.id ?? null;
}

/**
 * Kicks off first-article generation and returns immediately — never awaits the
 * actual draft (3-5 minutes of AI generation is the worst possible first
 * impression, PRD D5). Tolerant of every failure mode: if strategy setup, the
 * opportunity pick, or job dispatch fails, onboarding still completes and the
 * caller gets `dispatched: false` with a reason so the UI can offer a retry.
 */
export async function dispatchFirstArticleGeneration(params: {
  projectId: number;
  userId: number;
  vertical: OrgVertical | null | undefined;
  topicIds?: number[];
  competitorUrls?: string[];
}): Promise<DispatchFirstArticleResult> {
  const { projectId, userId, vertical, topicIds, competitorUrls } = params;

  try {
    const opportunityId = await resolveFirstOpportunityId(projectId, userId, vertical, topicIds, competitorUrls);
    if (opportunityId == null) {
      return { dispatched: false, contentItemId: null, error: "No topic available to generate from yet" };
    }

    await initMinimalStrategy(projectId, vertical);
    const { contentItemId } = await queueOpportunityToStrategy(opportunityId, userId);

    await enqueue(QUEUES.contentGenerate, {
      contentItemId,
      projectId,
      userId,
      generateVariants: false,
    });

    return { dispatched: true, contentItemId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "First article dispatch failed";
    return { dispatched: false, contentItemId: null, error: message };
  }
}
