import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { keywordOpportunitiesTable, type OrgVertical } from "@workspace/db/schema";
import { getVerticalPreset } from "@workspace/content-engine/vertical-presets";

/**
 * If Search Console was skipped or came back empty, ideas must still exist (PRD
 * B5 / D6). Rather than parallel the AI-gap machinery in
 * `keyword-opportunity-service.ts`, this seeds a handful of `ai_analysis` rows
 * straight from the vertical preset's `seedAngles` — enough for the onboarding
 * completion screen and the first article, with the real discovery pipeline
 * (`discoverOpportunities`) taking over once the firm has real GSC/competitor
 * data to work from.
 */
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
    const keyword = angle.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
    const key = keyword.toLowerCase();
    if (!key || existingKeywords.has(key)) continue;
    existingKeywords.add(key);

    await db.insert(keywordOpportunitiesTable).values({
      websiteProjectId: projectId,
      keyword,
      source: "ai_analysis",
      opportunityScore: 50,
      suggestedTitle: angle,
      suggestedAngle: `A first piece for a ${preset.label.toLowerCase()} audience: ${angle}`,
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
