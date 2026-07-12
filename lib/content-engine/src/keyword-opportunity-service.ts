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
  getGeminiClientWithFallback,
  modelForTier,
  wrapGeminiClient,
} from "@workspace/ai-providers";
import { parseAutopilotSettings } from "./support/autopilot-scheduler";
import { getDecryptedUserGeminiKey } from "./support/user-api-key";
import { logger } from "./logger";

async function discoverAiGaps(params: {
  brandName: string;
  industry: string;
  targetAudience: string;
  websiteUrl: string;
  primaryKeywords: string[];
  competitorNames: string[];
  existingKeywords: string[];
  userApiKey?: string | null;
}): Promise<GapOpportunity[]> {
  const clientResult = await getGeminiClientWithFallback(params.userApiKey);
  if (!clientResult) return [];

  const client = wrapGeminiClient(clientResult.client);
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
    const response = await client.generate({
      model: modelForTier("gemini", "planning"),
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

export async function discoverOpportunities(projectId: number, userId: number): Promise<number> {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
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

  const userApiKey = await getDecryptedUserGeminiKey(userId);
  const aiGaps = await discoverAiGaps({
    brandName: brand?.companyName ?? project.name,
    industry: brand?.industry ?? "",
    targetAudience: brand?.targetAudience ?? "",
    websiteUrl: project.url,
    primaryKeywords: brand?.primaryKeywords ?? [],
    competitorNames: competitorRows.map((c) => c.result.competitorName),
    existingKeywords: [...existingKeywords],
    userApiKey,
  });
  collected.push(...aiGaps);

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
    .where(
      and(eq(websiteProjectsTable.id, opp.websiteProjectId), eq(websiteProjectsTable.userId, userId)),
    )
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
