import type { AiProviderClient } from "@workspace/ai-providers";
import { modelForTier } from "@workspace/ai-providers";
import type { LlmVisibilityEngine } from "@workspace/db";

export const LLM_VISIBILITY_ENGINES: LlmVisibilityEngine[] = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
];

const ENGINE_SYSTEM: Record<LlmVisibilityEngine, string> = {
  chatgpt:
    "You are answering as ChatGPT would in a web search context: concise, list-oriented, cite specific products and URLs when relevant.",
  perplexity:
    "You are answering as Perplexity would: research-style, mention sources and brands explicitly, prefer authoritative citations.",
  claude:
    "You are answering as Claude would: balanced recommendations with named tools, companies, and links where helpful.",
  gemini:
    "You are answering as Google Gemini search would: practical recommendations with brand names and official URLs.",
};

export type VisibilityCheckInput = {
  prompt: string;
  brandName: string;
  brandUrl: string;
  competitorNames: string[];
  engine: LlmVisibilityEngine;
};

export type VisibilityCheckResult = {
  cited: boolean;
  citationUrl: string | null;
  competitorsMentioned: string[];
  responseSnippet: string;
};

function normalizeHost(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? url;
  }
}

function mentionsBrand(text: string, brandName: string, brandUrl: string): boolean {
  const lower = text.toLowerCase();
  const name = brandName.trim().toLowerCase();
  if (name.length >= 2 && lower.includes(name)) return true;
  const host = normalizeHost(brandUrl).toLowerCase();
  return host.length >= 3 && lower.includes(host);
}

function findCompetitorsMentioned(text: string, competitors: string[]): string[] {
  const lower = text.toLowerCase();
  return competitors.filter((c) => {
    const name = c.trim().toLowerCase();
    return name.length >= 2 && lower.includes(name);
  });
}

function extractCitationUrl(text: string, brandUrl: string): string | null {
  const host = normalizeHost(brandUrl);
  const urlMatch = text.match(/https?:\/\/[^\s)\]"']+/gi);
  if (!urlMatch) return null;
  const brandLink = urlMatch.find((u) => u.toLowerCase().includes(host.toLowerCase()));
  return brandLink ?? null;
}

/** Keep audience short enough for a probe question — never dump a full ICP paragraph. */
export function shortAudienceLabel(raw: string, fallback = "B2B teams"): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return fallback;
  // Long ICP blobs / multi-sentence profiles don't belong inside a question.
  if (cleaned.length > 48 || /[.!?]/.test(cleaned) || /includes|typically|require/i.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}

/** Trim long industry labels so questions stay scannable. */
export function shortIndustryLabel(raw: string, fallback = "this market"): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return fallback;
  // Drop parenthetical expansions like "(SaaS/Digital Transformation)".
  const withoutParens = cleaned.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (withoutParens.length <= 56) return withoutParens;
  const cut = withoutParens.slice(0, 56);
  const boundary = cut.lastIndexOf(" ");
  return (boundary > 24 ? cut.slice(0, boundary) : cut).trim();
}

export function buildDefaultPrompts(params: {
  brandName: string;
  industry: string;
  targetAudience: string;
  primaryKeywords: string[];
  competitorUrls: string[];
}): Array<{ prompt: string; category: "brand" | "keyword" | "competitor" }> {
  const { brandName, primaryKeywords, competitorUrls } = params;
  const industry = shortIndustryLabel(params.industry);
  const audience = shortAudienceLabel(params.targetAudience);
  const prompts: Array<{ prompt: string; category: "brand" | "keyword" | "competitor" }> = [];

  if (params.industry.trim()) {
    prompts.push({
      category: "brand",
      prompt: `What are the best ${industry} tools and platforms for ${audience}?`,
    });
    prompts.push({
      category: "brand",
      prompt: `Who are the leading companies in ${industry} right now?`,
    });
  }

  for (const keyword of primaryKeywords.slice(0, 4)) {
    if (!keyword.trim()) continue;
    prompts.push({
      category: "keyword",
      prompt: `What is the best solution for ${keyword.trim()}?`,
    });
  }

  for (const url of competitorUrls.slice(0, 4)) {
    const host = normalizeHost(url);
    const competitorLabel = host.split(".")[0] ?? host;
    prompts.push({
      category: "competitor",
      prompt: `Compare ${brandName || "leading options"} vs ${competitorLabel} for ${industry || "this market"}. Which should I choose?`,
    });
  }

  if (brandName && industry) {
    prompts.push({
      category: "brand",
      prompt: `Is ${brandName} a good choice for ${industry}? What do users recommend instead?`,
    });
  }

  return prompts.slice(0, 12);
}

export function competitorNamesFromUrls(urls: string[]): string[] {
  return urls
    .map((url) => {
      const host = normalizeHost(url);
      const label = host.split(".")[0] ?? host;
      return label.charAt(0).toUpperCase() + label.slice(1);
    })
    .filter(Boolean);
}

export async function checkPromptVisibility(
  client: AiProviderClient,
  input: VisibilityCheckInput,
): Promise<VisibilityCheckResult> {
  const response = await client.generate({
    model: modelForTier("gemini", "rapid"),
    systemInstruction: ENGINE_SYSTEM[input.engine],
    prompt: input.prompt,
    temperature: 0.4,
    maxOutputTokens: 1024,
  });

  const text = response.text.trim();
  const cited = mentionsBrand(text, input.brandName, input.brandUrl);
  const competitorsMentioned = findCompetitorsMentioned(text, input.competitorNames);

  return {
    cited,
    citationUrl: cited ? extractCitationUrl(text, input.brandUrl) : null,
    competitorsMentioned,
    responseSnippet: text.slice(0, 500),
  };
}

export function computeVisibilityScore(citedCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((citedCount / totalCount) * 100);
}

export function aggregateSnapshotsByDate(
  snapshots: Array<{ checkedAt: Date | string; cited: boolean }>,
): Array<{ date: string; score: number; cited: number; total: number }> {
  const buckets = new Map<string, { cited: number; total: number }>();

  for (const snap of snapshots) {
    const date = new Date(snap.checkedAt).toISOString().slice(0, 10);
    const bucket = buckets.get(date) ?? { cited: 0, total: 0 };
    bucket.total += 1;
    if (snap.cited) bucket.cited += 1;
    buckets.set(date, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { cited, total }]) => ({
      date,
      cited,
      total,
      score: computeVisibilityScore(cited, total),
    }));
}
