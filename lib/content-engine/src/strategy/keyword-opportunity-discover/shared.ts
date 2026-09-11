import { eq, and, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable } from "@workspace/db/schema";
import type { GapOpportunity } from "@workspace/seo-tools/keywordGapAnalyzer";

export async function insertOpportunities(
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

export async function loadOpenQueuedKeywords(projectId: number): Promise<Set<string>> {
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
