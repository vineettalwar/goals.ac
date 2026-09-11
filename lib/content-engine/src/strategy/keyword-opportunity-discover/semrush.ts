import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  type ContentStyle,
} from "@workspace/db/schema";
import type { GapOpportunity } from "@workspace/seo-tools/keywordGapAnalyzer";
import { parseAutopilotSettings } from "../../support/autopilot/autopilot-scheduler";
import { getDecryptedUserGeminiKey } from "../../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../../support/ai/user-ai-provider";
import { getDecryptedSemrushCredentialsForUser } from "../../support/ai/org-ai-settings";
import {
  getKeywordResearchProvider,
  extractDomain,
  type DomainKeywordGap,
} from "@workspace/keyword-research-provider";
import {
  buildSemrushGapCacheKey,
  getCachedSemrushGaps,
  setCachedSemrushGaps,
} from "../../analytics/semrush-gap-cache";
import { logger } from "../../core/logger";
import { enrichSemrushGapsWithAi } from "../keyword-opportunity-enrich";

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
