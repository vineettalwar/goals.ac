import type { ContentFormatType } from "@workspace/db";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { resolveAiClient } from "./support/resolve-ai-client";
import { cleanAndParse } from "./utils";
import { logger } from "./logger";
import type { ContentPieceResult } from "./content-studio-generator";
import {
  buildSeoLongformJsonSchema,
  describeQualityGaps,
  finalizeSeoContentPiece,
  isSeoLongformFormat,
  seoQualitySignals,
} from "./content-piece-seo";
import { AI_WRITING_RULES_PROMPT } from "./ai-writing-rules";
import { loadBrandVoiceGenerationContext } from "./support/brand-voice-generation";

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
}

function buildEnhancePrompt(
  input: EnhanceContentInput,
  existingPieceTitles: string[],
  brandVoiceContext?: string,
): string {
  const gaps = describeQualityGaps(input.bodyMarkdown);
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

export async function enhanceContentPiece(
  input: EnhanceContentInput,
  existingPieceTitles: string[] = [],
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<ContentPieceResult> {
  if (!isSeoLongformFormat(input.formatType)) {
    throw new Error("Enhance quality is only available for long-form SEO content");
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

      return finalized;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, pieceTitle: input.title }, "Content enhance attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}
