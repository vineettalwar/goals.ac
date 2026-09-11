import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  type ContentStyle,
} from "@workspace/db/schema";
import type { GapOpportunity } from "@workspace/seo-tools/keywordGapAnalyzer";
import { getDecryptedUserGeminiKey } from "../../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../../support/ai/user-ai-provider";
import { getGscQueryRowsForProject } from "../../analytics/gsc-search-analytics-service";
import { defaultSyncDateRange } from "@workspace/seo-tools/analyticsDateRange";
import { priorPeriodRange } from "@workspace/seo-tools/gscSearchAnalytics";
import {
  rollupGscQueries,
  scoreGscQueries,
} from "@workspace/seo-tools/gscOpportunityScorer";
import { enrichGscOpportunitiesWithAi } from "../keyword-opportunity-enrich";

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
