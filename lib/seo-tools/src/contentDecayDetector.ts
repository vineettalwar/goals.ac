/**
 * Content decay detection from Search Console history.
 *
 * Refreshing a page that already ranks beats writing a new one: it keeps the
 * URL, the inbound links, and whatever authority the page has earned, and it
 * usually moves faster. Decay is the signal for when to do it — a page that
 * used to rank and no longer does is the cheapest win on the site.
 *
 * Pure functions. The caller supplies two windows of GSC rows so this stays
 * testable without a database or a Google connection.
 */

/** A Search Console row as stored in `gsc_search_queries`. */
export type GscRow = {
  query: string;
  page: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

/** Per-page rollup across every query the page ranks for. */
export type GscPageRollup = {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  /** Impression-weighted average position. */
  position: number;
  /** Highest-impression query for the page — what a refresh should target. */
  topQuery: string;
};

export type DecayPattern = "position_slide" | "click_loss" | "stuck_page_two";

export type DecayedPage = {
  page: string;
  /** Query a refresh should target. */
  query: string;
  pattern: DecayPattern;
  position: number;
  previousPosition: number | null;
  clicks: number;
  previousClicks: number | null;
  impressions: number;
  /** 0–100. Higher means a refresh is more clearly worth the effort. */
  decayScore: number;
};

/** Below this, a page has too little search data to judge. */
const MIN_IMPRESSIONS = 100;
/** Positions worse than this are a rewrite, not a refresh. */
const MAX_ACTIONABLE_POSITION = 30;
/** Report nothing weaker than this. */
const MIN_DECAY_SCORE = 40;

/** Positions must worsen by at least this much to count as a slide. */
const POSITION_SLIDE_THRESHOLD = 1.5;
/** Clicks must fall by at least this share to count as click loss. */
const CLICK_LOSS_THRESHOLD = 0.3;
/** Impressions within this band count as "held" — demand did not move. */
const IMPRESSIONS_STABLE_BAND = 0.2;

/**
 * Roll GSC rows up per page.
 *
 * Position is impression-weighted: a page's rank for a query nobody searches
 * should not drag its average around.
 */
export function rollupGscPages(rows: readonly GscRow[]): GscPageRollup[] {
  const byPage = new Map<
    string,
    GscPageRollup & { queryImpressions: Map<string, number> }
  >();

  for (const row of rows) {
    const page = row.page?.trim();
    if (!page) continue;

    let entry = byPage.get(page);
    if (!entry) {
      entry = {
        page,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        position: 0,
        topQuery: "",
        queryImpressions: new Map(),
      };
      byPage.set(page, entry);
    }

    const totalImpressions = entry.impressions + row.impressions;
    entry.position =
      totalImpressions > 0
        ? (entry.position * entry.impressions + row.position * row.impressions) / totalImpressions
        : row.position;
    entry.impressions = totalImpressions;
    entry.clicks += row.clicks;
    entry.ctr = totalImpressions > 0 ? entry.clicks / totalImpressions : 0;

    const query = row.query.trim();
    if (query) {
      entry.queryImpressions.set(query, (entry.queryImpressions.get(query) ?? 0) + row.impressions);
    }
  }

  return [...byPage.values()].map((entry) => {
    let topQuery = "";
    let best = -1;
    // Ties resolve alphabetically so the same input always names the same query.
    for (const [query, impressions] of [...entry.queryImpressions].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      if (impressions > best) {
        best = impressions;
        topQuery = query;
      }
    }

    return {
      page: entry.page,
      impressions: entry.impressions,
      clicks: entry.clicks,
      ctr: entry.ctr,
      position: entry.position,
      topQuery,
    };
  });
}

/**
 * Find pages worth refreshing by comparing two windows of Search Console data.
 *
 * Three patterns, strongest first:
 * - `position_slide` — the page ranks materially worse than it did.
 * - `click_loss` — demand held but clicks fell, so the listing stopped earning
 *   the click even though the ranking survived.
 * - `stuck_page_two` — positions 11–20 with real demand. Never ranked, but
 *   close enough that a refresh usually beats a new article.
 *
 * `previous` may be empty; only `stuck_page_two` can fire without history.
 */
export function detectContentDecay(
  current: readonly GscRow[],
  previous: readonly GscRow[] = [],
  options?: { minImpressions?: number },
): DecayedPage[] {
  const minImpressions = options?.minImpressions ?? MIN_IMPRESSIONS;
  const previousByPage = new Map(rollupGscPages(previous).map((p) => [p.page, p]));
  const decayed: DecayedPage[] = [];

  for (const page of rollupGscPages(current)) {
    if (page.impressions < minImpressions) continue;
    if (page.position > MAX_ACTIONABLE_POSITION) continue;

    const prev = previousByPage.get(page.page) ?? null;
    let score = 0;
    let pattern: DecayPattern = "stuck_page_two";

    if (prev) {
      const slide = page.position - prev.position;
      if (slide >= POSITION_SLIDE_THRESHOLD) {
        // A three-position slide scores 60, a ten-position slide caps at 85.
        score = Math.min(85, 40 + Math.round(slide * 7));
        pattern = "position_slide";
      }

      const impressionsHeld =
        prev.impressions > 0 &&
        Math.abs(page.impressions - prev.impressions) / prev.impressions <= IMPRESSIONS_STABLE_BAND;
      const clickDrop =
        prev.clicks > 0 ? (prev.clicks - page.clicks) / prev.clicks : 0;

      if (impressionsHeld && clickDrop >= CLICK_LOSS_THRESHOLD) {
        const clickScore = Math.min(80, 40 + Math.round(clickDrop * 50));
        if (clickScore > score) {
          score = clickScore;
          pattern = "click_loss";
        }
      }
    }

    if (score === 0 && page.position >= 11 && page.position <= 20 && page.impressions >= minImpressions * 2) {
      score = 45 + Math.round((20 - page.position) * 2);
      pattern = "stuck_page_two";
    }

    if (score < MIN_DECAY_SCORE) continue;

    decayed.push({
      page: page.page,
      query: page.topQuery,
      pattern,
      position: page.position,
      previousPosition: prev?.position ?? null,
      clicks: page.clicks,
      previousClicks: prev?.clicks ?? null,
      impressions: page.impressions,
      decayScore: Math.min(100, score),
    });
  }

  return decayed.sort((a, b) => b.decayScore - a.decayScore || a.page.localeCompare(b.page));
}

/** Human-readable reason, for the opportunity row and the UI. */
export function decayReason(decayed: DecayedPage): string {
  const position = decayed.position.toFixed(1);

  if (decayed.pattern === "position_slide" && decayed.previousPosition !== null) {
    return `Slipped from position ${decayed.previousPosition.toFixed(1)} to ${position} on "${decayed.query}" while still drawing ${decayed.impressions.toLocaleString()} impressions. Refresh the existing page rather than publishing a competing one.`;
  }

  if (decayed.pattern === "click_loss" && decayed.previousClicks !== null) {
    return `Clicks fell from ${decayed.previousClicks.toLocaleString()} to ${decayed.clicks.toLocaleString()} with impressions holding steady at position ${position}. The listing stopped earning the click — rewrite the title, meta description, and opening section.`;
  }

  return `Stuck at position ${position} on "${decayed.query}" with ${decayed.impressions.toLocaleString()} impressions. A refresh usually moves a page-two result further than a new article would.`;
}
