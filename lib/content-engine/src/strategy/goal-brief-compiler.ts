import { logger } from "../core/logger";
import { cleanAndParse } from "../core/utils";
import type { AiProviderOptions } from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { loadBrandVoiceGenerationContext } from "../support/brand/brand-voice-generation";
import type { Goal } from "@workspace/db/schema/goals";

export interface CompileBriefsResult {
  briefs: CompiledBriefDraft[];
  generationUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface CompiledBriefDraft {
  workingTitle: string;
  targetKeywordCluster: string;
  searchIntent: string;
  funnelStage: "tofu" | "mofu" | "bofu";
  angle: string;
  format: string;
  wordCount: number;
  successMetric: string;
}

const SYSTEM_PROMPT = `You are a B2B content strategist. Given a business goal, produce a JSON array of 3–5 content briefs that move the goal forward.

Respond with ONLY a valid JSON array. No markdown fences, no commentary.`;

function buildPrompt(goal: Goal, brandContext?: string): string {
  return `Business goal:
- Objective: ${goal.objective}
- Target metric: ${goal.targetMetric}
- Baseline: ${goal.baseline ?? "unknown"}
- ICP: ${goal.icp ?? "general B2B audience"}
${brandContext ? `\nBrand context:\n${brandContext}` : ""}

Return a JSON array of 3–5 brief objects:
[
  {
    "workingTitle": "<specific title>",
    "targetKeywordCluster": "<primary keyword cluster>",
    "searchIntent": "informational|commercial|transactional",
    "funnelStage": "tofu|mofu|bofu",
    "angle": "<1-2 sentence hook>",
    "format": "blog_post",
    "wordCount": 1200,
    "successMetric": "<how this brief supports the goal metric>"
  }
]

Requirements:
- Mix funnel stages aligned to the ${goal.objective} objective
- Titles must be specific — no generic placeholders
- Keywords should be realistic search terms
- Each brief must clearly tie to the target metric`;
}

function normalizeBriefs(items: CompiledBriefDraft[]): CompiledBriefDraft[] {
  return items.map((row) => ({
    ...row,
    funnelStage: row.funnelStage === "mofu" || row.funnelStage === "bofu" ? row.funnelStage : "tofu",
    format: row.format || "blog_post",
    wordCount: row.wordCount > 0 ? row.wordCount : 1200,
  }));
}

export async function compileBriefsFromGoal(
  goal: Goal,
  options?: {
    projectId?: number;
    userId?: number;
    userApiKey?: string | null;
    aiProviderOptions?: AiProviderOptions;
    ai?: AiProviderClient;
  },
): Promise<CompileBriefsResult> {
  let brandContext = "";
  if (options?.projectId) {
    const ctx = await loadBrandVoiceGenerationContext(
      options.projectId,
      goal.targetMetric,
      options.userId,
    ).catch(() => null);
    brandContext = ctx?.promptContext ?? "";
  }

  const ai = options?.ai ?? (await resolveAiClient(options?.userApiKey, options?.aiProviderOptions));
  const response = await ai.generate({
    prompt: buildPrompt(goal, brandContext || undefined),
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: "application/json",
    maxOutputTokens: 4096,
    thinkingBudget: 0,
  });

  try {
    const parsed = cleanAndParse<CompiledBriefDraft[]>(response.text ?? "");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Expected non-empty brief array");
    }
    return {
      briefs: normalizeBriefs(parsed),
      generationUsage: response.usage,
    };
  } catch (err) {
    logger.error({ err, goalId: goal.id }, "Failed to parse compiled briefs");
    throw new Error("Could not parse brief suggestions from AI response");
  }
}
