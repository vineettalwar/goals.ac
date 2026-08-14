/**
 * Turns Search Console decay into refresh work.
 *
 * The loop this closes: goals.ac publishes an article, GSC records how it
 * performs, and that performance decides what gets written next. Without this
 * the platform only ever writes new posts, which is the expensive half of SEO
 * and the half that competes with its own back catalogue.
 *
 * Refresh opportunities are stored as `keyword_opportunities` rows with source
 * `content_refresh` — a value the schema already defined and nothing produced.
 */

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import { gscSearchQueriesTable, keywordOpportunitiesTable } from "@workspace/db/schema";
import {
  decayReason,
  detectContentDecay,
  type DecayedPage,
  type GscRow,
} from "@workspace/seo-tools/contentDecayDetector";
import { defaultSyncDateRange, priorPeriodRange } from "@workspace/seo-tools/gscSearchAnalytics";
import { logger } from "../core/logger";

/** Comparison window, in days, for each side of the decay check. */
const WINDOW_DAYS = 28;
/** Cap per sweep. A backlog of refreshes is worse than a short, actionable list. */
const MAX_OPPORTUNITIES_PER_RUN = 10;

async function loadRows(
  projectId: number,
  startDate: string,
  endDate: string,
): Promise<GscRow[]> {
  const rows = await db
    .select({
      query: gscSearchQueriesTable.query,
      page: gscSearchQueriesTable.page,
      impressions: gscSearchQueriesTable.impressions,
      clicks: gscSearchQueriesTable.clicks,
      ctr: gscSearchQueriesTable.ctr,
      position: gscSearchQueriesTable.position,
    })
    .from(gscSearchQueriesTable)
    .where(
      and(
        eq(gscSearchQueriesTable.projectId, projectId),
        gte(gscSearchQueriesTable.date, startDate),
        lte(gscSearchQueriesTable.date, endDate),
      ),
    );

  return rows;
}

export type ExistingRefreshWork = {
  /** Page URLs already queued for refresh, from this sweep's own rows. */
  pages: Set<string>;
  /** Lowercased keywords already queued for refresh, from any producer. */
  keywords: Set<string>;
};

/**
 * Refresh work already outstanding for a project.
 *
 * Two producers write `content_refresh` rows: this sweep, keyed per page, and
 * `createClickDeclineRefreshOpportunities` on the daily GSC sync, keyed per
 * content piece keyword and with no URL attached. Deduping on the page URL
 * alone would miss the other producer's rows entirely and queue the same
 * decaying article twice, so both keys are checked.
 *
 * Only open and queued rows block. A dismissed opportunity can resurface if the
 * page decays again, which matches how the keyword sweep behaves.
 */
export async function loadExistingRefreshWork(projectId: number): Promise<ExistingRefreshWork> {
  const rows = await db
    .select({
      competitorUrl: keywordOpportunitiesTable.competitorUrl,
      keyword: keywordOpportunitiesTable.keyword,
    })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        eq(keywordOpportunitiesTable.source, "content_refresh"),
        inArray(keywordOpportunitiesTable.status, ["open", "queued"]),
      ),
    );

  return {
    pages: new Set(
      rows
        .map((row) => row.competitorUrl?.trim())
        .filter((url): url is string => Boolean(url)),
    ),
    keywords: new Set(
      rows
        .map((row) => row.keyword?.trim().toLowerCase())
        .filter((keyword): keyword is string => Boolean(keyword)),
    ),
  };
}

/** Whether a decayed page is already covered by outstanding refresh work. */
export function isRefreshAlreadyQueued(
  page: { page: string; query: string },
  existing: ExistingRefreshWork,
): boolean {
  return existing.pages.has(page.page) || existing.keywords.has(page.query.trim().toLowerCase());
}

/** Title for a refresh opportunity — says refresh, so it is never mistaken for a new post. */
export function refreshTitle(decayed: DecayedPage): string {
  return `Refresh: ${decayed.query}`;
}

/**
 * Angle text for a refresh opportunity.
 *
 * Names the URL explicitly and states the intent, so whatever generates from
 * this item updates the existing page instead of writing a competing one. The
 * URL has to travel in the angle because a content item has nowhere else to
 * carry it.
 */
export function refreshAngle(decayed: DecayedPage): string {
  return [
    `REFRESH the existing page at ${decayed.page} — do not write a new article on this topic.`,
    decayReason(decayed),
    `Keep the URL and the parts that still work. Update stale facts, strengthen the sections that answer "${decayed.query}", and improve the title and opening.`,
  ].join(" ");
}

/**
 * Find and record pages worth refreshing for one project.
 *
 * Returns the number of new opportunities written. Pages already covered by
 * outstanding refresh work are skipped — by URL or by keyword, so this never
 * duplicates what the daily GSC click-decline pass already queued.
 */
export async function discoverContentDecay(projectId: number): Promise<number> {
  const currentRange = defaultSyncDateRange(WINDOW_DAYS);
  const priorRange = priorPeriodRange(currentRange.startDate, currentRange.endDate);

  const [current, previous] = await Promise.all([
    loadRows(projectId, currentRange.startDate, currentRange.endDate),
    loadRows(projectId, priorRange.startDate, priorRange.endDate),
  ]);

  if (current.length === 0) {
    logger.info({ projectId }, "Content decay sweep skipped: no Search Console data");
    return 0;
  }

  const decayed = detectContentDecay(current, previous);
  if (decayed.length === 0) return 0;

  const existing = await loadExistingRefreshWork(projectId);
  let inserted = 0;

  for (const page of decayed) {
    if (inserted >= MAX_OPPORTUNITIES_PER_RUN) break;
    if (!page.query) continue;
    if (isRefreshAlreadyQueued(page, existing)) continue;

    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword: page.query,
      source: "content_refresh",
      // The page to refresh. On a content_refresh row this column holds the
      // site's own decaying URL, not a competitor's.
      competitorUrl: page.page,
      estimatedVolume: `${page.impressions.toLocaleString()} imp/${WINDOW_DAYS}d`,
      difficulty: page.position <= 10 ? "low" : "medium",
      opportunityScore: page.decayScore,
      intent: "informational",
      suggestedTitle: refreshTitle(page),
      suggestedAngle: refreshAngle(page),
      status: "open",
    });

    // Guard within this run too: two decayed pages can share a top query.
    existing.pages.add(page.page);
    existing.keywords.add(page.query.trim().toLowerCase());
    inserted += 1;
  }

  logger.info(
    { projectId, detected: decayed.length, inserted },
    "Content decay sweep complete",
  );
  return inserted;
}
