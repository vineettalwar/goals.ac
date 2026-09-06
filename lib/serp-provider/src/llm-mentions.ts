/**
 * DataForSEO LLM Mentions client — adapted from every-app/open-seo (MIT):
 * - src/server/lib/dataforseo/ai.ts
 * - src/server/lib/dataforseo/shared.ts
 * - src/server/features/ai-search/services/brandLookup.ts
 * - src/server/features/ai-search/services/brandLookupShaping.ts
 * - src/server/features/ai-search/services/shareOfVoice.ts
 * - src/shared/targetDetection.ts
 *
 * https://github.com/every-app/open-seo
 */

import {
  computeShareOfVoice,
  detectTarget,
  resolveCompetitorGroups,
  roundOrNull,
  type CrossAggregatedItem,
  type CrossOutcome,
  type LlmPlatform,
  type ShareOfVoiceEntry,
} from "./share-of-voice";

export type { LlmPlatform, ShareOfVoiceEntry };

const API_BASE = "https://api.dataforseo.com";
const AGGREGATED_PATH =
  "/v3/ai_optimization/llm_mentions/aggregated_metrics/live";
const CROSS_AGGREGATED_PATH =
  "/v3/ai_optimization/llm_mentions/cross_aggregated_metrics/live";

const CHATGPT_LOCATION_CODE = 2840;
const CHATGPT_LANGUAGE_CODE = "en";
const PLATFORMS: LlmPlatform[] = ["chat_gpt", "google"];
const MAX_COMPETITORS = 5;

export type BrandLookupInput = {
  query: string;
  competitors?: string[];
  locationCode?: number;
  languageCode?: string;
};

export type BrandLookupResult = {
  query: string;
  detectedTargetType: "domain" | "keyword";
  resolvedTarget: string;
  fetchedAt: string;
  mode: "live";
  hasData: boolean;
  totalMentions: number;
  totalAiSearchVolume: number;
  perPlatform: Array<{
    platform: LlmPlatform;
    status: "success" | "error";
    mentions: number;
    aiSearchVolume: number;
    error?: string;
  }>;
  shareOfVoice: {
    platforms: LlmPlatform[];
    entries: ShareOfVoiceEntry[];
  } | null;
  costEstimateUsd: number;
};

type LlmTarget =
  | {
      domain: string;
      include_subdomains: true;
      search_filter: "include";
      search_scope: ["any"];
    }
  | {
      keyword: string;
      search_filter: "include";
      search_scope: ["any", "brand_entities"];
      match_type: "word_match";
    };

type PlatformGroup = {
  key?: string | null;
  mentions?: number | null;
  ai_search_volume?: number | null;
};

type DataForSeoTask = {
  status_code?: number;
  status_message?: string;
  result?: Array<{
    total?: { platform?: PlatformGroup[] | null };
    items?: CrossAggregatedItem[];
  }>;
};

type DataForSeoResponse = {
  tasks?: DataForSeoTask[];
};

function buildLlmTarget(detected: {
  type: "domain" | "keyword";
  value: string;
}): LlmTarget {
  if (detected.type === "domain") {
    return {
      domain: detected.value,
      include_subdomains: true,
      search_filter: "include",
      search_scope: ["any"],
    };
  }
  return {
    keyword: detected.value,
    search_filter: "include",
    search_scope: ["any", "brand_entities"],
    match_type: "word_match",
  };
}

function credentials(): { login: string; password: string } | null {
  const login = process.env["DATAFORSEO_LOGIN"]?.trim();
  const password = process.env["DATAFORSEO_PASSWORD"]?.trim();
  if (!login || !password) return null;
  return { login, password };
}

export function isLlmMentionsConfigured(): boolean {
  return credentials() !== null;
}

/** Rough USD: $0.20 base (2 platforms) + $0.20 when competitors are compared. */
export function estimateBrandLookupCostUsd(competitorCount: number): number {
  return 0.2 + (competitorCount > 0 ? 0.2 : 0);
}

function authHeader(): string {
  const creds = credentials();
  if (!creds) {
    throw new Error("DataForSEO LLM Mentions credentials are not configured");
  }
  return `Basic ${Buffer.from(`${creds.login}:${creds.password}`).toString("base64")}`;
}

async function dataforseoPost(
  path: string,
  body: unknown[],
): Promise<DataForSeoTask> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO HTTP ${response.status}`);
  }

  const data = (await response.json()) as DataForSeoResponse;
  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(task?.status_message ?? "DataForSEO task failed");
  }
  return task;
}

async function fetchAggregated(input: {
  target: LlmTarget;
  platform: LlmPlatform;
  locationCode: number;
  languageCode: string;
}): Promise<{ mentions: number; aiSearchVolume: number }> {
  const task = await dataforseoPost(AGGREGATED_PATH, [
    {
      target: [input.target],
      platform: input.platform,
      location_code: input.locationCode,
      language_code: input.languageCode,
      internal_list_limit: 10,
    },
  ]);

  const groups = task.result?.[0]?.total?.platform ?? [];
  const match =
    groups.find((g) => g.key === input.platform) ?? groups[0] ?? null;
  return {
    mentions: roundOrNull(match?.mentions) ?? 0,
    aiSearchVolume: roundOrNull(match?.ai_search_volume) ?? 0,
  };
}

async function fetchCrossAggregated(input: {
  groups: Array<{ key: string; target: LlmTarget }>;
  platform: LlmPlatform;
  locationCode: number;
  languageCode: string;
}): Promise<CrossAggregatedItem[]> {
  const task = await dataforseoPost(CROSS_AGGREGATED_PATH, [
    {
      targets: input.groups.map((group) => ({
        aggregation_key: group.key,
        target: [group.target],
      })),
      platform: input.platform,
      location_code: input.locationCode,
      language_code: input.languageCode,
      internal_list_limit: 5,
    },
  ]);
  return task.result?.[0]?.items ?? [];
}

export async function lookupBrandMentions(
  input: BrandLookupInput,
): Promise<BrandLookupResult> {
  if (!isLlmMentionsConfigured()) {
    throw new Error("DataForSEO LLM Mentions credentials are not configured");
  }

  const query = input.query.trim();
  if (!query) {
    throw new Error("Brand lookup query is required");
  }

  const detected = detectTarget(query);
  const target = buildLlmTarget(detected);
  const locationCode = input.locationCode ?? CHATGPT_LOCATION_CODE;
  const languageCode = input.languageCode ?? CHATGPT_LANGUAGE_CODE;
  const rawCompetitors = (input.competitors ?? [])
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPETITORS);
  const competitorGroups = resolveCompetitorGroups(
    detected.value,
    rawCompetitors,
  );
  const competitorKeys = competitorGroups.map((g) => g.label);
  const costEstimateUsd = estimateBrandLookupCostUsd(competitorGroups.length);

  const perPlatform: BrandLookupResult["perPlatform"] = [];

  for (const platform of PLATFORMS) {
    const loc =
      platform === "chat_gpt" ? CHATGPT_LOCATION_CODE : locationCode;
    const lang =
      platform === "chat_gpt" ? CHATGPT_LANGUAGE_CODE : languageCode;
    try {
      const metrics = await fetchAggregated({
        target,
        platform,
        locationCode: loc,
        languageCode: lang,
      });
      perPlatform.push({
        platform,
        status: "success",
        mentions: metrics.mentions,
        aiSearchVolume: metrics.aiSearchVolume,
      });
    } catch (err) {
      perPlatform.push({
        platform,
        status: "error",
        mentions: 0,
        aiSearchVolume: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let crossOutcomes: CrossOutcome[] = [];
  let shareOfVoice: BrandLookupResult["shareOfVoice"] = null;

  if (competitorGroups.length > 0) {
    const groups = [
      { key: detected.value, target },
      ...competitorGroups.map((c) => ({
        key: c.label,
        target: buildLlmTarget(c.detected),
      })),
    ];

    for (const platform of PLATFORMS) {
      const loc =
        platform === "chat_gpt" ? CHATGPT_LOCATION_CODE : locationCode;
      const lang =
        platform === "chat_gpt" ? CHATGPT_LANGUAGE_CODE : languageCode;
      try {
        const items = await fetchCrossAggregated({
          groups,
          platform,
          locationCode: loc,
          languageCode: lang,
        });
        crossOutcomes.push({ platform, status: "success", items });
      } catch {
        crossOutcomes.push({ platform, status: "error", items: [] });
      }
    }

    shareOfVoice = computeShareOfVoice(
      crossOutcomes,
      detected.value,
      competitorKeys,
    );
  }

  const successful = perPlatform.filter((p) => p.status === "success");
  const totalMentions = successful.reduce((sum, p) => sum + p.mentions, 0);
  const totalAiSearchVolume = successful.reduce(
    (sum, p) => sum + p.aiSearchVolume,
    0,
  );
  const hasData =
    totalMentions > 0 ||
    (shareOfVoice?.entries.some((e) => e.mentions != null) ?? false);

  return {
    query: input.query,
    detectedTargetType: detected.type,
    resolvedTarget: detected.value,
    fetchedAt: new Date().toISOString(),
    mode: "live",
    hasData,
    totalMentions,
    totalAiSearchVolume,
    perPlatform,
    shareOfVoice,
    costEstimateUsd,
  };
}

// Re-export detect helpers used by tests / consumers of the subpath.
export {
  computeShareOfVoice,
  detectTarget,
  resolveCompetitorGroups,
  sumNullable,
} from "./share-of-voice";
