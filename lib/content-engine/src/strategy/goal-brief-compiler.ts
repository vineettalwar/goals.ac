import { logger } from "../core/logger";
import { cleanAndParse } from "../core/utils";
import type { AiProviderOptions } from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { loadBrandVoiceGenerationContext } from "../support/brand/brand-voice-generation";
import { loadPublishedPostsForProject } from "../support/brand/brand-scan-context";
import {
  checkCoverage,
  coverageReason,
  internalLinkTargets,
  type CoveredPost,
  type CoverageVerdict,
} from "./content-coverage";
import type { Goal } from "@workspace/db/schema/goals";
import type { FunnelStage } from "../content/personalization";

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
  funnelStage: FunnelStage;
  angle: string;
  format: string;
  wordCount: number;
  successMetric: string;
  /**
   * What the site already publishes on this topic. Present only when the
   * project has a connected CMS whose site graph could be read.
   */
  coverage?: {
    verdict: CoverageVerdict;
    /** Why this brief was flagged — surfaced to the user, not silently dropped. */
    reason: string | null;
    existingUrl?: string;
    existingTitle?: string;
  };
  /** Published posts worth linking to from this article, strongest first. */
  internalLinkTargets?: { url: string; title: string }[];
}

const SYSTEM_PROMPT = `You are a B2B content strategist. Given a business goal, produce a JSON array of 3–5 content briefs that move the goal forward.

Respond with ONLY a valid JSON array. No markdown fences, no commentary.`;

/** Cap on titles fed to the prompt — enough context without crowding the goal. */
const PROMPT_EXISTING_TITLE_LIMIT = 40;

function buildExistingCoverageBlock(posts: readonly CoveredPost[]): string {
  const titles = posts
    .map((post) => post.title?.trim())
    .filter((title): title is string => Boolean(title))
    .slice(0, PROMPT_EXISTING_TITLE_LIMIT);

  if (titles.length === 0) return "";

  return `\nAlready published on this site (do not propose a brief that competes with these — two pages targeting one query rank worse than one):\n${titles
    .map((title) => `- ${title}`)
    .join("\n")}`;
}

function buildPrompt(goal: Goal, brandContext?: string, existingCoverage?: string): string {
  return `Business goal:
- Objective: ${goal.objective}
- Target metric: ${goal.targetMetric}
- Baseline: ${goal.baseline ?? "unknown"}
- ICP: ${goal.icp ?? "general B2B audience"}
${brandContext ? `\nBrand context:\n${brandContext}` : ""}${existingCoverage ?? ""}

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

/**
 * Annotate briefs with what the site already covers.
 *
 * Flagged briefs are kept, not dropped — the model may have a genuinely
 * different angle, and that call belongs to the user. A flagged brief with a
 * "covered" verdict is the signal to refresh the existing post instead.
 */
export function annotateBriefsWithCoverage(
  briefs: CompiledBriefDraft[],
  posts: readonly CoveredPost[],
): CompiledBriefDraft[] {
  if (posts.length === 0) return briefs;

  return briefs.map((brief) => {
    const query = brief.targetKeywordCluster?.trim() || brief.workingTitle;
    const result = checkCoverage(query, posts);

    return {
      ...brief,
      coverage: {
        verdict: result.verdict,
        reason: coverageReason(result),
        existingUrl: result.match?.url,
        existingTitle: result.match?.title,
      },
      internalLinkTargets: internalLinkTargets(query, posts).map(({ url, title }) => ({
        url,
        title,
      })),
    };
  });
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
  let publishedPosts: CoveredPost[] = [];
  if (options?.projectId) {
    const [ctx, posts] = await Promise.all([
      loadBrandVoiceGenerationContext(
        options.projectId,
        goal.targetMetric,
        options.userId,
      ).catch(() => null),
      // A site-graph failure must not block brief compilation — the coverage
      // check is an improvement on the result, not a precondition for it.
      loadPublishedPostsForProject(options.projectId).catch((err) => {
        logger.warn({ err, projectId: options.projectId }, "Coverage check skipped: site graph unavailable");
        return [];
      }),
    ]);
    brandContext = ctx?.promptContext ?? "";
    publishedPosts = posts;
  }

  const ai = options?.ai ?? (await resolveAiClient(options?.userApiKey, options?.aiProviderOptions));
  const response = await ai.generate({
    prompt: buildPrompt(
      goal,
      brandContext || undefined,
      buildExistingCoverageBlock(publishedPosts) || undefined,
    ),
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
      briefs: annotateBriefsWithCoverage(normalizeBriefs(parsed), publishedPosts),
      generationUsage: response.usage,
    };
  } catch (err) {
    logger.error({ err, goalId: goal.id }, "Failed to parse compiled briefs");
    throw new Error("Could not parse brief suggestions from AI response");
  }
}
