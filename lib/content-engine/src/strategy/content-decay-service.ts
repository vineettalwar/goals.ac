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

import { and, eq, gte, lte } from "drizzle-orm";
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

/** Refresh opportunities already recorded for this project, keyed by page URL. */
async function existingRefreshPages(projectId: number): Promise<Set<string>> {
  const rows = await db
    .select({ competitorUrl: keywordOpportunitiesTable.competitorUrl })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        eq(keywordOpportunitiesTable.source, "content_refresh"),
      ),
    );

  return new Set(
    rows
      .map((row) => row.competitorUrl?.trim())
      .filter((url): url is string => Boolean(url)),
  );
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
 * Returns the number of new opportunities written. Pages that already have an
 * open refresh opportunity are skipped, so repeated sweeps do not pile up
 * duplicates for the same URL.
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

  const alreadyTracked = await existingRefreshPages(projectId);
  let inserted = 0;

  for (const page of decayed) {
    if (inserted >= MAX_OPPORTUNITIES_PER_RUN) break;
    if (alreadyTracked.has(page.page)) continue;
    if (!page.query) continue;

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

    alreadyTracked.add(page.page);
    inserted += 1;
  }

  logger.info(
    { projectId, detected: decayed.length, inserted },
    "Content decay sweep complete",
  );
  return inserted;
}
