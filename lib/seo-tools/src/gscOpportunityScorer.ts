import type { GapOpportunity } from "./keywordGapAnalyzer";
import type { KeywordDifficulty } from "./keywordAnalyzer";

export type GscQueryRollup = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  pages: string[];
};

export type GscScoredOpportunity = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  opportunityScore: number;
  pattern:
    | "striking_distance"
    | "low_hanging_fruit"
    | "high_impressions_low_ctr"
    | "rising_query"
    | "page_mismatch";
  topPage: string | null;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function rollupGscQueries(
  rows: Array<{
    query: string;
    page: string | null;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>,
): GscQueryRollup[] {
  const byQuery = new Map<string, GscQueryRollup>();

  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    if (!key) continue;

    const existing = byQuery.get(key);
    if (!existing) {
      byQuery.set(key, {
        query: row.query.trim(),
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        position: row.position,
        pages: row.page ? [row.page] : [],
      });
      continue;
    }

    const totalImpressions = existing.impressions + row.impressions;
    const weightedPosition =
      totalImpressions > 0
        ? (existing.position * existing.impressions + row.position * row.impressions) / totalImpressions
        : existing.position;
    const totalClicks = existing.clicks + row.clicks;

    existing.impressions = totalImpressions;
    existing.clicks = totalClicks;
    existing.ctr = totalImpressions > 0 ? totalClicks / totalImpressions : existing.ctr;
    existing.position = weightedPosition;
    if (row.page && !existing.pages.includes(row.page)) {
      existing.pages.push(row.page);
    }
  }

  return [...byQuery.values()];
}

export function scoreGscQueries(
  current: GscQueryRollup[],
  previous: GscQueryRollup[] = [],
): GscScoredOpportunity[] {
  const previousByQuery = new Map(previous.map((q) => [q.query.toLowerCase(), q]));
  const impressionValues = current.map((q) => q.impressions).filter((v) => v > 0);
  const ctrValues = current.map((q) => q.ctr).filter((v) => v > 0);
  const impressionThreshold = impressionValues.length > 0 ? percentile(impressionValues, 75) : 100;
  const siteCtrMedian = median(ctrValues);

  const scored: GscScoredOpportunity[] = [];

  for (const q of current) {
    if (q.impressions < 10) continue;

    let score = 0;
    let pattern: GscScoredOpportunity["pattern"] = "striking_distance";

    if (q.position >= 4 && q.position <= 10 && q.impressions >= 100) {
      // Unchanged from the original formula so today's page-one-adjacent
      // opportunity lists do not reshuffle.
      score += 55;
      pattern = "striking_distance";
      score += Math.min(20, Math.round((20 - q.position) * 1.5));
    } else if (q.position > 10 && q.position <= 30 && q.impressions >= 100) {
      // Page two and three (positions 11-30): score on impression-weighted
      // proximity to page one so a heavy-impression position-12 query beats a
      // light position-29 query, but a thin query in either sub-band still
      // falls under the score < 40 cutoff below.
      //
      // proximity: 1.0 at position 11 (one click ahead of striking distance),
      // 0.0 at position 30 (bottom of page three). Linear across the band.
      const proximity = (30 - q.position) / (30 - 11);
      // impressionWeight: log-scaled 0..1 so a query needs real demand (not
      // just a single huge outlier) to earn the full impression bonus.
      // impressions === 100 (the floor) yields ~0, impressions >= 1100
      // saturates at 1.
      const impressionWeight = Math.min(1, Math.log10(q.impressions / 100) / Math.log10(11));
      // Rounded so every pattern contributes a whole-number score; the UI
      // renders opportunityScore directly.
      score += Math.round(25 + proximity * 35 + impressionWeight * 25);
      pattern = "low_hanging_fruit";
    }

    if (q.impressions >= impressionThreshold && q.ctr < siteCtrMedian * 0.7) {
      score += 35;
      pattern = "high_impressions_low_ctr";
    }

    const prev = previousByQuery.get(q.query.toLowerCase());
    if (prev && prev.impressions > 0) {
      const growth = (q.impressions - prev.impressions) / prev.impressions;
      if (growth >= 0.25 && q.impressions >= 50) {
        score += 30;
        pattern = "rising_query";
      }
    }

    if (q.pages.length > 2) {
      score += 15;
      pattern = "page_mismatch";
    }

    score = Math.min(100, score);
    if (score < 40) continue;

    scored.push({
      query: q.query,
      impressions: q.impressions,
      clicks: q.clicks,
      ctr: q.ctr,
      position: q.position,
      opportunityScore: score,
      pattern,
      topPage: q.pages[0] ?? null,
    });
  }

  return scored.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export function gscScoredToGapOpportunity(
  scored: GscScoredOpportunity,
  enrichment?: {
    suggestedTitle?: string;
    suggestedAngle?: string;
    intent?: string;
    difficulty?: KeywordDifficulty;
  },
): GapOpportunity {
  const patternLabels: Record<GscScoredOpportunity["pattern"], string> = {
    striking_distance: "striking distance (positions 4–10)",
    low_hanging_fruit: "low-hanging fruit (page two and three, positions 11–30)",
    high_impressions_low_ctr: "high impressions with low CTR",
    rising_query: "rising search demand",
    page_mismatch: "split across multiple pages",
  };

  const defaultTitle = enrichment?.suggestedTitle ?? `How to rank for "${scored.query}"`;
  const defaultAngle =
    enrichment?.suggestedAngle ??
    `Target this ${patternLabels[scored.pattern]} query with a focused article. Current avg position: ${scored.position.toFixed(1)}, ${scored.impressions.toLocaleString()} impressions.`;

  return {
    keyword: scored.query,
    source: "gsc_query",
    estimatedVolume: `${scored.impressions.toLocaleString()} imp/28d`,
    // Page one (<=10) is already established and defended, so treat it as
    // medium difficulty. Page two (11-20) is the easiest lift: one page of
    // competitors away from the front page, so low. Page three (21-30) is a
    // bigger jump across two pages worth of competitors even though its
    // opportunity score can still be strong, so treat it as high difficulty.
    difficulty:
      enrichment?.difficulty ?? (scored.position <= 10 ? "medium" : scored.position <= 20 ? "low" : "high"),
    opportunityScore: scored.opportunityScore,
    intent: enrichment?.intent ?? "informational",
    suggestedTitle: defaultTitle,
    suggestedAngle: defaultAngle,
  };
}
