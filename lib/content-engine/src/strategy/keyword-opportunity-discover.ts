import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  keywordAnalysesTable,
  competitorAnalysesTable,
  keywordOpportunitiesTable,
  type AutopilotSettings,
} from "@workspace/db/schema";
import {
  opportunitiesFromKeywordAnalysis,
  opportunitiesFromCompetitorGaps,
  opportunitiesFromRedditThreads,
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
} from "@workspace/seo-tools/gscOpportunityScorer";
import {
  getKeywordResearchProvider,
  extractDomain,
  type DomainKeywordGap,
} from "@workspace/keyword-research-provider";
import {
  buildSemrushGapCacheKey,
  getCachedSemrushGaps,
  setCachedSemrushGaps,
} from "../analytics/semrush-gap-cache";
import type { ContentStyle } from "@workspace/db/schema";
import { logger } from "../core/logger";
import { getVerticalPreset } from "../verticals/vertical-presets";
import { resolveOrgVerticalForProject } from "../support/brand/brand-context-loader";
import {
  enrichGscOpportunitiesWithAi,
  enrichSemrushGapsWithAi,
  enrichCompetitorGapsWithSemrush,
  discoverAiGaps,
} from "./keyword-opportunity-enrich";

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
 *
 * `startIndex` lets a caller filling several templates in sequence (see
 * discoverColdStartOpportunities) rotate across the whole services list rather
 * than every template independently restarting at services[0] — a brand with
 * four real offerings should see all four across its seed angles, not one
 * offering four times.
 */
export function fillSeedAngleTemplate(
  template: string,
  fillers: ColdStartFillers,
  startIndex = 0,
): string | null {
  const tokens = [...template.matchAll(/\{([^}]+)\}/g)];
  if (tokens.length === 0) return template;

  let filled = template;
  let serviceIndex = startIndex;
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
    .map((template, index) => fillSeedAngleTemplate(template, fillers, index))
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
