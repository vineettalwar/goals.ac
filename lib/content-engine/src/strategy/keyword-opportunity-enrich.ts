/**
 * AI enrichment helpers for keyword opportunities.
 *
 * Not part of the public package API — imported only by keyword-opportunity-discover.ts.
 * Exported from this module so the discover module can import them.
 */
import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
} from "@workspace/ai-providers";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import {
  gscScoredToGapOpportunity,
  type GscScoredOpportunity,
} from "@workspace/seo-tools/gscOpportunityScorer";
import {
  getKeywordResearchProvider,
  formatVolume,
  type DomainKeywordGap,
} from "@workspace/keyword-research-provider";
import { semrushGapsToOpportunities } from "@workspace/seo-tools/semrushGapAnalyzer";
import {
  applySemrushMetricsToGaps,
  type GapOpportunity,
} from "@workspace/seo-tools/keywordGapAnalyzer";
import { buildLanguagePromptLine } from "../support/content/content-language";
import { logger } from "../core/logger";

export async function enrichGscOpportunitiesWithAi(params: {
  brandName: string;
  industry: string;
  websiteUrl: string;
  scored: GscScoredOpportunity[];
  contentLanguage?: string;
  userApiKey?: string | null;
  aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
}): Promise<GapOpportunity[]> {
  if (params.scored.length === 0) return [];

  let client;
  try {
    client = await resolveAiClient(params.userApiKey, params.aiProviderOptions);
  } catch {
    return params.scored.map((s) => gscScoredToGapOpportunity(s));
  }

  const top = params.scored.slice(0, 12);
  const languageLine = buildLanguagePromptLine(params.contentLanguage);
  const prompt = `You are an SEO content strategist. For each Google Search Console query below, suggest an article title and angle.

Brand: ${params.brandName}
Industry: ${params.industry}
Website: ${params.websiteUrl}
${languageLine ? `\n${languageLine}\n` : ""}
Queries (JSON):
${JSON.stringify(
  top.map((q) => ({
    query: q.query,
    impressions: q.impressions,
    position: Number(q.position.toFixed(1)),
    pattern: q.pattern,
  })),
)}

Return ONLY valid JSON array with one item per query, same order:
[
  {
    "query": "string",
    "suggestedTitle": "article title",
    "suggestedAngle": "1-2 sentence angle",
    "intent": "informational" | "commercial" | "transactional",
    "difficulty": "low" | "medium" | "high"
  }
]`;

  try {
    const providerId = resolveProviderId(params.aiProviderOptions);
    const response = await client.generate({
      model: modelForProviderTier(providerId, "planning"),
      prompt,
      responseMimeType: "application/json",
      temperature: 0.4,
    });
    const parsed = JSON.parse(response.text ?? "[]") as Array<{
      query: string;
      suggestedTitle: string;
      suggestedAngle: string;
      intent?: string;
      difficulty?: "low" | "medium" | "high";
    }>;
    const byQuery = new Map(parsed.map((p) => [p.query.toLowerCase(), p]));

    return top.map((scored) => {
      const enrichment = byQuery.get(scored.query.toLowerCase());
      return gscScoredToGapOpportunity(scored, enrichment);
    });
  } catch (err) {
    logger.warn({ err }, "GSC AI enrichment failed");
    return top.map((s) => gscScoredToGapOpportunity(s));
  }
}

export async function enrichSemrushGapsWithAi(params: {
  brandName: string;
  industry: string;
  websiteUrl: string;
  gaps: DomainKeywordGap[];
  contentLanguage?: string;
  userApiKey?: string | null;
  aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
}): Promise<GapOpportunity[]> {
  if (params.gaps.length === 0) return [];

  const top = params.gaps.slice(0, 12);
  const fallback = semrushGapsToOpportunities(top, undefined, undefined, params.contentLanguage);

  let client;
  try {
    client = await resolveAiClient(params.userApiKey, params.aiProviderOptions);
  } catch {
    return fallback;
  }

  const languageLine = buildLanguagePromptLine(params.contentLanguage);
  const prompt = `You are an SEO content strategist. For each Semrush keyword gap below, suggest an article title and angle.

Brand: ${params.brandName}
Industry: ${params.industry}
Website: ${params.websiteUrl}
${languageLine ? `\n${languageLine}\n` : ""}
Keyword gaps (JSON):
${JSON.stringify(
  top.map((g) => ({
    keyword: g.keyword,
    searchVolume: g.searchVolume,
    keywordDifficulty: g.keywordDifficulty,
  })),
)}

Return ONLY valid JSON array with one item per keyword, same order:
[
  {
    "keyword": "string",
    "suggestedTitle": "article title",
    "suggestedAngle": "1-2 sentence angle",
    "intent": "informational" | "commercial" | "transactional"
  }
]`;

  try {
    const providerId = resolveProviderId(params.aiProviderOptions);
    const response = await client.generate({
      model: modelForProviderTier(providerId, "planning"),
      prompt,
      responseMimeType: "application/json",
      temperature: 0.4,
    });
    const parsed = JSON.parse(response.text ?? "[]") as Array<{
      keyword: string;
      suggestedTitle: string;
      suggestedAngle: string;
      intent?: string;
    }>;
    const byKeyword = new Map(parsed.map((p) => [p.keyword.toLowerCase(), p]));

    const enrichmentByKeyword = new Map<
      string,
      { suggestedTitle: string; suggestedAngle: string; intent?: string }
    >();
    for (const gap of top) {
      const enrichment = byKeyword.get(gap.keyword.toLowerCase());
      if (enrichment) {
        enrichmentByKeyword.set(gap.keyword.toLowerCase(), enrichment);
      }
    }

    return semrushGapsToOpportunities(top, enrichmentByKeyword, undefined, params.contentLanguage);
  } catch (err) {
    logger.warn({ err }, "Semrush AI enrichment failed");
    return fallback;
  }
}

export async function enrichCompetitorGapsWithSemrush(
  gapOpps: GapOpportunity[],
  credentials: { apiKey: string; database: string },
): Promise<GapOpportunity[]> {
  const keywords = [
    ...new Set(gapOpps.map((o) => o.keyword.trim()).filter(Boolean)),
  ].slice(0, 10);
  if (keywords.length === 0) return gapOpps;

  try {
    const provider = getKeywordResearchProvider();
    const metrics = await provider.getKeywordMetrics({
      keywords,
      database: credentials.database,
      apiKey: credentials.apiKey,
    });
    const metricsByKeyword = new Map(
      metrics.map((m) => [
        m.keyword.toLowerCase(),
        { searchVolume: m.searchVolume, difficulty: m.difficulty },
      ]),
    );
    return applySemrushMetricsToGaps(gapOpps, metricsByKeyword, formatVolume);
  } catch (err) {
    logger.warn({ err }, "Semrush metrics overlay for competitor gaps failed");
    return gapOpps;
  }
}

export async function discoverAiGaps(params: {
  brandName: string;
  industry: string;
  targetAudience: string;
  websiteUrl: string;
  primaryKeywords: string[];
  competitorNames: string[];
  existingKeywords: string[];
  userApiKey?: string | null;
  aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
}): Promise<GapOpportunity[]> {
  let client;
  try {
    client = await resolveAiClient(params.userApiKey, params.aiProviderOptions);
  } catch {
    return [];
  }
  const prompt = `You are an SEO strategist. Find keyword gap opportunities for a B2B brand.

Brand: ${params.brandName}
Industry: ${params.industry}
Audience: ${params.targetAudience}
Website: ${params.websiteUrl}
Current keywords: ${params.primaryKeywords.join(", ") || "none"}
Competitors: ${params.competitorNames.join(", ") || "unknown"}
Already tracked/planned: ${params.existingKeywords.slice(0, 30).join(", ") || "none"}

Return ONLY valid JSON array (max 8 items) of keyword gaps they should target:
[
  {
    "keyword": "string",
    "estimatedVolume": "e.g. 800/mo",
    "difficulty": "low" | "medium" | "high",
    "opportunityScore": <0-100 integer>,
    "intent": "informational" | "commercial" | "transactional",
    "suggestedTitle": "article title",
    "suggestedAngle": "1-2 sentence angle"
  }
]

Focus on keywords competitors likely rank for that this brand does not yet cover.`;

  try {
    const providerId = resolveProviderId(params.aiProviderOptions);
    const response = await client.generate({
      model: modelForProviderTier(providerId, "planning"),
      prompt,
      responseMimeType: "application/json",
      temperature: 0.5,
    });
    const parsed = JSON.parse(response.text ?? "[]") as Array<{
      keyword: string;
      estimatedVolume?: string;
      difficulty?: "low" | "medium" | "high";
      opportunityScore?: number;
      intent?: string;
      suggestedTitle: string;
      suggestedAngle: string;
    }>;
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      keyword: item.keyword,
      source: "ai_analysis" as const,
      estimatedVolume: item.estimatedVolume,
      difficulty: item.difficulty ?? "medium",
      opportunityScore: Math.min(100, Math.max(0, item.opportunityScore ?? 50)),
      intent: item.intent,
      suggestedTitle: item.suggestedTitle,
      suggestedAngle: item.suggestedAngle,
    }));
  } catch (err) {
    logger.warn({ err }, "AI keyword gap discovery failed");
    return [];
  }
}
