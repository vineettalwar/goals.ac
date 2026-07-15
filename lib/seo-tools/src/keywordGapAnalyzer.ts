import type { KeywordDifficulty } from "./keywordAnalyzer";

export type GapOpportunity = {
  keyword: string;
  source:
    | "competitor_gap"
    | "ai_analysis"
    | "gsc_query"
    | "csv_import"
    | "google_sheets"
    | "manual"
    | "semrush";
  competitorUrl?: string;
  estimatedVolume?: string;
  difficulty: KeywordDifficulty;
  opportunityScore: number;
  intent?: string;
  suggestedTitle: string;
  suggestedAngle: string;
};

export function parseVolumeEstimate(volumeStr: string): number {
  const nums = volumeStr.match(/[\d,]+/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  if (nums.length === 0) return 500;
  if (nums.length === 1) return nums[0] ?? 500;
  return Math.round((nums[0]! + nums[1]!) / 2);
}

export function difficultyMultiplier(difficulty: KeywordDifficulty): number {
  if (difficulty === "low") return 1;
  if (difficulty === "medium") return 0.6;
  return 0.3;
}

export function intentBoost(intent?: string): number {
  if (!intent) return 1;
  const lower = intent.toLowerCase();
  if (lower.includes("transactional") || lower.includes("commercial")) return 1.2;
  if (lower.includes("informational")) return 1;
  return 1;
}

export function computeOpportunityScore(params: {
  estimatedVolume: number;
  difficulty: KeywordDifficulty;
  aiVisibility?: number;
  intent?: string;
}): number {
  const { estimatedVolume, difficulty, aiVisibility = 50, intent } = params;
  const volumeFactor = Math.min(1, estimatedVolume / 5000);
  const raw =
    volumeFactor * 40 +
    difficultyMultiplier(difficulty) * 30 +
    (aiVisibility / 100) * 20 +
    intentBoost(intent) * 10;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export type OpportunityScoreFactor = {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

export function explainOpportunityScore(params: {
  opportunityScore: number;
  estimatedVolume?: string | null;
  difficulty?: KeywordDifficulty | null;
  source: string;
}): OpportunityScoreFactor[] {
  const volume = parseVolumeEstimate(params.estimatedVolume ?? "500/mo");
  const difficulty = params.difficulty ?? "medium";
  const volumeFactor = Math.min(1, volume / 5000);
  const volumePoints = Math.round(volumeFactor * 40);
  const difficultyPoints = Math.round(difficultyMultiplier(difficulty) * 30);
  const visibilityPoints = 10;
  const intentPoints = 10;

  const sourceDetail: Record<string, string> = {
    gsc_query: "From your Search Console data — real impressions and position.",
    semrush: "From Semrush keyword gap vs competitors.",
    competitor_gap: "Topic gap vs a tracked competitor.",
    rank_drop: "Your rank dropped — refresh opportunity.",
    content_refresh: "GSC clicks declined on a published page — refresh opportunity.",
    ai_analysis: "From AI keyword analysis.",
    csv_import: "Imported keyword list.",
    google_sheets: "Synced from Google Sheets.",
    manual: "Manually added.",
  };

  return [
    {
      label: "Search volume",
      points: volumePoints,
      maxPoints: 40,
      detail: params.estimatedVolume ?? `~${volume.toLocaleString()}/mo estimated`,
    },
    {
      label: "Difficulty",
      points: difficultyPoints,
      maxPoints: 30,
      detail: `${difficulty} competition — easier keywords score higher`,
    },
    {
      label: "AI visibility",
      points: visibilityPoints,
      maxPoints: 20,
      detail: "Baseline visibility potential for generative search",
    },
    {
      label: "Intent fit",
      points: intentPoints,
      maxPoints: 10,
      detail: sourceDetail[params.source] ?? "Source-weighted opportunity signal",
    },
    {
      label: "Total",
      points: params.opportunityScore,
      maxPoints: 100,
      detail: "Combined opportunity score",
    },
  ];
}

export function opportunitiesFromKeywordAnalysis(
  keywords: Array<{
    keyword: string;
    estimatedVolume: string;
    difficulty: KeywordDifficulty;
    aiVisibility: number;
    suggestedContent: string;
    opportunities: string[];
  }>,
): GapOpportunity[] {
  return keywords.map((kw) => ({
    keyword: kw.keyword,
    source: "ai_analysis" as const,
    estimatedVolume: kw.estimatedVolume,
    difficulty: kw.difficulty,
    opportunityScore: computeOpportunityScore({
      estimatedVolume: parseVolumeEstimate(kw.estimatedVolume),
      difficulty: kw.difficulty,
      aiVisibility: kw.aiVisibility,
    }),
    suggestedTitle: kw.suggestedContent,
    suggestedAngle: kw.opportunities[0] ?? `Target "${kw.keyword}" with authoritative content.`,
  }));
}

export function opportunitiesFromCompetitorGaps(params: {
  contentGaps: string[];
  competitorUrl: string;
  competitorName: string;
  industry: string;
}): GapOpportunity[] {
  const { contentGaps, competitorUrl, competitorName, industry } = params;
  return contentGaps.slice(0, 5).map((gap, i) => {
    const keyword = gap.split(/[.:]/)[0]?.trim().slice(0, 120) || gap.slice(0, 80);
    return {
      keyword,
      source: "competitor_gap" as const,
      competitorUrl,
      estimatedVolume: "500-1,500/mo",
      difficulty: "medium" as const,
      opportunityScore: computeOpportunityScore({
        estimatedVolume: 800,
        difficulty: "medium",
        aiVisibility: 55 - i * 3,
      }),
      intent: "informational",
      suggestedTitle: `${keyword}: What ${industry} teams need to know`,
      suggestedAngle: `Competitor ${competitorName} ranks for this topic — create a stronger, more specific piece.`,
    };
  });
}

export type RankDropAlertInput = {
  keyword: string;
  previousPosition: number | null;
  currentPosition: number | null;
};

export function buildRankDropAlert(input: RankDropAlertInput): {
  changeAmount: number;
  severity: "info" | "warning" | "critical";
  message: string;
} | null {
  const { keyword, previousPosition, currentPosition } = input;
  if (previousPosition == null || currentPosition == null) return null;

  const changeAmount = previousPosition - currentPosition;
  if (changeAmount >= 0) return null;

  const drop = Math.abs(changeAmount);
  if (drop < 4) return null;

  let severity: "info" | "warning" | "critical" = "info";
  if (drop >= 8 || (previousPosition <= 10 && currentPosition > 20)) {
    severity = "critical";
  } else if (drop >= 4) {
    severity = "warning";
  }

  const message = `Dropped #${previousPosition} → #${currentPosition} for "${keyword}". Consider refreshing or expanding the ranking page.`;

  return { changeAmount, severity, message };
}

export function rankDropToOpportunity(params: {
  keyword: string;
  previousPosition: number;
  currentPosition: number;
}): GapOpportunity {
  const { keyword, previousPosition, currentPosition } = params;
  return {
    keyword,
    source: "ai_analysis",
    estimatedVolume: "existing traffic at risk",
    difficulty: "medium",
    opportunityScore: computeOpportunityScore({
      estimatedVolume: 2000,
      difficulty: "medium",
      aiVisibility: 70,
      intent: "commercial",
    }),
    intent: "commercial",
    suggestedTitle: `Updated guide: ${keyword}`,
    suggestedAngle: `You fell from #${previousPosition} to #${currentPosition}. Publish a refreshed, deeper article to recover rankings.`,
  };
}
