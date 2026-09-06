import { logger } from "../core/logger";
import {
  wrapGeminiClient,
  createUserGeminiClient,
  isUserKeyError,
  resolveProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { assertAiGenerationEnabled } from "../support/publishing/platform-guard";
import type { ContentFormatType } from "@workspace/db";
import {
  SEO_SYSTEM_PROMPT,
  finalizeSeoContentPiece,
  isSeoLongformFormat,
  seoQualitySignals,
} from "./content-piece-seo";
import { resolveHumanizationLevel, resolveWritingSample } from "../brand/brand-voice";
import { humanizeContentPiece } from "./humanizer";
import { isHumanizableFormat } from "./humanize-eligibility";
import {
  enrichContentPieceImages,
  parseImageSettings,
} from "../articles/article-image-enricher";
import { applyInfographicToContentPiece } from "./infographic-template";
import { loadStockCredentialContextForProject } from "../support/integrations/stock-credentials";
import { maybeRefineWithDeepl } from "../support/integrations/deepl-refinement";
import { cleanAndParse, stripModelPreamble } from "../core/utils";
import { getVerticalPreset } from "../verticals/vertical-presets";
import {
  applyForbiddenClaimsGuardrail,
  appendVerticalDisclaimer,
  regenerateBodyWithoutForbiddenClaims,
} from "../verticals/vertical-guardrails";
import {
  type BrandContext,
  type ContentPieceResult,
  type ContentGenerationContext,
  SYSTEM_PROMPT,
  buildPrompt,
} from "./content-studio-prompts";
import { buildCacheKey, cacheGet, cacheSet } from "./content-studio-cache";

// ---------------------------------------------------------------------------
// AI generation options
// ---------------------------------------------------------------------------

function getAiGenerationOptions(format: ContentFormatType) {
  if (isSeoLongformFormat(format)) {
    return {
      systemInstruction: SEO_SYSTEM_PROMPT,
      maxOutputTokens: 16384,
      thinkingBudget: 2048,
    };
  }
  return {
    systemInstruction: SYSTEM_PROMPT,
    maxOutputTokens: 8192,
    thinkingBudget: 0,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers (also exported for content-studio-repurpose.ts)
// ---------------------------------------------------------------------------

/**
 * Cleans `title` and `body_markdown` in place on a freshly parsed AI response,
 * before `validateResult` or any downstream processing sees them. See MED-2 in
 * the production readiness audit: `extractJsonBlock` cannot see inside a JSON
 * string value, so a conversational preamble the model wrote there ("Certainly!
 * Here's the article:") would otherwise survive straight through to publish.
 */
export function stripPreambleFromParsedPiece(parsed: unknown): void {
  if (!parsed || typeof parsed !== "object") return;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.title === "string") obj.title = stripModelPreamble(obj.title);
  if (typeof obj.body_markdown === "string") obj.body_markdown = stripModelPreamble(obj.body_markdown);
}

export function validateResult(result: unknown, format: ContentFormatType): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null)
    throw new Error("Result must be an object");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || r.title.trim().length === 0)
    throw new Error("Missing title");
  if (typeof r.target_keyword !== "string")
    throw new Error("Missing target_keyword");
  const minLength = isSeoLongformFormat(format) ? 700 : 200;
  if (
    typeof r.body_markdown !== "string" ||
    r.body_markdown.trim().length < minLength
  )
    throw new Error("body_markdown too short");
}

function estimateUsageFromText(prompt: string, output: string) {
  const promptTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(output.length / 4);
  return { promptTokens, outputTokens, totalTokens: promptTokens + outputTokens };
}

function processGeneratedResult(
  parsed: ContentPieceResult,
  format: ContentFormatType,
  humanized = false,
): ContentPieceResult {
  if (!isSeoLongformFormat(format)) return parsed;
  const finalized = finalizeSeoContentPiece(parsed);
  const signals = seoQualitySignals(finalized.body_markdown);
  if (signals.words < 700) {
    throw new Error("Generated SEO article too short");
  }
  if (humanized || parsed.pieceMetadata?.humanizationAudit) {
    finalized.pieceMetadata = {
      ...finalized.pieceMetadata,
      humanized: humanized || parsed.pieceMetadata?.humanized,
      humanizationAudit: parsed.pieceMetadata?.humanizationAudit,
    };
  }
  return finalized;
}

export async function postProcessGeneratedResult(
  parsed: ContentPieceResult,
  format: ContentFormatType,
  brand: BrandContext,
  ai: AiProviderClient,
): Promise<ContentPieceResult> {
  const MAX_HUMANIZE_PASSES = 2;
  let humanizePasses = 0;
  let result: ContentPieceResult = parsed;

  if (isHumanizableFormat(format)) {
    const sample = resolveWritingSample(brand);
    const level = resolveHumanizationLevel(brand);

    if (!sample) {
      // Wave 5.A.1: skip AI humanize without a voice sample (saves credits; warn in metadata).
      result = {
        ...parsed,
        pieceMetadata: {
          ...parsed.pieceMetadata,
          humanizeSkippedReason: "no brand voice sample",
        },
      };
    } else if (level !== "off") {
      // Prefer light for durable autopilot quality; honor strong when configured.
      const passLevel = level === "strong" ? "strong" : "light";
      const { result: humanizedResult, humanized } = await humanizeContentPiece(parsed, brand, {
        aiClient: ai,
        level: passLevel,
        formatType: format,
      });
      humanizePasses += 1;
      result = {
        ...humanizedResult,
        pieceMetadata: {
          ...humanizedResult.pieceMetadata,
          humanized: humanized || humanizedResult.pieceMetadata?.humanized,
          humanizeSkippedReason: undefined,
        },
      };
    }

    if (isSeoLongformFormat(format)) {
      result = processGeneratedResult(
        result,
        format,
        Boolean(result.pieceMetadata?.humanized),
      );
    }
  } else if (isSeoLongformFormat(format)) {
    result = processGeneratedResult(parsed, format, false);
  }

  if (isSeoLongformFormat(format)) {
    const beforeDeeplBody = result.body_markdown;
    result = await maybeRefineWithDeepl(result, brand, format);
    const primaryLanguage = brand.contentStyle?.primaryLanguage ?? "en";
    const deeplChangedBody = result.body_markdown !== beforeDeeplBody;
    const sample = resolveWritingSample(brand);
    const needsPostDeeplHumanize =
      Boolean(sample) &&
      humanizePasses < MAX_HUMANIZE_PASSES &&
      (deeplChangedBody || primaryLanguage !== "en");

    if (needsPostDeeplHumanize) {
      const { result: humanizedResult, humanized } = await humanizeContentPiece(result, brand, {
        aiClient: ai,
        level: "light",
        formatType: format,
      });
      humanizePasses += 1;
      result = processGeneratedResult(humanizedResult, format, humanized);
    }
  }

  // Infographic first so enricher can rasterize visualSummary SVG→PNG (Node/sharp)
  // when stock featured is unavailable. Never leave SVG data URIs on featuredImageUrl.
  result = applyInfographicToContentPiece(result, format, brand.companyName);

  try {
    const stockCredentials = brand.projectId
      ? await loadStockCredentialContextForProject(brand.projectId)
      : undefined;
    const enriched = await enrichContentPieceImages(
      {
        title: result.title,
        target_keyword: result.target_keyword,
        body_markdown: result.body_markdown,
        formatType: format,
        pieceMetadata: result.pieceMetadata,
      },
      {
        imageSettings: parseImageSettings(brand.contentStyle),
        ai,
        brandName: brand.companyName,
        stockCredentials,
      },
    );
    result = {
      ...result,
      body_markdown: enriched.body_markdown,
      pieceMetadata: enriched.pieceMetadata,
    };
  } catch (err) {
    logger.warn({ err, format }, "Stock image enrichment skipped");
  }

  result = await applyVerticalGuardrailsToResult(result, format, brand, ai);

  return result;
}

/**
 * D1 guardrails: scans the draft for the vertical's forbidden claim patterns, retries
 * once with the offending claims named (cheap relative to a full redraft) when there's
 * a hit, and attaches whatever survives to pieceMetadata so a reviewer sees exactly
 * what to fix — the draft is never silently passed. Appends the vertical disclaimer
 * to SEO-longform articles for verticals that define one (law, dental).
 */
async function applyVerticalGuardrailsToResult(
  result: ContentPieceResult,
  format: ContentFormatType,
  brand: BrandContext,
  ai: AiProviderClient,
): Promise<ContentPieceResult> {
  if (!brand.vertical) return result;

  const preset = getVerticalPreset(brand.vertical);
  const guardrail = await applyForbiddenClaimsGuardrail(
    result.body_markdown,
    brand.vertical,
    (hits, previousBody) => regenerateBodyWithoutForbiddenClaims(ai, hits, previousBody),
  );

  let body = guardrail.body;
  if (isSeoLongformFormat(format) && preset.disclaimer) {
    body = appendVerticalDisclaimer(body, brand.vertical);
  }

  return {
    ...result,
    body_markdown: body,
    pieceMetadata: {
      ...result.pieceMetadata,
      forbiddenClaimHits: guardrail.hits.length > 0 ? guardrail.hits : undefined,
      verticalGuardrailRegenerated: guardrail.regenerated || undefined,
      requiresReview: preset.requiresReview,
      verticalDisclaimer:
        isSeoLongformFormat(format) && preset.disclaimer ? preset.disclaimer : undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal generation functions
// ---------------------------------------------------------------------------

async function generateWithClient(
  ai: AiProviderClient,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  generationContext: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  const prompt = await buildPrompt(
    format,
    brand,
    keyword,
    angleHint,
    generationContext.existingPieceTitles,
    generationContext,
  );
  const aiOptions = getAiGenerationOptions(format);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction: aiOptions.systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: aiOptions.maxOutputTokens,
        thinkingBudget: aiOptions.thinkingBudget,
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");

      const parsed = cleanAndParse(rawText);
      stripPreambleFromParsedPiece(parsed);
      validateResult(parsed, format);
      const processed = await postProcessGeneratedResult(parsed, format, brand, ai);
      return {
        ...processed,
        generationUsage: response.usage ?? estimateUsageFromText(prompt, rawText),
      };
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, attempt, format, keyword },
        "Content studio generation attempt failed",
      );
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}

async function generateWithClientStream(
  ai: AiProviderClient,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  onChunk: (text: string) => void,
  angleHint?: string,
  generationContext: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  const prompt = await buildPrompt(
    format,
    brand,
    keyword,
    angleHint,
    generationContext.existingPieceTitles,
    generationContext,
  );
  const aiOptions = getAiGenerationOptions(format);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let accumulated = "";
      // Only emit chunks on the first attempt: retries are silent so no
      // duplicate/garbled text is written to an already-open SSE connection.
      const emit = attempt === 1 ? onChunk : () => {};

      if (ai.generateStream) {
        const stream = ai.generateStream({
          prompt,
          systemInstruction: aiOptions.systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: aiOptions.maxOutputTokens,
          thinkingBudget: aiOptions.thinkingBudget,
        });
        for await (const text of stream) {
          accumulated += text;
          if (text) emit(text);
        }
      } else {
        const result = await ai.generate({
          prompt,
          systemInstruction: aiOptions.systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: aiOptions.maxOutputTokens,
          thinkingBudget: aiOptions.thinkingBudget,
        });
        accumulated = result.text;
        emit(result.text);
      }

      const parsed = cleanAndParse(accumulated);
      stripPreambleFromParsedPiece(parsed);
      validateResult(parsed, format);
      const processed = await postProcessGeneratedResult(parsed, format, brand, ai);
      return {
        ...processed,
        generationUsage: estimateUsageFromText(prompt, accumulated),
      };
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, attempt, format, keyword },
        "Content studio stream attempt failed",
      );
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateContentPieceStream(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  onChunk: (text: string) => void,
  angleHint?: string,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
  context: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  await assertAiGenerationEnabled();
  if (userApiKey && resolveProviderId(aiProviderOptions) === "gemini") {
    let chunksEmitted = 0;
    try {
      const userClient = wrapGeminiClient(
        await createUserGeminiClient(userApiKey),
      );
      return await generateWithClientStream(
        userClient,
        format,
        brand,
        keyword,
        (chunk) => {
          chunksEmitted++;
          onChunk(chunk);
        },
        angleHint,
        context,
      );
    } catch (err) {
      if (isUserKeyError(err) && chunksEmitted === 0) {
        logger.warn(
          { err },
          "User Gemini key failed for content stream before first chunk, falling back to platform key",
        );
      } else {
        throw err;
      }
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return generateWithClientStream(
    client,
    format,
    brand,
    keyword,
    onChunk,
    angleHint,
    context,
  );
}

export async function generateContentPiece(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  bypassCache = false,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
  context: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  await assertAiGenerationEnabled();
  const key = buildCacheKey(
    format,
    keyword,
    brand,
    angleHint,
    context.intendedPublishPlatform,
    context.competitorFocusUrl,
    context.competitorUrls,
  );
  if (!bypassCache) {
    const cached = await cacheGet(key);
    if (cached) {
      logger.info({ format, keyword }, "Content piece served from cache");
      if (!isSeoLongformFormat(format)) return cached;
      // Re-finalize then re-attach infographic so visualSummaryMarkdown is not dropped.
      return applyInfographicToContentPiece(
        processGeneratedResult(cached, format),
        format,
        brand.companyName,
      );
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  const result = await generateWithClient(
    client,
    format,
    brand,
    keyword,
    angleHint,
    context,
  );
  await cacheSet(key, result);
  return result;
}
