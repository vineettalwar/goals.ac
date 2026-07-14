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
  rankDropToOpportunity,
  type GapOpportunity,
} from "@workspace/seo-tools/keywordGapAnalyzer";
import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
} from "@workspace/ai-providers";
import { parseAutopilotSettings } from "./support/autopilot-scheduler";
import { getDecryptedUserGeminiKey } from "./support/user-api-key";
import { getUserAiProviderOptions } from "./support/user-ai-provider";
import { getDecryptedSemrushCredentialsForUser } from "./support/org-ai-settings";
import { getGscQueryRowsForProject } from "./gsc-search-analytics-service";
import { defaultSyncDateRange, priorPeriodRange } from "@workspace/seo-tools/gscSearchAnalytics";
import {
  rollupGscQueries,
  scoreGscQueries,
  gscScoredToGapOpportunity,
  type GscScoredOpportunity,
} from "@workspace/seo-tools/gscOpportunityScorer";
import {
  getKeywordResearchProvider,
  extractDomain,
  type DomainKeywordGap,
} from "@workspace/keyword-research-provider";
import { semrushGapsToOpportunities } from "@workspace/seo-tools/semrushGapAnalyzer";
import {
  buildSemrushGapCacheKey,
  getCachedSemrushGaps,
  setCachedSemrushGaps,
} from "./semrush-gap-cache";
import { buildLanguagePromptLine } from "./support/content-language";
import type { ContentStyle } from "@workspace/db/schema";
import { logger } from "./logger";

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
    throw new Error("Semrush is not configured. Add your organization's API key in Settings.");
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

  if (sourceMode === "all" || sourceMode === "gsc") {
    try {
      const gscOpps = await discoverGscOpportunities(projectId, userId);
      collected.push(...gscOpps);
    } catch (err) {
      logger.warn({ err, projectId }, "GSC opportunity discovery failed");
    }
  }

  if (sourceMode === "all" || sourceMode === "semrush") {
    const semrushCreds = await getDecryptedSemrushCredentialsForUser(userId);
    if (sourceMode === "semrush" && !semrushCreds) {
      throw new Error("Semrush is not configured. Add your organization's API key in Settings.");
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

    for (const comp of competitorRows) {
      collected.push(
        ...opportunitiesFromCompetitorGaps({
          contentGaps: comp.result.contentGaps ?? [],
          competitorUrl: comp.competitorUrl,
          competitorName: comp.result.competitorName,
          industry: brand?.industry ?? comp.industry,
        }),
      );
    }

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

  const inserted = await insertOpportunities(projectId, collected, existingKeywords);

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

  await db.insert(keywordOpportunitiesTable).values({
    websiteProjectId: params.projectId,
    keyword: opp.keyword,
    source: "rank_drop",
    estimatedVolume: opp.estimatedVolume ?? null,
    difficulty: opp.difficulty ?? null,
    opportunityScore: opp.opportunityScore,
    intent: opp.intent ?? null,
    suggestedTitle: opp.suggestedTitle,
    suggestedAngle: opp.suggestedAngle,
    status: "open",
  });
}
