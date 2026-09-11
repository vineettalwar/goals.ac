import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { websiteProjectsTable, brandProfilesTable } from "@workspace/db/schema";
import type { GapOpportunity } from "@workspace/seo-tools/keywordGapAnalyzer";
import {
  modelForProviderTier,
  resolveAiClient,
  resolveProviderId,
} from "@workspace/ai-providers";
import { getDecryptedUserGeminiKey } from "../../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../../support/ai/user-ai-provider";
import { logger } from "../../core/logger";
import { getVerticalPreset } from "../../verticals/vertical-presets";
import { resolveOrgVerticalForProject } from "../../support/brand/brand-context-loader";
import { insertOpportunities, loadOpenQueuedKeywords } from "./shared";

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
