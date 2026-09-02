import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  keywordAnalysesTable,
  competitorAnalysesTable,
  keywordOpportunitiesTable,
  contentStrategiesTable,
  contentItemsTable,
  type AutopilotSettings,
} from "@workspace/db/schema";
import {
  opportunitiesFromKeywordAnalysis,
  opportunitiesFromCompetitorGaps,
  opportunitiesFromRedditThreads,
  applySemrushMetricsToGaps,
  rankDropToOpportunity,
  type GapOpportunity,
} from "@workspace/seo-tools/keywordGapAnalyzer";
import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
} from "@workspace/ai-providers";
import { parseAutopilotSettings } from "../support/autopilot/autopilot-scheduler";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { getDecryptedSemrushCredentialsForUser } from "../support/ai/org-ai-settings";
import { getGscQueryRowsForProject } from "../analytics/gsc-search-analytics-service";
import { defaultSyncDateRange } from "@workspace/seo-tools/analyticsDateRange";
import { priorPeriodRange } from "@workspace/seo-tools/gscSearchAnalytics";
import {
  rollupGscQueries,
  scoreGscQueries,
  gscScoredToGapOpportunity,
  type GscScoredOpportunity,
} from "@workspace/seo-tools/gscOpportunityScorer";
import {
  getKeywordResearchProvider,
  extractDomain,
  formatVolume,
  type DomainKeywordGap,
} from "@workspace/keyword-research-provider";
import { semrushGapsToOpportunities } from "@workspace/seo-tools/semrushGapAnalyzer";
import {
  buildSemrushGapCacheKey,
  getCachedSemrushGaps,
  setCachedSemrushGaps,
} from "../analytics/semrush-gap-cache";
import { buildLanguagePromptLine } from "../support/content/content-language";
import type { ContentStyle } from "@workspace/db/schema";
import { logger } from "../core/logger";
import { getVerticalPreset } from "../verticals/vertical-presets";
import { resolveOrgVerticalForProject } from "../support/brand/brand-context-loader";

async function enrichGscOpportunitiesWithAi(params: {
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

async function enrichSemrushGapsWithAi(params: {
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

export async function discoverSemrushOpportunities(
  projectId: number,
  userId: number,
  options?: { refresh?: boolean },
): Promise<GapOpportunity[]> {
  const credentials = await getDecryptedSemrushCredentialsForUser(userId);
  if (!credentials) {
    throw new Error("Semrush is not configured. Add your organization's API key in Integrations → Tools.");
  }

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const competitors = (brand?.competitorUrls ?? [])
    .map(extractDomain)
    .filter(Boolean)
    .slice(0, 3);

  if (competitors.length === 0) {
    throw new Error("Add competitor URLs in your brand profile to run Semrush gap analysis");
  }

  const contentLanguage =
    (project.contentStyle as ContentStyle | null)?.primaryLanguage ?? "en";

  const cacheKey = buildSemrushGapCacheKey({
    projectId,
    domain: project.url,
    competitors,
    database: credentials.database,
  });

  let gaps: DomainKeywordGap[];
  let usedCache = false;

  if (!options?.refresh) {
    const cached = await getCachedSemrushGaps(cacheKey);
    if (cached && cached.length > 0) {
      gaps = cached;
      usedCache = true;
      logger.info({ projectId, cacheKey }, "Semrush gap discovery served from cache");
    } else {
      gaps = await fetchSemrushGaps(project, competitors, credentials);
      await setCachedSemrushGaps(cacheKey, gaps);
    }
  } else {
    gaps = await fetchSemrushGaps(project, competitors, credentials);
    await setCachedSemrushGaps(cacheKey, gaps);
  }

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);

  const opportunities = await enrichSemrushGapsWithAi({
    brandName: brand?.companyName ?? project.name,
    industry: brand?.industry ?? "",
    websiteUrl: project.url,
    gaps,
    contentLanguage,
    userApiKey,
    aiProviderOptions,
  });

  if (!usedCache) {
    const settings = parseAutopilotSettings(project.autopilotSettings);
    await db
      .update(websiteProjectsTable)
      .set({
        autopilotSettings: {
          ...settings,
          lastSemrushDiscoveryAt: new Date().toISOString(),
        },
      })
      .where(eq(websiteProjectsTable.id, projectId));
  }

  return opportunities;
}

async function fetchSemrushGaps(
  project: { url: string },
  competitors: string[],
  credentials: { apiKey: string; database: string },
): Promise<DomainKeywordGap[]> {
  const provider = getKeywordResearchProvider();
  return provider.getDomainKeywordGaps({
    domain: project.url,
    competitors,
    database: credentials.database,
    apiKey: credentials.apiKey,
    limit: 25,
  });
}

export async function discoverGscOpportunities(
  projectId: number,
  userId: number,
): Promise<GapOpportunity[]> {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const dateRange = defaultSyncDateRange(28);
  const priorRange = priorPeriodRange(dateRange.startDate, dateRange.endDate);

  const [currentRows, priorRows] = await Promise.all([
    getGscQueryRowsForProject(projectId, dateRange.startDate, dateRange.endDate),
    getGscQueryRowsForProject(projectId, priorRange.startDate, priorRange.endDate),
  ]);

  if (currentRows.length === 0) return [];

  const currentRollup = rollupGscQueries(currentRows);
  const priorRollup = rollupGscQueries(priorRows);
  const scored = scoreGscQueries(currentRollup, priorRollup);

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);

  const contentLanguage =
    (project.contentStyle as ContentStyle | null)?.primaryLanguage ?? "en";

  return enrichGscOpportunitiesWithAi({
    brandName: brand?.companyName ?? project.name,
    industry: brand?.industry ?? "",
    websiteUrl: project.url,
    scored,
    contentLanguage,
    userApiKey,
    aiProviderOptions,
  });
}

async function insertOpportunities(
  projectId: number,
  collected: GapOpportunity[],
  existingKeywords: Set<string>,
): Promise<number> {
  let inserted = 0;
  for (const opp of collected) {
    const key = opp.keyword.toLowerCase().trim();
    if (!key || existingKeywords.has(key)) continue;
    existingKeywords.add(key);

    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword: opp.keyword,
      source: opp.source,
      competitorUrl: opp.competitorUrl ?? null,
      estimatedVolume: opp.estimatedVolume ?? null,
      difficulty: opp.difficulty ?? null,
      opportunityScore: opp.opportunityScore,
      intent: opp.intent ?? null,
      suggestedTitle: opp.suggestedTitle,
      suggestedAngle: opp.suggestedAngle,
      status: "open",
    });
    inserted += 1;
  }
  return inserted;
}

async function loadOpenQueuedKeywords(projectId: number): Promise<Set<string>> {
  const existing = await db
    .select({ keyword: keywordOpportunitiesTable.keyword })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        inArray(keywordOpportunitiesTable.status, ["open", "queued"]),
      ),
    );
  return new Set(existing.map((r) => r.keyword.toLowerCase()));
}

/** Persist Reddit discovery threads as open keyword opportunities (deduped). */
export async function persistRedditOpportunities(
  projectId: number,
  threads: Array<{
    title: string;
    url: string;
    subreddit: string;
    intentScore: number;
  }>,
  brandKeywords: string[],
): Promise<number> {
  if (threads.length === 0) return 0;
  const collected = opportunitiesFromRedditThreads({ threads, brandKeywords });
  const existingKeywords = await loadOpenQueuedKeywords(projectId);
  const inserted = await insertOpportunities(projectId, collected, existingKeywords);
  if (inserted > 0) {
    logger.info({ projectId, inserted }, "Reddit threads persisted as keyword opportunities");
  }
  return inserted;
}

async function enrichCompetitorGapsWithSemrush(
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

async function discoverAiGaps(params: {
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

export interface ColdStartFillers {
  /** Concrete service/procedure names to substitute into seed angle templates —
   * preferably the brand's actual product offerings, not generic keywords. */
  services: string[];
  industry: string;
  /** No location field exists on brand profiles today, so this is a caller-supplied
   * best-effort default (see discoverColdStartOpportunities), never a raw placeholder. */
  location: string;
}

/** True when `text` still contains a literal, unfilled `{token}` — the defect D3
 * explicitly calls out ("A literal {procedure} reaching a customer is a visible
 * defect"). Used both after template filling and after the AI pass, since a model
 * can echo a placeholder back verbatim. */
export function containsLiteralPlaceholder(text: string): boolean {
  return /\{[a-zA-Z][a-zA-Z0-9 ]*\}/.test(text);
}

/**
 * Fills a vertical preset's seed angle template (e.g. "{Procedure}: what actually
 * happens") from real brand data. Returns null — never the literal placeholder text —
 * when a token has nothing real to fill it with (e.g. no services on the brand
 * profile yet), so the caller can skip that angle instead of fabricating one.
 */
export function fillSeedAngleTemplate(
  template: string,
  fillers: ColdStartFillers,
): string | null {
  const tokens = [...template.matchAll(/\{([^}]+)\}/g)];
  if (tokens.length === 0) return template;

  let filled = template;
  let serviceIndex = 0;
  for (const match of tokens) {
    const raw = match[1]!;
    const key = raw.trim().toLowerCase();
    let value: string | undefined;

    if (key === "industry") {
      value = fillers.industry || "your industry";
    } else if (key === "scale") {
      value = "your typical scale";
    } else if (key === "location" || key.includes("jurisdiction")) {
      value = fillers.location;
    } else {
      // Every other token (procedure, service, situation, topic, capability,
      // channel, tactic, process, approach a/b, pattern, category, type of
      // build/campaign, common architecture/tactic, symptom...) maps to a real
      // service/offering — rotating through the list, and advancing on paired
      // tokens ("...A" / "...B") so a comparison angle doesn't repeat itself.
      value = fillers.services[serviceIndex % fillers.services.length];
      if (fillers.services.length > 0 && /(?:^| )[ab]$/.test(key)) serviceIndex += 1;
    }

    if (!value) return null;
    filled = filled.split(`{${raw}}`).join(value);
  }
  return filled;
}

/**
 * D3 cold-start idea generation: produces keyword_opportunities rows for a brand-new
 * project with zero Search Console (or any) history, from the vertical preset's
 * seedAngles filled with the brand's real services. Routes through the `planning`
 * AI tier (never a hardcoded model) to turn each filled angle into a concrete
 * keyword + title + angle; source is `competitor_gap` for the subset attributable to
 * a known competitor and `ai_analysis` otherwise — both valid without any GSC data.
 */
/**
 * Decides whether discoverOpportunities should fall back to the vertical-aware
 * cold-start generator. Only when the caller asked for "all" or "ai" sources (a
 * caller that explicitly asked for only "gsc" or "semrush" gets exactly that, no
 * silent extra source) and every other source came back with nothing — a project
 * that already has real data from any source is left alone.
 */
export function shouldRunColdStartFallback(
  sourceMode: "all" | "gsc" | "ai" | "semrush",
  collectedCount: number,
): boolean {
  return (sourceMode === "all" || sourceMode === "ai") && collectedCount === 0;
}

export async function discoverColdStartOpportunities(
  projectId: number,
  userId: number,
): Promise<number> {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const vertical = await resolveOrgVerticalForProject(projectId);
  const preset = getVerticalPreset(vertical);

  const services = brand?.productOfferings?.length ? brand.productOfferings : (brand?.primaryKeywords ?? []);
  const fillers: ColdStartFillers = {
    services,
    industry: brand?.industry ?? "",
    location: "your area",
  };

  const filledAngles = preset.seedAngles
    .map((template) => fillSeedAngleTemplate(template, fillers))
    .filter((angle): angle is string => Boolean(angle));

  if (filledAngles.length === 0) {
    logger.warn(
      { projectId, vertical },
      "Cold-start idea generation skipped: brand profile has no services/offerings to fill seed angles with yet",
    );
    return 0;
  }

  const competitorUrls = brand?.competitorUrls ?? [];
  const hasCompetitors = competitorUrls.length > 0;

  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);

  let client;
  try {
    client = await resolveAiClient(userApiKey, aiProviderOptions);
  } catch (err) {
    logger.warn({ err, projectId }, "Cold-start idea generation: AI client unavailable");
    return 0;
  }

  const prompt = `You are an SEO content strategist for a ${preset.label.toLowerCase()} that has just launched — no Search Console history, no analytics yet. Turn each already-filled article angle below into a concrete keyword opportunity.

Brand: ${brand?.companyName ?? project.name}
Industry: ${fillers.industry || "unknown"}
Services offered: ${fillers.services.join(", ") || "unknown"}
Website: ${project.url}
${hasCompetitors ? `Known competitors: ${competitorUrls.slice(0, 3).join(", ")}` : ""}

Angles (JSON array, already filled in — do not reintroduce {placeholder} tokens):
${JSON.stringify(filledAngles)}

Return ONLY a valid JSON array, one item per angle, same order:
[
  {
    "keyword": "string, the primary search phrase for this angle",
    "estimatedVolume": "e.g. 200/mo",
    "difficulty": "low" | "medium" | "high",
    "opportunityScore": <0-100 integer>,
    "intent": "informational" | "commercial" | "transactional",
    "suggestedTitle": "article title",
    "suggestedAngle": "1-2 sentence angle"
  }
]`;

  let parsed: Array<{
    keyword?: string;
    estimatedVolume?: string;
    difficulty?: "low" | "medium" | "high";
    opportunityScore?: number;
    intent?: string;
    suggestedTitle?: string;
    suggestedAngle?: string;
  }> = [];

  try {
    const providerId = resolveProviderId(aiProviderOptions);
    const response = await client.generate({
      model: modelForProviderTier(providerId, "planning"),
      prompt,
      responseMimeType: "application/json",
      temperature: 0.5,
    });
    const raw = JSON.parse(response.text ?? "[]");
    if (Array.isArray(raw)) parsed = raw;
  } catch (err) {
    logger.warn({ err, projectId }, "Cold-start idea generation AI pass failed");
    return 0;
  }

  const collected: GapOpportunity[] = filledAngles.map((angle, index) => {
    const item = parsed[index];
    // Every AI-sourced string is re-guarded for a leftover literal placeholder and
    // falls back to the already-filled angle (guaranteed placeholder-free) — never
    // to the raw template.
    const suggestedAngle =
      item?.suggestedAngle && !containsLiteralPlaceholder(item.suggestedAngle)
        ? item.suggestedAngle
        : angle;
    const suggestedTitle =
      item?.suggestedTitle && !containsLiteralPlaceholder(item.suggestedTitle)
        ? item.suggestedTitle
        : angle;
    const keyword =
      item?.keyword?.trim() && !containsLiteralPlaceholder(item.keyword)
        ? item.keyword.trim()
        : angle.slice(0, 80);

    const attributeToCompetitor = hasCompetitors && index % 3 === 0;

    return {
      keyword,
      source: attributeToCompetitor ? "competitor_gap" : "ai_analysis",
      competitorUrl: attributeToCompetitor ? competitorUrls[0] : undefined,
      estimatedVolume: item?.estimatedVolume,
      difficulty: item?.difficulty ?? "medium",
      opportunityScore: Math.min(100, Math.max(0, item?.opportunityScore ?? 55)),
      intent: item?.intent,
      suggestedTitle,
      suggestedAngle,
    };
  });

  const existingKeywords = await loadOpenQueuedKeywords(projectId);
  const inserted = await insertOpportunities(projectId, collected, existingKeywords);
  logger.info({ projectId, inserted, vertical }, "Cold-start keyword opportunities discovered");
  return inserted;
}

export async function discoverOpportunities(
  projectId: number,
  userId: number,
  options?: { sources?: Array<"all" | "gsc" | "ai" | "semrush">; refresh?: boolean },
): Promise<number> {
  const sourceMode = options?.sources?.[0] ?? "all";

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const [latestKeywordAnalysis] = await db
    .select()
    .from(keywordAnalysesTable)
    .where(eq(keywordAnalysesTable.websiteProjectId, projectId))
    .orderBy(desc(keywordAnalysesTable.createdAt))
    .limit(1);

  const competitorRows = await db
    .select()
    .from(competitorAnalysesTable)
    .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
    .orderBy(desc(competitorAnalysesTable.createdAt))
    .limit(5);

  const existing = await db
    .select({ keyword: keywordOpportunitiesTable.keyword })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        inArray(keywordOpportunitiesTable.status, ["open", "queued"]),
      ),
    );

  const existingKeywords = new Set(existing.map((r) => r.keyword.toLowerCase()));
  const collected: GapOpportunity[] = [];
  const semrushCreds = await getDecryptedSemrushCredentialsForUser(userId);

  if (sourceMode === "all" || sourceMode === "gsc") {
    try {
      const gscOpps = await discoverGscOpportunities(projectId, userId);
      collected.push(...gscOpps);
    } catch (err) {
      logger.warn({ err, projectId }, "GSC opportunity discovery failed");
    }
  }

  if (sourceMode === "all" || sourceMode === "semrush") {
    if (sourceMode === "semrush" && !semrushCreds) {
      throw new Error("Semrush is not configured. Add your organization's API key in Integrations → Tools.");
    }

    if (semrushCreds) {
      try {
        const semrushOpps = await discoverSemrushOpportunities(projectId, userId, {
          refresh: options?.refresh,
        });
        collected.push(...semrushOpps);
      } catch (err) {
        logger.warn({ err, projectId }, "Semrush opportunity discovery failed");
        if (sourceMode === "semrush") throw err;
      }
    }
  }

  if (sourceMode === "all" || sourceMode === "ai") {
    if (latestKeywordAnalysis?.result?.keywords) {
      collected.push(...opportunitiesFromKeywordAnalysis(latestKeywordAnalysis.result.keywords));
    }

    let gapOpps: GapOpportunity[] = [];
    for (const comp of competitorRows) {
      gapOpps.push(
        ...opportunitiesFromCompetitorGaps({
          contentGaps: comp.result.contentGaps ?? [],
          competitorUrl: comp.competitorUrl,
          competitorName: comp.result.competitorName,
          industry: brand?.industry ?? comp.industry,
        }),
      );
    }
    if (semrushCreds && gapOpps.length > 0) {
      gapOpps = await enrichCompetitorGapsWithSemrush(gapOpps, semrushCreds);
    }
    collected.push(...gapOpps);

    const [userApiKey, aiProviderOptions] = await Promise.all([
      getDecryptedUserGeminiKey(userId),
      getUserAiProviderOptions(userId),
    ]);
    const aiGaps = await discoverAiGaps({
      brandName: brand?.companyName ?? project.name,
      industry: brand?.industry ?? "",
      targetAudience: brand?.targetAudience ?? "",
      websiteUrl: project.url,
      primaryKeywords: brand?.primaryKeywords ?? [],
      competitorNames: competitorRows.map((c) => c.result.competitorName),
      existingKeywords: [...existingKeywords],
      userApiKey,
      aiProviderOptions,
    });
    collected.push(...aiGaps);
  }

  /**
   * A brand-new project (the common onboarding case: no GSC history because the
   * firm just signed up, no keyword analysis or competitor analysis because those
   * are separate features the firm hasn't touched yet) can reach this point having
   * collected nothing from any source above. discoverAiGaps still ran, but its
   * prompt is generic and vertical-blind; discoverColdStartOpportunities is the
   * vertical-aware fallback D3 was built for — seeded from the firm's own vertical
   * preset (law/dental/software/marketing angle templates) and the brand's real
   * services rather than a generic "find some keywords" prompt. It was written and
   * unit tested but never actually called from here, so a firm's first topic list
   * was silently falling back to the generic path even in a vertical with tailored
   * angles ready to use. Only runs when everything else came back empty, so it
   * changes nothing for a project that already has real data to work from.
   */
  let coldStartCount = 0;
  if (shouldRunColdStartFallback(sourceMode, collected.length)) {
    try {
      coldStartCount = await discoverColdStartOpportunities(projectId, userId);
      if (coldStartCount > 0) {
        logger.info({ projectId, coldStartCount }, "Keyword opportunities: vertical-aware cold start produced ideas after every other source came back empty");
      }
    } catch (err) {
      logger.warn({ err, projectId }, "Vertical-aware cold-start discovery failed");
    }
  }

  // discoverColdStartOpportunities inserts directly (its rows already carry their own
  // source and dedup pass) rather than joining `collected`, so its count is added
  // on rather than merged into the batch below.
  const inserted = (await insertOpportunities(projectId, collected, existingKeywords)) + coldStartCount;

  const settings = parseAutopilotSettings(project.autopilotSettings);
  const updatedSettings: AutopilotSettings = {
    ...settings,
    lastOpportunityDiscoveryAt: new Date().toISOString(),
  };
  await db
    .update(websiteProjectsTable)
    .set({ autopilotSettings: updatedSettings })
    .where(eq(websiteProjectsTable.id, projectId));

  logger.info({ projectId, inserted }, "Keyword opportunities discovered");
  return inserted;
}

export async function queueOpportunityToStrategy(
  opportunityId: number,
  userId: number,
): Promise<{ contentItemId: number; strategyId: number }> {
  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");
  if (opp.status === "queued") throw new Error("Opportunity already queued");

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, opp.websiteProjectId))
    .limit(1);
  if (!project) throw new Error("Access denied");

  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.websiteProjectId, opp.websiteProjectId))
    .orderBy(desc(contentStrategiesTable.year), desc(contentStrategiesTable.month))
    .limit(1);

  if (!strategy) {
    throw new Error("No content strategy found. Generate a 30-day strategy first.");
  }

  const draftItems = await db
    .select()
    .from(contentItemsTable)
    .where(and(eq(contentItemsTable.strategyId, strategy.id), eq(contentItemsTable.status, "draft")))
    .orderBy(asc(contentItemsTable.day))
    .limit(1);

  let contentItemId: number;

  if (draftItems.length > 0) {
    const item = draftItems[0]!;
    await db
      .update(contentItemsTable)
      .set({
        title: opp.suggestedTitle,
        topicAngle: opp.suggestedAngle,
        primaryKeyword: opp.keyword,
        format: "Blog article",
      })
      .where(eq(contentItemsTable.id, item.id));
    contentItemId = item.id;
  } else {
    const [newItem] = await db
      .insert(contentItemsTable)
      .values({
        strategyId: strategy.id,
        day: 29,
        title: opp.suggestedTitle,
        format: "Blog article",
        topicAngle: opp.suggestedAngle,
        primaryKeyword: opp.keyword,
        status: "draft",
      })
      .returning();
    contentItemId = newItem.id;
  }

  await db
    .update(keywordOpportunitiesTable)
    .set({ status: "queued", contentItemId })
    .where(eq(keywordOpportunitiesTable.id, opportunityId));

  return { contentItemId, strategyId: strategy.id };
}

export async function autoQueueHighScoreOpportunities(projectId: number, userId: number): Promise<number> {
  const [project] = await db
    .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project) return 0;

  const settings = parseAutopilotSettings(project.autopilotSettings);
  if (!settings.autoQueueOpportunities) return 0;

  const threshold = settings.opportunityScoreThreshold ?? 60;

  const open = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, projectId),
        eq(keywordOpportunitiesTable.status, "open"),
      ),
    )
    .orderBy(desc(keywordOpportunitiesTable.opportunityScore));

  let queued = 0;
  for (const opp of open) {
    if (opp.opportunityScore < threshold) break;
    try {
      await queueOpportunityToStrategy(opp.id, userId);
      queued += 1;
      if (queued >= 3) break;
    } catch (err) {
      logger.warn({ err, opportunityId: opp.id }, "Auto-queue opportunity failed");
      break;
    }
  }

  return queued;
}

export async function createRankDropOpportunity(params: {
  projectId: number;
  keyword: string;
  previousPosition: number;
  currentPosition: number;
}): Promise<void> {
  const opp = rankDropToOpportunity(params);
  const [existing] = await db
    .select({ id: keywordOpportunitiesTable.id })
    .from(keywordOpportunitiesTable)
    .where(
      and(
        eq(keywordOpportunitiesTable.websiteProjectId, params.projectId),
        eq(keywordOpportunitiesTable.keyword, params.keyword),
        eq(keywordOpportunitiesTable.status, "open"),
      ),
    )
    .limit(1);
  if (existing) return;

  const linkedPieceId = await findLinkedContentPieceId(params.projectId, params.keyword);
  const angle = linkedPieceId
    ? `${opp.suggestedAngle} Open the existing draft/piece #${linkedPieceId} and refresh with Fix gaps.`
    : opp.suggestedAngle;

  await db.insert(keywordOpportunitiesTable).values({
    websiteProjectId: params.projectId,
    keyword: opp.keyword,
    source: "rank_drop",
    estimatedVolume: opp.estimatedVolume ?? null,
    difficulty: opp.difficulty ?? null,
    opportunityScore: opp.opportunityScore,
    intent: opp.intent ?? null,
    suggestedTitle: opp.suggestedTitle,
    suggestedAngle: angle,
    status: "open",
  });
}

export type OpportunityBrief = {
  workingTitle: string;
  targetKeyword: string;
  searchIntent: string;
  angle: string;
  format: string;
  wordCount: number;
  outline: string[];
  context: {
    estimatedVolume?: string | null;
    difficulty?: string | null;
    gscPosition?: number | null;
    gscImpressions?: number | null;
    rankPosition?: number | null;
    serpFeatures?: Record<string, unknown> | null;
    source: string;
    opportunityScore: number;
  };
};

export async function buildBriefFromOpportunity(opportunityId: number): Promise<OpportunityBrief> {
  const [opp] = await db
    .select()
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");

  const { startDate, endDate } = defaultSyncDateRange();
  const gscRows = await getGscQueryRowsForProject(opp.websiteProjectId, startDate, endDate);
  const gscMatch = gscRows.find((row) => row.query.toLowerCase() === opp.keyword.toLowerCase());

  const { trackedKeywordsTable, keywordRankSnapshotsTable } = await import("@workspace/db/schema");
  const [tracked] = await db
    .select({ id: trackedKeywordsTable.id })
    .from(trackedKeywordsTable)
    .where(
      and(
        eq(trackedKeywordsTable.websiteProjectId, opp.websiteProjectId),
        eq(trackedKeywordsTable.keyword, opp.keyword),
        eq(trackedKeywordsTable.isActive, true),
      ),
    )
    .limit(1);

  let rankPosition: number | null = null;
  let serpFeatures: Record<string, unknown> | null = null;
  if (tracked) {
    const [snapshot] = await db
      .select({
        position: keywordRankSnapshotsTable.position,
        serpFeatures: keywordRankSnapshotsTable.serpFeatures,
      })
      .from(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, tracked.id))
      .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
      .limit(1);
    rankPosition = snapshot?.position ?? null;
    serpFeatures = (snapshot?.serpFeatures as Record<string, unknown>) ?? null;
  }

  const peopleAlsoAsk = Array.isArray(serpFeatures?.peopleAlsoAsk)
    ? (serpFeatures.peopleAlsoAsk as string[]).slice(0, 3)
    : [];

  const outline = [
    `Introduction — why "${opp.keyword}" matters now`,
    `Core concepts and definitions`,
    opp.suggestedAngle,
    ...peopleAlsoAsk.map((question) => `FAQ: ${question}`),
    "Actionable next steps for the reader",
  ];

  return {
    workingTitle: opp.suggestedTitle,
    targetKeyword: opp.keyword,
    searchIntent: opp.intent ?? "informational",
    angle: opp.suggestedAngle,
    format: "blog_post",
    wordCount: 1500,
    outline,
    context: {
      estimatedVolume: opp.estimatedVolume,
      difficulty: opp.difficulty,
      gscPosition: gscMatch?.position ?? null,
      gscImpressions: gscMatch?.impressions ?? null,
      rankPosition,
      serpFeatures,
      source: opp.source,
      opportunityScore: opp.opportunityScore,
    },
  };
}

export async function findLinkedContentPieceId(
  projectId: number,
  keyword: string,
): Promise<number | null> {
  const { contentPiecesTable } = await import("@workspace/db/schema");
  const needle = keyword.trim().toLowerCase();
  if (!needle) return null;

  const rows = await db
    .select({
      id: contentPiecesTable.id,
      targetKeyword: contentPiecesTable.targetKeyword,
      status: contentPiecesTable.status,
    })
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        inArray(contentPiecesTable.status, ["published", "ready", "draft"]),
      ),
    )
    .limit(300);

  const published = rows.find(
    (row) =>
      row.status === "published" && row.targetKeyword?.trim().toLowerCase() === needle,
  );
  if (published) return published.id;

  const ready = rows.find(
    (row) => row.status === "ready" && row.targetKeyword?.trim().toLowerCase() === needle,
  );
  if (ready) return ready.id;

  const draft = rows.find((row) => row.targetKeyword?.trim().toLowerCase() === needle);
  return draft?.id ?? null;
}

export async function attachLinkedContentPieces<T extends { keyword: string; source: string }>(
  projectId: number,
  opportunities: T[],
): Promise<Array<T & { linkedContentPieceId: number | null }>> {
  const refreshSources = new Set(["rank_drop", "content_refresh"]);
  const map = new Map<string, number | null>();
  for (const opp of opportunities) {
    const key = opp.keyword.toLowerCase();
    if (map.has(key)) continue;
    if (!refreshSources.has(opp.source) && opp.source !== "gsc_query") {
      map.set(key, null);
      continue;
    }
    map.set(key, await findLinkedContentPieceId(projectId, opp.keyword));
  }
  return opportunities.map((opp) => ({
    ...opp,
    linkedContentPieceId: map.get(opp.keyword.toLowerCase()) ?? null,
  }));
}

/**
 * When GSC clicks fall sharply vs the prior period for keywords tied to
 * existing content, open a content_refresh opportunity.
 */
export async function createClickDeclineRefreshOpportunities(
  projectId: number,
): Promise<number> {
  const { contentPiecesTable } = await import("@workspace/db/schema");
  const recentRange = defaultSyncDateRange(14);
  const priorRange = priorPeriodRange(recentRange.startDate, recentRange.endDate);

  const [recentRows, priorRows, pieces] = await Promise.all([
    getGscQueryRowsForProject(projectId, recentRange.startDate, recentRange.endDate),
    getGscQueryRowsForProject(projectId, priorRange.startDate, priorRange.endDate),
    db
      .select({
        id: contentPiecesTable.id,
        targetKeyword: contentPiecesTable.targetKeyword,
        title: contentPiecesTable.title,
      })
      .from(contentPiecesTable)
      .where(
        and(
          eq(contentPiecesTable.websiteProjectId, projectId),
          inArray(contentPiecesTable.status, ["published", "ready"]),
        ),
      )
      .limit(200),
  ]);

  function aggregateClicks(
    rows: Array<{ query: string; clicks: number; impressions: number }>,
  ): Map<string, { clicks: number; impressions: number }> {
    const map = new Map<string, { clicks: number; impressions: number }>();
    for (const row of rows) {
      const key = row.query.toLowerCase();
      const prev = map.get(key) ?? { clicks: 0, impressions: 0 };
      map.set(key, {
        clicks: prev.clicks + (row.clicks ?? 0),
        impressions: prev.impressions + (row.impressions ?? 0),
      });
    }
    return map;
  }

  const recent = aggregateClicks(recentRows);
  const prior = aggregateClicks(priorRows);
  let inserted = 0;

  for (const piece of pieces) {
    const keyword = piece.targetKeyword?.trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    const priorMetrics = prior.get(key);
    const recentMetrics = recent.get(key);
    if (!priorMetrics || priorMetrics.clicks < 10) continue;
    const recentClicks = recentMetrics?.clicks ?? 0;
    if (recentClicks > priorMetrics.clicks * 0.6) continue;

    const [existing] = await db
      .select({ id: keywordOpportunitiesTable.id })
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.keyword, keyword),
          inArray(keywordOpportunitiesTable.status, ["open", "queued"]),
        ),
      )
      .limit(1);
    if (existing) continue;

    const dropPct = Math.round((1 - recentClicks / priorMetrics.clicks) * 100);
    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword,
      source: "content_refresh",
      estimatedVolume: `${priorMetrics.clicks} clicks prior · ${recentClicks} recent`,
      difficulty: "medium",
      opportunityScore: Math.min(95, 55 + Math.min(35, dropPct)),
      intent: "informational",
      suggestedTitle: `Refresh: ${piece.title || keyword}`,
      suggestedAngle: `GSC clicks dropped ~${dropPct}% vs the prior 14 days. Refresh the published article for "${keyword}" with updated sections, FAQ, and SERP gaps.`,
      status: "open",
    });
    inserted += 1;
    if (inserted >= 5) break;
  }

  return inserted;
}

export async function queueOpportunityAndGenerate(
  opportunityId: number,
  userId: number,
): Promise<{
  contentItemId: number;
  strategyId: number;
  primaryPieceId: number;
}> {
  const queued = await queueOpportunityToStrategy(opportunityId, userId);
  const { generateFromContentItem } = await import("./autopilot-orchestrator");
  const [opp] = await db
    .select({ websiteProjectId: keywordOpportunitiesTable.websiteProjectId })
    .from(keywordOpportunitiesTable)
    .where(eq(keywordOpportunitiesTable.id, opportunityId))
    .limit(1);
  if (!opp) throw new Error("Opportunity not found");

  const generated = await generateFromContentItem(
    queued.contentItemId,
    opp.websiteProjectId,
    userId,
    { generateVariants: false },
  );

  return {
    contentItemId: queued.contentItemId,
    strategyId: queued.strategyId,
    primaryPieceId: generated.primaryPieceId,
  };
}
