import type { AttackItem, CompetitorAnalysisRow, ResearchActionPaths, ThreatLevel } from "./types";

const THREAT_RANK: Record<ThreatLevel, number> = { high: 0, medium: 1, low: 2 };

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
  };
}
