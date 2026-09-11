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
  type GapOpportunity,
} from "@workspace/seo-tools/keywordGapAnalyzer";
import { parseAutopilotSettings } from "../../support/autopilot/autopilot-scheduler";
import { getDecryptedUserGeminiKey } from "../../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../../support/ai/user-ai-provider";
import { getDecryptedSemrushCredentialsForUser } from "../../support/ai/org-ai-settings";
import { logger } from "../../core/logger";
import {
  enrichCompetitorGapsWithSemrush,
  discoverAiGaps,
} from "../keyword-opportunity-enrich";
import { insertOpportunities } from "./shared";
import { discoverGscOpportunities } from "./gsc";
import { discoverSemrushOpportunities } from "./semrush";
import {
  shouldRunColdStartFallback,
  discoverColdStartOpportunities,
} from "./cold-start";

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
