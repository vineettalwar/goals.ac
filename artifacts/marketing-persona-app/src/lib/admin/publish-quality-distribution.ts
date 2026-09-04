import { and, desc, gte, isNotNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { publishRecordsTable } from "@workspace/db/schema";

export type ScoreHistogramBucket = {
  /** Inclusive lower bound of the bucket (0, 10, 20, ... 90). */
  rangeStart: number;
  /** Inclusive upper bound of the bucket (9, 19, ... 100 for the last bucket). */
  rangeEnd: number;
  count: number;
};

export type ScoreDistributionStats = {
  count: number;
  min: number | null;
  max: number | null;
  median: number | null;
  p10: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
  histogram: ScoreHistogramBucket[];
};

const HISTOGRAM_BUCKET_COUNT = 10;
const HISTOGRAM_BUCKET_WIDTH = 10;

/**
 * Linear-interpolation percentile (the common "nearest two ranks, weighted"
 * method) over an already-sorted ascending array. Callers must not pass an
 * empty array -- computeScoreDistribution handles that edge case up front.
 */
function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 1) return sortedAscending[0]!;
  const rank = (p / 100) * (sortedAscending.length - 1);
  const lowIndex = Math.floor(rank);
  const highIndex = Math.ceil(rank);
  const low = sortedAscending[lowIndex]!;
  const high = sortedAscending[highIndex]!;
  if (lowIndex === highIndex) return low;
  return low + (high - low) * (rank - lowIndex);
}

function emptyHistogram(): ScoreHistogramBucket[] {
  return Array.from({ length: HISTOGRAM_BUCKET_COUNT }, (_, i) => ({
    rangeStart: i * HISTOGRAM_BUCKET_WIDTH,
    rangeEnd: i === HISTOGRAM_BUCKET_COUNT - 1 ? 100 : i * HISTOGRAM_BUCKET_WIDTH + 9,
    count: 0,
  }));
}

/**
 * Pure percentile and histogram math over a set of 0-100 quality scores, so
 * a human choosing minQualityScore can see the real distribution instead of
 * guessing. Kept free of the database so it is directly unit-testable.
 */
export function computeScoreDistribution(scores: number[]): ScoreDistributionStats {
  if (scores.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      median: null,
      p10: null,
      p25: null,
      p75: null,
      p90: null,
      histogram: emptyHistogram(),
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const histogram = emptyHistogram();
  for (const score of sorted) {
    const clamped = Math.min(Math.max(score, 0), 100);
    const bucketIndex = Math.min(Math.floor(clamped / HISTOGRAM_BUCKET_WIDTH), HISTOGRAM_BUCKET_COUNT - 1);
    histogram[bucketIndex]!.count += 1;
  }

  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    median: percentile(sorted, 50),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    histogram,
  };
}

/**
 * Counts how often each code appears across a set of blocker/warning code
 * lists (one list per publish attempt). Rows with no codes recorded (null or
 * undefined) contribute nothing.
 */
export function countCodeFrequency(codeLists: Array<string[] | null | undefined>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const codes of codeLists) {
    if (!codes) continue;
    for (const code of codes) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

export type PublishQualityDistributionResult = {
  days: number;
  scoreDistribution: ScoreDistributionStats;
  blockerCodeFrequency: Record<string, number>;
  warningCodeFrequency: Record<string, number>;
};

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Loads publish_records readiness telemetry for the last `days` days and
 * reduces it to the score distribution and blocker/warning code frequency a
 * human needs to pick `minQualityScore` from real data.
 */
export async function getPublishQualityDistribution(days = DEFAULT_WINDOW_DAYS): Promise<PublishQualityDistributionResult> {
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      qualityScore: publishRecordsTable.qualityScore,
      readinessBlockers: publishRecordsTable.readinessBlockers,
      readinessWarnings: publishRecordsTable.readinessWarnings,
    })
    .from(publishRecordsTable)
    .where(and(isNotNull(publishRecordsTable.qualityScore), gte(publishRecordsTable.createdAt, windowStart)))
    .orderBy(desc(publishRecordsTable.createdAt));

  const scores = rows.map((r) => r.qualityScore!).filter((s): s is number => s != null);
  const blockerCodeFrequency = countCodeFrequency(rows.map((r) => r.readinessBlockers as string[] | null));
  const warningCodeFrequency = countCodeFrequency(rows.map((r) => r.readinessWarnings as string[] | null));

  return {
    days,
    scoreDistribution: computeScoreDistribution(scores),
    blockerCodeFrequency,
    warningCodeFrequency,
  };
}
