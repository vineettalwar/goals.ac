import type { ContentFormatType } from "@workspace/db";
import { buildNewsSourceGuardPrompt } from "../news-source-guard";
import {
  buildSeoLongformJsonSchema,
  buildSeoLongformRequirements,
  isSeoLongformFormat,
} from "../content-piece-seo";
import { buildBrandVoicePromptContext } from "../../brand/brand-voice";
import { loadBrandVoiceGenerationContext } from "../../support/brand/brand-voice-generation";
import {
  buildPlatformVoicePromptContext,
  platformForFormat,
} from "../../platform-voice";
import { buildDestinationPromptHint } from "../../support/publishing/publishing-settings";
import { buildDeeplGenerationLanguageLine } from "../../support/integrations/deepl-refinement";
import { loadDeeplCredentialContextForProject } from "../../support/integrations/deepl-credentials";
import { resolveDeeplApiKey } from "@workspace/deepl";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "../../support/competitor/competitor-url";
import {
  LINKEDIN_ARCHETYPE_STRUCTURES,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
} from "../linkedin-archetypes";
import { getVerticalPreset } from "../../verticals/vertical-presets";
import type { BrandContext, ContentGenerationContext } from "./types";
import { FORMAT_CONFIGS } from "./format-configs";

/** Vertical tone guardrails, appended after whichever voice source wins below — the
 * vertical must not depend on which brand voice path (platform / RAG skill / plain
 * brand fields) happened to resolve for this generation. */
function verticalToneLine(brand: BrandContext): string {
  if (!brand.vertical) return "";
  const preset = getVerticalPreset(brand.vertical);
  return `\nVERTICAL TONE GUARDRAILS (${preset.label}): ${preset.toneGuidance}\n`;
}

async function resolveVoicePromptContext(
  brand: BrandContext,
  format: ContentFormatType,
  keyword: string,
  angleHint?: string,
): Promise<string> {
  const verticalLine = verticalToneLine(brand);

  const platform = platformForFormat(format);
  if (platform) {
    const platformVoice = buildPlatformVoicePromptContext(brand.platformVoices, platform);
    if (platformVoice.trim()) return `${platformVoice}${verticalLine}`;
  }
  if (brand.projectId) {
    const ctx = await loadBrandVoiceGenerationContext(
      brand.projectId,
      `${keyword} ${format} ${angleHint ?? ""}`,
    );
    if (ctx?.promptContext.trim()) return `${ctx.promptContext}${verticalLine}`;
  }
  // buildBrandVoicePromptContext already injects the vertical line itself.
  return buildBrandVoicePromptContext(brand);
}

/** Primary-first competitor URL hints for the generate prompt. */
function buildCompetitorUrlsPromptFragment(
  competitorUrls?: string[],
  focusUrl?: string,
): string {
  const urls = normalizeCompetitorUrlList(competitorUrls ?? []);
  if (urls.length === 0) return "";

  const primary =
    (focusUrl?.trim() ? normalizeCompetitorUrl(focusUrl) : null) ?? urls[0]!;
  const others = urls.filter((u) => hostFromUrl(u) !== hostFromUrl(primary));
  const lines = [
    "\nCOMPETITOR URLS FOR THIS PIECE:",
    `- Primary competitor to differentiate against: ${primary}`,
  ];
  if (others.length > 0) {
    lines.push(`- Additional competitors to account for: ${others.join(", ")}`);
  }
  return lines.join("\n");
}

export { resolveVoicePromptContext };

export async function buildPrompt(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  existingPieceTitles?: string[],
  generationContext?: ContentGenerationContext,
): Promise<string> {
  const config = FORMAT_CONFIGS[format];
  const destinationHint = buildDestinationPromptHint(
    generationContext?.intendedPublishPlatform,
    generationContext?.intendedOutputMode ?? generationContext?.intendedEditorMode,
  );
  const kwList =
    brand.primaryKeywords.length > 0
      ? brand.primaryKeywords.slice(0, 5).join(", ")
      : keyword;
  const wordRange = brand.contentStyle?.defaultWordCount
    ? `~${brand.contentStyle.defaultWordCount}`
    : config.wordRange;
  const brandVoiceContext = await resolveVoicePromptContext(brand, format, keyword, angleHint);
  // Generic fallback removed — callers must gate with isProjectVoiceReady / voice_required.
  const defaultVoice = brand.voiceTone?.trim() ?? "";
  const voiceLine =
    brandVoiceContext || (defaultVoice ? `BRAND VOICE: ${defaultVoice}` : "");
  const competitorContext = [
    generationContext?.competitorPromptBlock?.trim() ?? "",
    buildCompetitorUrlsPromptFragment(
      generationContext?.competitorUrls,
      generationContext?.competitorFocusUrl,
    ),
  ]
    .filter(Boolean)
    .join("");
  const newsSourceGuard = buildNewsSourceGuardPrompt(angleHint);
  const newsSourceLine = newsSourceGuard ? `\n${newsSourceGuard}` : "";

  let languageLine = "";
  if (brand.projectId) {
    const deeplContext = await loadDeeplCredentialContextForProject(brand.projectId);
    const deeplConfigured = Boolean(resolveDeeplApiKey(deeplContext));
    languageLine = buildDeeplGenerationLanguageLine(brand.contentStyle, deeplConfigured);
    if (languageLine) {
      languageLine = `\n${languageLine}`;
    }
  }

  // Special handling for LinkedIn posts with archetypes and hooks
  if (format === "linkedin_post") {
    // For LinkedIn, we expect angleHint to contain archetype and hook info
    // Format: "archetype:${archetypeId}|hook:${hookId}"
    let archetypeInfo = "";
    let hookInfo = "";

    if (angleHint) {
      const parts = angleHint.split("|");
      for (const part of parts) {
        if (part.startsWith("archetype:")) {
          const archetypeId = part.split(":")[1];
          const archetype = LINKEDIN_ARCHETYPES.find(
            (a) => a.id === archetypeId,
          );
          if (archetype) {
            archetypeInfo = `
SELECTED ARCHETYPE: ${archetype.label} - ${archetype.description}
EXAMPLE HOOK: "${archetype.exampleHook}"
STRUCTURE GUIDELINE: ${LINKEDIN_ARCHETYPE_STRUCTURES[archetype.id]}`;
          }
        } else if (part.startsWith("hook:")) {
          const hookId = part.split(":")[1];
          const hook = LINKEDIN_HOOK_TYPES.find((h) => h.id === hookId);
          if (hook) {
            hookInfo = `
SELECTED HOOK TYPE: ${hook.label}
HOOK TEMPLATE: "${hook.template}"
STRENGTH SCORE: ${hook.strengthScore}/10`;
          }
        }
      }
    }

    return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${voiceLine}
${archetypeInfo}
${hookInfo}

Requirements:
- Write entirely in the brand voice described above
- Target the keyword "${keyword}" naturally throughout
- Reference ${brand.companyName} 2-3 times without being promotional
- Use specific data points, named frameworks, and concrete examples, but only ones you actually know to be true
- Never invent a statistic, percentage, survey result, or study finding. If a hook or example calls for a number and you do not have a real, verifiable one, make the point with a concrete qualitative detail instead of a fabricated figure
- Content must be original, authoritative, and citation-worthy
- For LinkedIn posts: optimal length is 1300-1800 characters
- Start with a strong hook that stops scroll
- Use short paragraphs (2-3 sentences maximum)
- Include specific insights or examples
- End with an engagement question or thought-provoking insight
- Do NOT include hashtags in the body text (they go in the comments)
- Write like a founder speaking to peers - authentic and direct${competitorContext}${destinationHint}`;
  }

  if (isSeoLongformFormat(format)) {
    const existingArticlesCtx = existingPieceTitles?.length
      ? `\nExisting content on this site (use for internal links): ${existingPieceTitles.slice(0, 12).join("; ")}`
      : "";

    const schemaType = brand.vertical ? getVerticalPreset(brand.vertical).schemaType : "Article";

    return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${angleHint ? `CONTENT ANGLE / TITLE HINT: ${angleHint}` : ""}${newsSourceLine}${voiceLine ? `\n${voiceLine}` : ""}${languageLine}${existingArticlesCtx}

Write a complete, publish-ready ${wordRange}-word article. Use this outline as internal guidance only: do NOT copy these bullet labels, word counts, or placeholder headings into the output:
${config.structure}

Return ONLY this JSON object:
${buildSeoLongformJsonSchema(keyword, schemaType)}

${buildSeoLongformRequirements(brand.companyName, keyword, wordRange, schemaType, {
  funnelStage: generationContext?.funnelStage,
  proofAssets: generationContext?.proofAssets,
})}${competitorContext}${destinationHint}`;
  }

  return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${angleHint ? `CONTENT ANGLE / TITLE HINT: ${angleHint}` : ""}${newsSourceLine}${voiceLine ? `\n${voiceLine}` : ""}

Write a complete, publish-ready ${wordRange}-word piece. Use this outline as internal guidance only: do NOT copy outline labels into the output:
${config.structure}

Return ONLY this exact JSON with no additional text:
{
  "title": "<compelling title>",
  "target_keyword": "${keyword}",
  "body_markdown": "<full content in valid markdown>"
}

Requirements:
- Write real prose: never output planning notes or placeholder headings
- Write entirely in the brand voice described above
- Target the keyword "${keyword}" naturally throughout
- Reference ${brand.companyName} where appropriate without being promotional
- Content must be original and actionable${competitorContext}${destinationHint}`;
}
