import { db } from "@workspace/db";
import {
  contentItemsTable,
  contentPiecesTable,
  keywordOpportunitiesTable,
} from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { enqueue } from "@workspace/jobs/boss";
import { QUEUES } from "@workspace/jobs/queues";
import type { ContentGeneratePayload } from "@workspace/jobs/queues";
import { queueOpportunityToStrategy, discoverColdStartOpportunities } from "./keyword-opportunity-service";
import { logger } from "../core/logger";
// The db column's ContentPieceMetadata type (from @workspace/db, read-only for this
// stream) predates the vertical guardrail fields. Generation always writes through
// content-engine's own wider ContentPieceMetadata (content-piece-seo.ts), so reading
// these two fields back needs that wider type, not the db-declared one.
import type { ContentPieceMetadata as GeneratedPieceMetadata } from "../content/content-piece-seo";

/**
 * D4 onboarding entry point: generate a firm's first article from a chosen keyword
 * opportunity, in the background. Reuses the existing `content-generate` pg-boss
 * queue (worked by `generateFromContentItem` via lib/jobs/src/handlers/contentGenerate.ts)
 * rather than a bespoke path — same billing, retries, and D2 review gating apply.
 *
 * Note on scope: `enqueue`/`QUEUES` are imported from the `@workspace/jobs` subpath
 * modules (`/boss`, `/queues`), not the package root — the root re-exports
 * `./handlers`, which itself imports `@workspace/content-engine`. Importing the root
 * here would create a circular package dependency; `brand/brand-voice-indexer.ts`
 * already establishes this same subpath-import pattern.
 */
export interface StartFirstArticleResult {
  contentItemId: number;
  strategyId: number;
  websiteProjectId: number;
  /** pg-boss job id, or null when running on a dialect without pg-boss (D1 — routed
   * to Cloudflare Queues instead, which does not hand back a pollable job id here). */
  jobId: string | null;
}

/**
 * Kicks off background generation for a chosen opportunity. Marks the content item
 * "generating" immediately (before the job even starts) so a poller has something
 * to show from the first response, and fails loudly — never silently — if the queue
 * itself is unreachable (rethrows after marking the item "failed").
 */
export async function startFirstArticleGeneration(
  opportunityId: number,
  userId: number,
): Promise<StartFirstArticleResult> {
  const queued = await queueOpportunityToStrategy(opportunityId, userId);

  const [opp] = await db
    .select({ websiteProjectId: keywordOpportunitiesTable.websiteProjectId })
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");

  await db
    .update(contentItemsTable)
    .set({ status: "generating" })
    .where(eq(contentItemsTable.id, queued.contentItemId));

  let jobId: string | null = null;
  try {
    const payload: ContentGeneratePayload = {
      contentItemId: queued.contentItemId,
      projectId: opp.websiteProjectId,
      userId,
      generateVariants: false,
      // Never auto-publish a firm's first article — even for software/marketing,
      // the onboarding completion screen is a review moment, not a publish moment.
      // D2 review gating for law/dental applies independently and additionally,
      // inside generateFromContentItem itself.
      schedulePublish: false,
      triggeredByAutopilot: false,
    };
    jobId = await enqueue(QUEUES.contentGenerate, payload);
  } catch (err) {
    await db
      .update(contentItemsTable)
      .set({ status: "failed" })
      .where(eq(contentItemsTable.id, queued.contentItemId));
    logger.error(
      { err, opportunityId, contentItemId: queued.contentItemId },
      "First article generation could not be queued",
    );
    throw err;
  }

  return {
    contentItemId: queued.contentItemId,
    strategyId: queued.strategyId,
    websiteProjectId: opp.websiteProjectId,
    jobId,
  };
}

/**
 * Cold-start convenience: when a brand-new firm has no keyword opportunities yet
 * (D3 — no GSC data), generates one from the vertical's seed angles and starts
 * article generation on it in one call. Returns null only when the brand profile
 * has nothing (no services/offerings) to seed an angle from — the caller should
 * fall back to asking the firm to pick a topic manually.
 */
export async function startFirstArticleFromColdStart(
  websiteProjectId: number,
  userId: number,
): Promise<StartFirstArticleResult | null> {
  const inserted = await discoverColdStartOpportunities(websiteProjectId, userId);
  if (inserted === 0) return null;

  const [opportunity] = await db
    .select({ id: keywordOpportunitiesTable.id })
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.websiteProjectId, websiteProjectId))
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
    .limit(1);
  if (!opportunity) return null;

  return startFirstArticleGeneration(opportunity.id, userId);
}

export type FirstArticleStatus = "generating" | "prepared" | "failed" | "draft" | string;

export interface FirstArticleProgress {
  status: FirstArticleStatus;
  contentPieceId: number | null;
  /** True once a piece exists and its vertical (law/dental, or undetermined —
   * fails closed) requires human approval before it can publish. */
  requiresReview: boolean;
  /** Non-empty when the vertical guardrail found forbidden claims that survived
   * the single regeneration pass — surfaced so the UI can show exactly what a
   * reviewer needs to fix, never silently. */
  forbiddenClaimHitCount: number;
  publishedUrl: string | null;
  publishError: string | null;
}

/**
 * Polling endpoint for the onboarding "your first article is being written" screen.
 * Reads only from content_items/content_pieces — works regardless of whether the
 * generation job ran on pg-boss or Cloudflare Queues, since both write through the
 * same tables.
 *
 * "generating" that never resolves (job crashed without touching content_items —
 * a real gap in lib/jobs/src/handlers/contentGenerate.ts's error path for the
 * contentItemId-only case, outside this package's ownership; see the Stream D
 * report) is the one case this cannot distinguish from "still working". Callers
 * polling this should apply their own timeout (e.g. 5 minutes) and offer retry via
 * startFirstArticleGeneration on the same opportunity.
 */
export async function getFirstArticleProgress(
  contentItemId: number,
): Promise<FirstArticleProgress> {
  const [item] = await db
    .select({ status: contentItemsTable.status })
    .from(contentItemsTable)
    .where(eq(contentItemsTable.id, contentItemId))
    .limit(1);
  if (!item) throw new Error("Content item not found");

  const [piece] = await db
    .select({
      id: contentPiecesTable.id,
      pieceMetadata: contentPiecesTable.pieceMetadata,
      publishedUrl: contentPiecesTable.publishedUrl,
      publishError: contentPiecesTable.publishError,
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.contentItemId, contentItemId))
    .orderBy(desc(contentPiecesTable.createdAt))
    .limit(1);

  const metadata = piece?.pieceMetadata as GeneratedPieceMetadata | null | undefined;

  return {
    status: item.status,
    contentPieceId: piece?.id ?? null,
    requiresReview: Boolean(metadata?.requiresReview),
    forbiddenClaimHitCount: metadata?.forbiddenClaimHits?.length ?? 0,
    publishedUrl: piece?.publishedUrl ?? null,
    publishError: piece?.publishError ?? null,
  };
}

// Re-exported so onboarding completion never needs a second project lookup.
export { discoverColdStartOpportunities } from "./keyword-opportunity-service";
