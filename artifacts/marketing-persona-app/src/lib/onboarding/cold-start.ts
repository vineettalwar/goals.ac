import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable, type OrgVertical } from "@workspace/db/schema";
import { getVerticalPreset } from "@workspace/content-engine/vertical-presets";

/**
 * Last-resort cold start: only reached when the vertical-aware, brand-grounded
 * `discoverColdStartOpportunities` (content-engine's keyword-opportunity-service)
 * itself produced nothing — no AI client configured, or the AI pass failed. That
 * function fills each vertical preset's `{token}` seed angles with the brand's
 * real scraped services; this one cannot, so it strips the tokens out instead of
 * ever writing one verbatim. `suggestedTitle` goes through the same strip as
 * `keyword` — a raw template like "{Process} explained step by step" is a
 * customer-visible defect (D3), not a cosmetic one.
 */
function stripPlaceholderTokens(angle: string): string {
  return angle.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
}

export async function seedColdStartOpportunities(
  projectId: number,
  vertical: OrgVertical | null | undefined,
  competitorUrls: string[] = [],
): Promise<number> {
  const preset = getVerticalPreset(vertical);

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

  let inserted = 0;

  for (const angle of preset.seedAngles) {
    const keyword = stripPlaceholderTokens(angle);
    const key = keyword.toLowerCase();
    if (!key || existingKeywords.has(key)) continue;
    existingKeywords.add(key);

    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword,
      source: "ai_analysis",
      opportunityScore: 50,
      suggestedTitle: keyword,
      suggestedAngle: `A first piece for a ${preset.label.toLowerCase()} audience: ${keyword}`,
      status: "open",
    });
    inserted += 1;
  }

  for (const url of competitorUrls.slice(0, 3)) {
    const keyword = `What ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")} covers that you don't yet`;
    const key = keyword.toLowerCase();
    if (existingKeywords.has(key)) continue;
    existingKeywords.add(key);

    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword,
      source: "competitor_gap",
      competitorUrl: url,
      opportunityScore: 45,
      suggestedTitle: `A first look at what ${url} publishes`,
      suggestedAngle: "A comparison piece establishing your point of view against a named competitor.",
      status: "open",
    });
    inserted += 1;
  }

  return inserted;
}
