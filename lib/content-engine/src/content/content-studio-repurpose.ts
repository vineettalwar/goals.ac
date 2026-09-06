import { logger } from "../core/logger";
import type { AiProviderOptions } from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import type { ContentFormatType } from "@workspace/db";
import { AI_WRITING_RULES_PROMPT } from "./ai-writing-rules";
import { cleanAndParse } from "../core/utils";
import {
  type BrandContext,
  type ContentPieceResult,
  type ContentGenerationContext,
  buildRepurposePrompt,
} from "./content-studio-prompts";
import {
  stripPreambleFromParsedPiece,
  validateResult,
  postProcessGeneratedResult,
} from "./content-studio-generate";

export const REPURPOSE_SYSTEM_PROMPT = `You are a world-class content strategist and copywriter. You take existing content and expertly repurpose it into a different format while preserving the core insights and brand voice.

${AI_WRITING_RULES_PROMPT}

You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation; only raw JSON.`;

export async function repurposeContentPiece(
  targetFormat: ContentFormatType,
  brand: BrandContext,
  existingContent: string,
  existingKeyword: string,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
  context: Pick<ContentGenerationContext, "competitorPromptBlock"> = {},
): Promise<ContentPieceResult> {
  const prompt = await buildRepurposePrompt(
    targetFormat,
    brand,
    existingContent,
    existingKeyword,
    context.competitorPromptBlock,
  );

  async function attemptGeneration(ai: AiProviderClient): Promise<ContentPieceResult> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.generate({
          prompt,
          systemInstruction: REPURPOSE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingBudget: 0,
        });
        const rawText = response.text;
        if (!rawText) throw new Error("Empty AI response");
        const parsed = cleanAndParse(rawText);
        stripPreambleFromParsedPiece(parsed);
        validateResult(parsed, targetFormat);
        return postProcessGeneratedResult(parsed, targetFormat, brand, ai);
      } catch (err) {
        lastError = err;
        logger.warn({ err, attempt, targetFormat }, "Repurpose generation attempt failed");
        if (attempt < 3)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw lastError;
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return attemptGeneration(client);
}
