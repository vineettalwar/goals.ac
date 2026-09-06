export interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

export interface VisibilityPrompt {
  id: number;
  prompt: string;
  category: string;
  isActive: boolean;
}

export interface VisibilitySummary {
  settings: VisibilitySettings;
  visibilityScore: number;
  promptCount: number;
  prompts: VisibilityPrompt[];
  dataMode: "live" | "simulated";
  llmMentionsConfigured: boolean;
  brandLookupCostEstimateUsd?: number;
  trend: Array<{ date: string; score: number; cited?: number; total?: number }>;
  byEngine: Array<{ engine: string; cited: number; total: number; score: number }>;
  competitorMentions: Array<{ name: string; count: number }>;
  geoScoreTrend: Array<{ date: string; score: number }>;
  latestGeoScore: number | null;
  recentSnapshots: Array<{
    id: number;
    prompt: string;
    engine: string;
    cited: boolean;
    competitorsMentioned: string[];
    checkedAt: string;
    source?: "live" | "simulated";
  }>;
}

export const CATEGORY_ORDER = ["brand", "keyword", "competitor", "custom"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  brand: "From industry & brand",
  keyword: "From keywords",
  competitor: "From competitors",
  custom: "Custom",
};

export const CATEGORY_SOURCE: Record<string, string> = {
  brand: "Brand profile → Industry / company name",
  keyword: "Brand profile → Primary keywords",
  competitor: "Brand profile → Competitor URLs",
  custom: "Added manually",
};

export const ENGINE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
};

export const ENGINE_CHIPS = ["ChatGPT", "Perplexity", "Claude", "Gemini"] as const;
export const LIVE_ENGINE_CHIPS = ["ChatGPT", "Google AI Overview"] as const;

export function visibilityTone(score: number) {
  if (score >= 60) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 30) return "text-amber-700 dark:text-amber-400";
  return "text-foreground";
}

export function dedupePrompts(prompts: VisibilityPrompt[]): VisibilityPrompt[] {
  const seen = new Set<string>();
  const unique: VisibilityPrompt[] = [];
  for (const p of prompts) {
    if (!p.isActive) continue;
    const key = p.prompt.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique;
}

/** Old seeds dumped full ICP text into questions — detect so we can rebuild. */
export function isPollutedPrompt(prompt: string): boolean {
  return (
    prompt.length > 180 ||
    /ideal customer profile|includes SMEs|typically founders|facing technical gaps/i.test(prompt)
  );
}

export function groupPrompts(prompts: VisibilityPrompt[]) {
  const groups = new Map<string, VisibilityPrompt[]>();
  for (const p of prompts) {
    const key = CATEGORY_ORDER.includes(p.category as (typeof CATEGORY_ORDER)[number])
      ? p.category
      : "custom";
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  return CATEGORY_ORDER.filter((key) => (groups.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: CATEGORY_LABELS[key] ?? key,
    source: CATEGORY_SOURCE[key] ?? CATEGORY_SOURCE.custom,
    items: groups.get(key) ?? [],
  }));
}

export function parsePrompts(raw: unknown): VisibilityPrompt[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const prompt = typeof row.prompt === "string" ? row.prompt : "";
      if (!prompt) return null;
      return {
        id: typeof row.id === "number" ? row.id : 0,
        prompt,
        category: typeof row.category === "string" ? row.category : "custom",
        isActive: row.isActive !== false,
      };
    })
    .filter((p): p is VisibilityPrompt => p != null);
}

export function parseSummary(
  data: Record<string, unknown> | undefined,
  settings: VisibilitySettings,
): VisibilitySummary | null {
  if (!data) return null;
  const prompts = parsePrompts(data.prompts);
  const dataMode = data.dataMode === "live" ? "live" : "simulated";
  return {
    settings: (data.settings as VisibilitySettings) ?? settings,
    visibilityScore: (data.visibilityScore as number) ?? (data.score as { overall?: number })?.overall ?? 0,
    promptCount: (data.promptCount as number) ?? prompts.filter((p) => p.isActive).length,
    prompts,
    dataMode,
    llmMentionsConfigured: Boolean(data.llmMentionsConfigured) || dataMode === "live",
    brandLookupCostEstimateUsd:
      typeof data.brandLookupCostEstimateUsd === "number" ? data.brandLookupCostEstimateUsd : undefined,
    trend: (data.trend as VisibilitySummary["trend"]) ?? [],
    byEngine: (data.byEngine as VisibilitySummary["byEngine"]) ?? [],
    competitorMentions: (data.competitorMentions as VisibilitySummary["competitorMentions"]) ?? [],
    geoScoreTrend: (data.geoScoreTrend as VisibilitySummary["geoScoreTrend"]) ?? [],
    latestGeoScore: (data.latestGeoScore as number | null) ?? null,
    recentSnapshots:
      (data.recentSnapshots as VisibilitySummary["recentSnapshots"]) ??
      (data.snapshots as VisibilitySummary["recentSnapshots"])?.slice(0, 20) ??
      [],
  };
}
