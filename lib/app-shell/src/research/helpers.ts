import type {
  ArticleIdeaPeek,
  AttackItem,
  BrandFitSignals,
  CompetitorAnalysisRow,
  KeywordSignalCounts,
  RedditThread,
  ResearchActionPaths,
  ThreatLevel,
} from "./types";

const THREAT_RANK: Record<ThreatLevel, number> = { high: 0, medium: 1, low: 2 };

export function researchSignalsStorageKey(projectId: string | number): string {
  return `research:signals:${projectId}`;
}

export function loadSessionSignalThreads(
  projectId: string | number | null | undefined,
): RedditThread[] {
  if (projectId == null || projectId === "") return [];
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(researchSignalsStorageKey(projectId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RedditThread[]) : [];
  } catch {
    return [];
  }
}

export function saveSessionSignalThreads(
  projectId: string | number,
  threads: RedditThread[],
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(researchSignalsStorageKey(projectId), JSON.stringify(threads));
  } catch {
    // ponytail: quota / private mode — peek stays empty until next discover
  }
}

export function countKeywordSignals(
  opportunities: Array<{ source?: string | null }>,
): KeywordSignalCounts {
  let gsc = 0;
  let semrush = 0;
  let competitorGap = 0;
  for (const row of opportunities) {
    if (row.source === "gsc_query") gsc += 1;
    else if (row.source === "semrush") semrush += 1;
    else if (row.source === "competitor_gap") competitorGap += 1;
  }
  return { gsc, semrush, competitorGap, total: opportunities.length };
}

const ARTICLE_IDEA_SOURCE_LABELS: Record<string, string> = {
  gsc_query: "Search Console",
  semrush: "Semrush",
  competitor_gap: "Competitor gap",
  ai_analysis: "AI analysis",
  rank_drop: "Rank drop",
  content_refresh: "Needs refresh",
  csv_import: "CSV",
  google_sheets: "Sheets",
  manual: "Manual",
  reddit: "Reddit",
};

export function articleIdeaSourceLabel(source: string): string {
  return ARTICLE_IDEA_SOURCE_LABELS[source] ?? source;
}

const BRAND_STOP = new Set([
  "the",
  "and",
  "for",
  "our",
  "your",
  "with",
  "that",
  "this",
  "from",
  "into",
  "who",
  "are",
  "was",
  "were",
  "their",
  "them",
  "customers",
  "looking",
  "searching",
]);

/** Matchable brand terms: primary keywords first, then industry phrase. */
export function brandFitTerms(brand?: BrandFitSignals | null): string[] {
  if (!brand) return [];
  const terms: string[] = [];
  for (const kw of brand.primaryKeywords ?? []) {
    const trimmed = kw.trim().toLowerCase();
    if (trimmed) terms.push(trimmed);
  }
  const industry = brand.industry?.trim().toLowerCase();
  if (industry) terms.push(industry);
  const audience = brand.targetAudience?.trim().toLowerCase();
  if (audience) {
    for (const token of audience.split(/[^a-z0-9+#]+/)) {
      if (token.length < 4 || BRAND_STOP.has(token)) continue;
      terms.push(token);
    }
  }
  return [...new Set(terms)];
}

/** Extra ranking points when an opportunity overlaps brand keywords / ICP. */
export function brandFitBoost(
  row: {
    keyword: string;
    suggestedTitle?: string | null;
    suggestedAngle?: string | null;
  },
  terms: string[],
): number {
  if (terms.length === 0) return 0;
  const hay = `${row.keyword} ${row.suggestedTitle ?? ""} ${row.suggestedAngle ?? ""}`.toLowerCase();
  let boost = 0;
  for (const term of terms) {
    if (!hay.includes(term)) continue;
    // Primary-keyword phrases must beat raw opportunity score.
    boost += term.includes(" ") || term.length >= 12 ? 40 : 8;
  }
  return boost;
}

/** Highest-scored open opportunities, unique by keyword (default 4). Brand fit re-ranks when provided. */
export function pickTopArticleIdeas(
  opportunities: Array<{
    id: number;
    keyword: string;
    suggestedTitle?: string | null;
    suggestedAngle?: string | null;
    source?: string | null;
    opportunityScore?: number | null;
    status?: string | null;
  }>,
  limit = 4,
  brand?: BrandFitSignals | null,
): ArticleIdeaPeek[] {
  const terms = brandFitTerms(brand);
  const open = opportunities.filter((row) => !row.status || row.status === "open");
  const ranked = [...open].sort((a, b) => {
    const aScore = (a.opportunityScore ?? 0) + brandFitBoost(a, terms);
    const bScore = (b.opportunityScore ?? 0) + brandFitBoost(b, terms);
    if (bScore !== aScore) return bScore - aScore;
    return (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0);
  });
  const seen = new Set<string>();
  const out: ArticleIdeaPeek[] = [];
  for (const row of ranked) {
    const key = row.keyword.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const title = row.suggestedTitle?.trim() || row.keyword.trim();
    out.push({
      id: row.id,
      keyword: row.keyword.trim(),
      suggestedTitle: title,
      suggestedAngle: row.suggestedAngle?.trim() || "",
      source: row.source ?? "manual",
      opportunityScore: row.opportunityScore ?? 0,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function sortWatchlist(analyses: CompetitorAnalysisRow[]): CompetitorAnalysisRow[] {
  return [...analyses].sort((a, b) => {
    const threatDiff =
      THREAT_RANK[a.threatLevel ?? "medium"] - THREAT_RANK[b.threatLevel ?? "medium"];
    if (threatDiff !== 0) return threatDiff;
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
}

export function buildAttackItems(analyses: CompetitorAnalysisRow[], limit = 5): AttackItem[] {
  const items: AttackItem[] = [];
  const seen = new Set<string>();

  for (const analysis of sortWatchlist(analyses)) {
    const name = analysis.competitorName || analysis.competitorUrl;
    const push = (kind: AttackItem["kind"], text: string) => {
      const key = `${kind}:${text.toLowerCase()}`;
      if (seen.has(key) || !text.trim()) return;
      seen.add(key);
      items.push({
        id: `${analysis.id}-${kind}-${items.length}`,
        kind,
        text,
        analysisId: analysis.id,
        competitorName: name,
        competitorUrl: analysis.competitorUrl,
      });
    };

    for (const win of analysis.quickWins ?? []) push("quick_win", win);
    for (const gap of analysis.contentGaps ?? []) push("content_gap", gap);
    for (const gap of analysis.geoGaps ?? []) push("geo_gap", gap);
    if (items.length >= limit * 3) break;
  }

  return items.slice(0, limit);
}

export function displayCompetitorName(row: Pick<CompetitorAnalysisRow, "competitorName" | "competitorUrl">): string {
  if (row.competitorName?.trim()) return row.competitorName.trim();
  try {
    return new URL(row.competitorUrl).hostname.replace(/^www\./, "");
  } catch {
    return row.competitorUrl;
  }
}

export function formatAnalyzedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function keywordFromInsight(text: string): string {
  const cleaned = text
    .replace(/^(write|create|publish|target|cover|build)\s+/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57).trimEnd() + "…";
}

export function buildResearchActionPaths(opts: {
  projectId?: string | number | null;
  studioBase: string;
  keywordsPath?: string;
  visibilityPath?: string;
  auditPath?: string;
  competitorsPath?: string;
  signalsPath?: string;
  settingsPath?: string;
}): ResearchActionPaths {
  const withExtra = (path: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value) params.set(key, value);
      }
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const studioBase = opts.studioBase;
  const keywordsPath = opts.keywordsPath ?? "/search/keywords";
  const visibilityPath = opts.visibilityPath ?? "/search/visibility";
  const auditPath = opts.auditPath ?? "/audit";
  const competitorsPath = opts.competitorsPath ?? "/research/competitors";
  const signalsPath = opts.signalsPath ?? "/research/reddit";
  const settingsPath = opts.settingsPath ?? "/settings";

  return {
    studioCreateHref: ({ title, keyword, angle }) => {
      const params = new URLSearchParams({ create: "1" });
      params.set("title", title);
      params.set("keyword", keyword || title);
      if (angle) params.set("angle", angle);
      const joiner = studioBase.includes("?") ? "&" : "?";
      return `${studioBase}${joiner}${params.toString()}`;
    },
    keywordsHref: (keyword, source) =>
      withExtra(
        keywordsPath,
        {
          ...(keyword ? { keyword } : {}),
          ...(source ? { source } : {}),
        },
      ),
    visibilityHref: () => withExtra(visibilityPath),
    auditHref: (url) => withExtra(auditPath, url ? { url } : undefined),
    competitorsHref: (analysisId) =>
      withExtra(competitorsPath, analysisId != null ? { analysis: String(analysisId) } : undefined),
    signalsHref: () => withExtra(signalsPath),
    settingsHref: () => withExtra(settingsPath),
  };
}
