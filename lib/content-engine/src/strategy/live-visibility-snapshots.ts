import type { LlmVisibilityEngine } from "@workspace/db/schema";
import type { BrandLookupResult, LlmPlatform } from "@workspace/serp-provider";

export const LIVE_PROMPT = "Brand lookup (live LLM Mentions)";

const PLATFORM_ENGINE: Record<LlmPlatform, LlmVisibilityEngine> = {
  chat_gpt: "chatgpt",
  google: "gemini",
};

export type LiveVisibilitySnapshotInsert = {
  prompt: string;
  engine: LlmVisibilityEngine;
  cited: boolean;
  citationUrl: null;
  competitorsMentioned: string[];
  responseSnippet: string;
  source: "live";
};

/** Shape DataForSEO brand-lookup results into llm_visibility_snapshots rows. */
export function liveVisibilitySnapshotsFromLookup(
  result: BrandLookupResult,
): LiveVisibilitySnapshotInsert[] {
  const targetSov = result.shareOfVoice?.entries.find((e) => e.isTarget)?.sharePct;
  const sovSummary = targetSov != null ? `SoV ${Math.round(targetSov)}%` : null;
  const competitorsMentioned =
    result.shareOfVoice?.entries
      .filter((e) => !e.isTarget && (e.mentions ?? 0) > 0)
      .map((e) => e.label) ?? [];

  const rows: LiveVisibilitySnapshotInsert[] = [];
  for (const platform of result.perPlatform) {
    if (platform.status !== "success") continue;
    const engine = PLATFORM_ENGINE[platform.platform];
    if (!engine) continue;

    const platformLabel =
      platform.platform === "google"
        ? "Google AI Overview (DataForSEO)"
        : "ChatGPT (DataForSEO LLM Mentions)";
    const snippet = [
      platformLabel,
      `mentions=${platform.mentions}`,
      `totalMentions=${result.totalMentions}`,
      `aiSearchVolume=${platform.aiSearchVolume}`,
      sovSummary,
    ]
      .filter(Boolean)
      .join(" · ");

    rows.push({
      prompt: LIVE_PROMPT,
      engine,
      cited: platform.mentions > 0,
      citationUrl: null,
      competitorsMentioned,
      responseSnippet: snippet,
      source: "live",
    });
  }
  return rows;
}

export function brandLookupQuery(url: string, brandName: string): string {
  try {
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(href).hostname.replace(/^www\./i, "") || brandName;
  } catch {
    return brandName;
  }
}
