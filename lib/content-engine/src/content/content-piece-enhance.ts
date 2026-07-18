import type { ContentFormatType } from "@workspace/db";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { isTwitterThreadOverLimit } from "@workspace/connectors/twitter-thread";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { cleanAndParse } from "../core/utils";
import { logger } from "../core/logger";
import type { ContentPieceResult } from "./content-studio-generator";
import {
  buildSeoLongformJsonSchema,
  describeQualityGaps,
  finalizeSeoContentPiece,
  isSeoLongformFormat,
  seoQualitySignals,
} from "./content-piece-seo";
import { applyInfographicToContentPiece } from "./infographic-template";
import { AI_WRITING_FROM_SCRATCH_PROMPT, AI_WRITING_RULES_PROMPT } from "./ai-writing-rules";
import { loadBrandVoiceGenerationContext } from "../support/brand/brand-voice-generation";
import type { UnifiedBrandContext } from "../brand/brand-voice";
import { humanizeContentPiece } from "./humanizer";
import { isHumanizableSocialFormat } from "./humanize-eligibility";
import {
  PLATFORM_CHAR_LIMITS,
  PLATFORM_LABELS,
  platformForFormat,
} from "../platform-voice";

export type EnhanceBrandContext = {
  companyName: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  projectId?: number;
};

const ENHANCE_SYSTEM_PROMPT = `You are a senior SEO editor. Your job is to upgrade an existing draft to publish-ready quality WITHOUT rewriting it from scratch.

Preserve:
- The article's core argument, topic order, and brand mentions
- Existing good paragraphs. Expand thin sections rather than replacing them.
- The target keyword and title intent

You MUST add what's missing:
- Inline external citations [Source](https://real-url) for factual claims. Use real authoritative URLs.
- Inline internal links [anchor](/blog/slug) woven into relevant sentences
- ## Frequently Asked Questions with 4-6 ### questions if missing
- Depth where sections are thin. Expand to 1,200+ total words.

When adding prose, apply human voice rules:
${AI_WRITING_FROM_SCRATCH_PROMPT}
${AI_WRITING_RULES_PROMPT}

Never output outline labels, word-count notes, or placeholder headings.

Respond ONLY with valid JSON. No markdown fences, no explanation.`;

export interface EnhanceContentInput {
  title: string;
  targetKeyword: string;
  bodyMarkdown: string;
  formatType: ContentFormatType;
  brand: EnhanceBrandContext;
  metaDescription?: string | null;
  /** SERP / competitor gaps from dual score — prioritized in the upgrade pass. */
  serpGaps?: string[];
  /** Uncovered secondary keywords / PAA questions / rival topics from the coverage checklist. */
  missingTerms?: string[];
}

function buildEnhancePrompt(
  input: EnhanceContentInput,
  existingPieceTitles: string[],
  brandVoiceContext?: string,
): string {
  const gaps = describeQualityGaps(input.bodyMarkdown, undefined, input.missingTerms);
  const serpGapBlock =
    input.serpGaps && input.serpGaps.length > 0
      ? `\nSERP / competitor gaps (fix these first):\n${input.serpGaps
          .slice(0, 8)
          .map((gap) => `- ${gap}`)
          .join("\n")}\n`
      : "";
  const existingArticlesCtx = existingPieceTitles.length
    ? `\nOther content on this site (use for internal links): ${existingPieceTitles.slice(0, 12).join("; ")}`
    : "";
  const voiceBlock =
    brandVoiceContext?.trim() ||
    `BRAND VOICE: ${input.brand.voiceTone || "Professional, clear, authoritative"}`;

  return `Upgrade this ${input.formatType.replace(/_/g, " ")} draft for ${input.brand.companyName} (${input.brand.websiteUrl}).

TARGET KEYWORD: "${input.targetKeyword}"
TITLE: ${input.title}
${voiceBlock}
TARGET AUDIENCE: ${input.brand.targetAudience || "Business professionals"}${existingArticlesCtx}
${serpGapBlock}
Quality gaps to fix:
${gaps}

CURRENT DRAFT (improve in place; do not discard good content):
---
${input.bodyMarkdown.trim()}
---

Return ONLY this JSON:
${buildSeoLongformJsonSchema(input.targetKeyword)}

Rules:
- Keep title unless the current one is generic; then improve it (55-65 chars, includes keyword)
- body_markdown must be the full improved article meeting ALL quality targets
- Prefer covering listed SERP gaps via new H2/H3 sections, FAQ answers, lists, or tables — do not invent competitor brand claims
- faq_section, citations, internal_link_suggestions, and json_ld_schema must match body_markdown
- meta_description: 150-160 chars with primary keyword`;
}

function validateEnhanceResult(result: unknown): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null) throw new Error("Invalid enhance response");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || !r.title.trim()) throw new Error("Missing title");
  if (typeof r.body_markdown !== "string" || r.body_markdown.trim().length < 500) {
    throw new Error("Enhanced body too short");
  }
}

function validateSocialTightenResult(result: unknown): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null) throw new Error("Invalid enhance response");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || !r.title.trim()) throw new Error("Missing title");
  if (typeof r.body_markdown !== "string" || r.body_markdown.trim().length < 20) {
    throw new Error("Tightened body too short");
  }
}

async function tightenSocialContentPiece(
  input: EnhanceContentInput,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<ContentPieceResult> {
  const platform = platformForFormat(input.formatType);
  if (!platform) throw new Error("Unknown social format");
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const label = PLATFORM_LABELS[platform];
  const ai = await resolveAiClient(userApiKey, aiProviderOptions);
  const isThread = input.formatType === "twitter_thread";

  const prompt = isThread
    ? `Tighten this ${label} thread for ${input.brand.companyName}.

PLATFORM: ${label} — EACH tweet ≤ ${limit} characters (not the whole thread)
TARGET KEYWORD / TOPIC: "${input.targetKeyword}"
VOICE: ${input.brand.voiceTone || "Clear and human"}

Goals:
- Keep numbered format: 1/ … 2/ … (multi-line tweets OK until the next number)
- Stronger hook on tweet 1; end it with Thread 🧵 if missing
- One insight per tweet; punchy close with CTA
- Do NOT invent facts or links
- Do NOT collapse into a single post

CURRENT DRAFT:
---
${input.bodyMarkdown.trim()}
---

Return ONLY JSON:
{
  "title": "string",
  "target_keyword": "${input.targetKeyword}",
  "body_markdown": "string — full tightened thread with 1/ 2/ numbering",
  "meta_description": "string — optional short summary"
}`
    : `Tighten this ${label} draft for ${input.brand.companyName}.

PLATFORM: ${label} (hard max ~${limit} characters)
TARGET KEYWORD / TOPIC: "${input.targetKeyword}"
VOICE: ${input.brand.voiceTone || "Clear and human"}

Goals:
- Stronger first-line hook
- One clear CTA or next step
- Cut fluff; stay under ${limit} characters
- Light hashtags only if natural for ${label} (0–3)
- Do NOT invent facts or links

CURRENT DRAFT:
---
${input.bodyMarkdown.trim()}
---

Return ONLY JSON:
{
  "title": "string",
  "target_keyword": "${input.targetKeyword}",
  "body_markdown": "string — full tightened post",
  "meta_description": "string — optional short summary"
}`;

  const response = await ai.generate({
    prompt,
    systemInstruction: isThread
      ? "You are a social editor for X threads. Keep 1/ 2/ numbering. Each tweet ≤ platform limit. Respond ONLY with valid JSON."
      : "You are a social editor. Tighten posts for the named platform. Respond ONLY with valid JSON.",
    responseMimeType: "application/json",
    maxOutputTokens: 4096,
    thinkingBudget: 0,
  });
  const raw = response.text ?? "";
  const parsed = cleanAndParse(raw);
  validateSocialTightenResult(parsed);
  const body = String((parsed as ContentPieceResult).body_markdown);
  if (isThread) {
    if (isTwitterThreadOverLimit(body, limit)) {
      throw new Error(`Tightened thread has a tweet over the ${limit}-character limit`);
    }
  } else if (body.length > limit) {
    throw new Error(`Tightened post exceeds ${label} limit (${limit} chars)`);
  }
  return {
    ...(parsed as ContentPieceResult),
    target_keyword: input.targetKeyword,
    body_markdown: body,
  };
}

export async function enhanceContentPiece(
  input: EnhanceContentInput,
  existingPieceTitles: string[] = [],
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
  unifiedBrand?: UnifiedBrandContext,
): Promise<ContentPieceResult> {
  if (isHumanizableSocialFormat(input.formatType)) {
    return tightenSocialContentPiece(input, userApiKey, aiProviderOptions);
  }

  if (!isSeoLongformFormat(input.formatType)) {
    throw new Error("Enhance quality is only available for long-form SEO content and social posts");
  }

  const prompt = await (async () => {
    let brandVoiceContext = "";
    if (input.brand.projectId) {
      const ctx = await loadBrandVoiceGenerationContext(
        input.brand.projectId,
        `${input.targetKeyword} enhance`,
      );
      brandVoiceContext = ctx?.promptContext ?? "";
    }
    return buildEnhancePrompt(input, existingPieceTitles, brandVoiceContext);
  })();
  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.generate({
        prompt,
        systemInstruction: ENHANCE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
        thinkingBudget: 2048,
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");

      const parsed = cleanAndParse<ContentPieceResult>(rawText);
      validateEnhanceResult(parsed);

      const finalized = finalizeSeoContentPiece({
        ...parsed,
        target_keyword: parsed.target_keyword || input.targetKeyword,
      });

      const signals = seoQualitySignals(finalized.body_markdown);
      if (signals.words < 800) throw new Error("Enhanced article still too short");

      const withInfographic = (piece: ContentPieceResult) =>
        applyInfographicToContentPiece(piece, input.formatType, input.brand.companyName);

      if (unifiedBrand) {
        const { result: humanizedResult, humanized } = await humanizeContentPiece(finalized, unifiedBrand, {
          userApiKey,
          aiProviderOptions,
        });
        if (humanized) {
          return withInfographic(finalizeSeoContentPiece(humanizedResult));
        }
        return withInfographic(
          finalizeSeoContentPiece({
            ...humanizedResult,
            pieceMetadata: {
              ...humanizedResult.pieceMetadata,
              humanized: finalized.pieceMetadata?.humanized,
            },
          }),
        );
      }

      return withInfographic(finalized);
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, pieceTitle: input.title }, "Content enhance attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}
