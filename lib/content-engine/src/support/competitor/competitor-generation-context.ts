import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { brandProfilesTable, competitorAnalysesTable } from "@workspace/db/schema";
import { hostFromUrl, normalizeCompetitorUrl, normalizeCompetitorUrlList } from "./competitor-url";
import {
  buildCompetitorPromptBlock,
  type CompetitorAnalysisSnapshot,
} from "./competitor-prompt-block";

export type { CompetitorAnalysisSnapshot } from "./competitor-prompt-block";
export { buildCompetitorPromptBlock } from "./competitor-prompt-block";

export type CompetitorGenerationContext = {
  competitorUrls: string[];
  analyses: CompetitorAnalysisSnapshot[];
  competitorPositioning?: string;
  focusUrl?: string;
  promptBlock: string;
};

export async function loadCompetitorGenerationContext(
  projectId: number,
  focusUrl?: string,
  pieceCompetitorUrls?: string[],
): Promise<CompetitorGenerationContext> {
  const [brandProfile] = await db
    .select({
      competitorUrls: brandProfilesTable.competitorUrls,
      brandMemory: brandProfilesTable.brandMemory,
    })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const brandUrls = normalizeCompetitorUrlList(brandProfile?.competitorUrls ?? []);
  const pieceUrls = normalizeCompetitorUrlList(pieceCompetitorUrls ?? []);
  const competitorUrls =
    pieceUrls.length > 0 ? normalizeCompetitorUrlList([...pieceUrls, ...brandUrls]) : brandUrls;
  const competitorPositioning = brandProfile?.brandMemory?.competitorPositioning;

  const analysisRows = await db
    .select({
      competitorUrl: competitorAnalysesTable.competitorUrl,
      result: competitorAnalysesTable.result,
    })
    .from(competitorAnalysesTable)
    .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
    .orderBy(desc(competitorAnalysesTable.createdAt))
    .limit(10);

  const seen = new Set<string>();
  const analyses: CompetitorAnalysisSnapshot[] = [];
  for (const row of analysisRows) {
    const host = hostFromUrl(row.competitorUrl);
    if (seen.has(host)) continue;
    seen.add(host);
    analyses.push({
      competitorUrl: row.competitorUrl,
      competitorName: row.result.competitorName,
      contentGaps: row.result.contentGaps ?? [],
      quickWins: row.result.quickWins ?? [],
      weaknesses: row.result.weaknesses ?? [],
      threatLevel: row.result.threatLevel,
    });
  }

  const normalizedFocus =
    (focusUrl?.trim() ? normalizeCompetitorUrl(focusUrl) : null) ?? pieceUrls[0] ?? undefined;
  const promptBlock = buildCompetitorPromptBlock({
    competitorUrls,
    analyses,
    competitorPositioning,
    focusUrl: normalizedFocus,
  });

  return {
    competitorUrls,
    analyses,
    competitorPositioning,
    focusUrl: normalizedFocus,
    promptBlock,
  };
}
