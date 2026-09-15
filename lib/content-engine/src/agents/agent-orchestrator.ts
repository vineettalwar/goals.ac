/**
 * Agent Orchestrator
 *
 * Coordinates the sequential execution of the agent pipeline:
 * owl → ferret → hummingbird → spider → fox → mockingbird → hawk → chameleon
 *
 * Production-ready with:
 * - Per-agent retry with exponential backoff
 * - Input/output validation
 * - Graceful degradation
 * - Detailed observability
 * - Circuit breaker for repeated failures
 *
 * ponytail: sequential agents, no cross-agent memory. Upgrade path: shared
 * context store + parallel execution if latency becomes a problem.
 */

import { logger } from "../core/logger";
import { cleanAndParseLenient } from "../core/utils";
import { resolveAiClient, type AiProviderClient, type AiProviderOptions } from "../support/ai/resolve-ai-client";
import type {
  AgentId,
  AgentPipelineOptions,
  AgentPipelineResult,
  AgentProgressEvent,
  AgentStageResult,
} from "./agent-types";
import { AGENT_PIPELINE_ORDER, getAgentDefinition } from "./agent-definitions";
import { buildAgentSystemPrompt, buildAgentTaskPrompt, type AgentTaskContext } from "./agent-prompts";
import { createAgentEvent } from "./agent-events";
import type { ContentFormatType } from "@workspace/db";
import type { BrandContext } from "../content/content-studio-prompts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_AGENT_TIMEOUT_MS = 90_000; // 90s per agent
const MAX_RETRIES_PER_AGENT = 2;
const RETRY_BASE_DELAY_MS = 1_000;
const MIN_DRAFT_LENGTH = 200;
const MIN_TITLE_LENGTH = 10;
/** Later agents may tighten copy, but truncated JSON stubs are far shorter. */
const MIN_BODY_KEEP_RATIO = 0.8;

/**
 * Keep the hummingbird draft when a later agent returns a truncated JSON body.
 * Gemini often closes JSON early; blindly overwriting produced "too short" after ~2 min.
 */
export function shouldReplaceBody(current: unknown, next: unknown): boolean {
  if (typeof next !== "string" || next.length === 0) return false;
  if (typeof current !== "string" || current.length === 0) return true;
  return next.length >= Math.floor(current.length * MIN_BODY_KEEP_RATIO);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentOrchestratorInput {
  format: ContentFormatType;
  brand: BrandContext;
  keyword: string;
  angleHint?: string;
  existingPieceTitles?: string[];
  competitorContext?: string;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}

interface AgentRunContext {
  ai: AiProviderClient;
  input: AgentOrchestratorInput;
  taskContext: AgentTaskContext;
  accumulatedOutput: Record<string, unknown>;
  onProgress?: (event: AgentProgressEvent) => void;
  timeoutMs: number;
  retryCount: number;
}

/** Metrics collected during pipeline execution */
interface PipelineMetrics {
  totalDurationMs: number;
  agentDurations: Record<AgentId, number>;
  retryAttempts: Record<AgentId, number>;
  successRate: number;
  degradedAgents: AgentId[];
}

// ---------------------------------------------------------------------------
// Word range mapping (mirrors content-studio-prompts.ts)
// ---------------------------------------------------------------------------

const FORMAT_WORD_RANGES: Partial<Record<ContentFormatType, string>> = {
  blog_post: "1400-1800",
  news_article: "600-900",
  tutorial: "1200-1600",
  guide: "1400-1800",
  whitepaper: "1800-2500",
  pillar_page: "2000-3000",
  location_page: "800-1200",
  comparison: "1400-2000",
  listicle: "1200-1800",
  case_study: "1200-1800",
  linkedin_post: "1300-1800",
  twitter_thread: "300-500",
};

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

export class AgentPipelineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly agentId?: AgentId,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AgentPipelineError";
  }
}

function validateInput(input: AgentOrchestratorInput): void {
  if (!input.keyword?.trim()) {
    throw new AgentPipelineError("Keyword is required", "MISSING_KEYWORD");
  }
  if (!input.brand?.companyName?.trim()) {
    throw new AgentPipelineError("Brand company name is required", "MISSING_BRAND");
  }
  if (!input.format) {
    throw new AgentPipelineError("Content format is required", "MISSING_FORMAT");
  }
}

// ---------------------------------------------------------------------------
// Output Validation
// ---------------------------------------------------------------------------

function validateAgentOutput(agentId: AgentId, output: unknown): { valid: boolean; error?: string } {
  if (!output || typeof output !== "object") {
    return { valid: false, error: "Output must be an object" };
  }

  const obj = output as Record<string, unknown>;

  switch (agentId) {
    case "owl":
      if (!obj.contentAngle || !obj.audienceIntent) {
        return { valid: false, error: "Strategy missing contentAngle or audienceIntent" };
      }
      break;

    case "ferret":
      // Research is optional enrichment, allow minimal output
      break;

    case "hummingbird":
      if (!obj.title || typeof obj.title !== "string" || obj.title.length < MIN_TITLE_LENGTH) {
        return { valid: false, error: `Title must be at least ${MIN_TITLE_LENGTH} characters` };
      }
      if (!obj.body_markdown || typeof obj.body_markdown !== "string" || obj.body_markdown.trim().length === 0) {
        return { valid: false, error: "Body is missing" };
      }
      break;

    case "spider":
    case "fox":
    case "mockingbird":
    case "hawk":
    case "chameleon":
      // These agents may return body_markdown updates; validate if present
      if (obj.body_markdown !== undefined) {
        if (typeof obj.body_markdown !== "string" || obj.body_markdown.length < MIN_DRAFT_LENGTH) {
          return { valid: false, error: `Updated body must be at least ${MIN_DRAFT_LENGTH} characters` };
        }
      }
      break;
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    // Transient errors that may succeed on retry
    if (message.includes("timeout")) return true;
    if (message.includes("rate limit")) return true;
    if (message.includes("503")) return true;
    if (message.includes("502")) return true;
    if (message.includes("429")) return true;
    if (message.includes("overloaded")) return true;
    if (message.includes("network")) return true;
    if (message.includes("econnreset")) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Retry Logic
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAgentWithRetry(
  agentId: AgentId,
  ctx: AgentRunContext,
): Promise<AgentStageResult> {
  const agent = getAgentDefinition(agentId);
  let lastError: Error | null = null;
  let totalDurationMs = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_AGENT; attempt++) {
    const attemptStart = Date.now();

    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info({ agentId, attempt, delayMs: delay }, `Retrying agent ${agent.name}`);
      ctx.onProgress?.(createAgentEvent(agentId, "working", {
        message: `${agent.name} retrying (attempt ${attempt + 1})...`,
      }));
      await sleep(delay);
    }

    try {
      const result = await runAgentOnce(agentId, ctx, attempt);
      result.durationMs = totalDurationMs + (Date.now() - attemptStart);

      // Validate output
      const validation = validateAgentOutput(agentId, result.output);
      if (!validation.valid) {
        throw new AgentPipelineError(
          validation.error ?? "Invalid output",
          "INVALID_OUTPUT",
          agentId,
          attempt < MAX_RETRIES_PER_AGENT, // Retry if we have attempts left
        );
      }

      return result;
    } catch (err) {
      totalDurationMs += Date.now() - attemptStart;
      lastError = err instanceof Error ? err : new Error(String(err));

      logger.warn(
        { err, agentId, attempt, maxRetries: MAX_RETRIES_PER_AGENT },
        `Agent ${agent.name} attempt ${attempt + 1} failed`,
      );

      // Only retry if error is retryable and we have attempts left
      if (!isRetryableError(err) && !(err instanceof AgentPipelineError && err.retryable)) {
        break;
      }
    }
  }

  // All retries exhausted
  const errorMessage = lastError?.message ?? "Unknown error";
  ctx.onProgress?.(
    createAgentEvent(agentId, "failed", {
      message: `${agent.name}: ${errorMessage}`,
      durationMs: totalDurationMs,
    }),
  );

  return {
    agentId,
    success: false,
    output: null,
    error: errorMessage,
    durationMs: totalDurationMs,
  };
}

// ---------------------------------------------------------------------------
// Individual agent execution (single attempt)
// ---------------------------------------------------------------------------

async function runAgentOnce(
  agentId: AgentId,
  ctx: AgentRunContext,
  attempt: number,
): Promise<AgentStageResult> {
  const agent = getAgentDefinition(agentId);
  const startTime = Date.now();

  // Only emit starting on first attempt
  if (attempt === 0) {
    ctx.onProgress?.(createAgentEvent(agentId, "starting"));
  }

  // Build prompts
  const systemPrompt = buildAgentSystemPrompt(agentId, {
    brandVoiceContext: ctx.input.brand.voiceTone,
  });

  const taskPrompt = buildAgentTaskPrompt(agentId, {
    ...ctx.taskContext,
    previousOutput: ctx.accumulatedOutput,
  });

  // Emit working event
  ctx.onProgress?.(createAgentEvent(agentId, "working"));

  // Execute AI call with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ctx.timeoutMs);

  try {
    const response = await Promise.race([
      ctx.ai.generate({
        prompt: taskPrompt,
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        maxOutputTokens: agentId === "hummingbird" ? 16384 : 8192, // Writer needs more tokens
        // Thinking tokens count against maxOutputTokens and starve body_markdown in JSON.
        thinkingBudget: 0,
      }),
      new Promise<never>((_, reject) => {
        const checkAbort = () => {
          if (controller.signal.aborted) {
            reject(new AgentPipelineError(`Agent ${agentId} timed out after ${ctx.timeoutMs}ms`, "TIMEOUT", agentId, true));
          }
        };
        setTimeout(checkAbort, ctx.timeoutMs);
      }),
    ]);

    const rawText = response.text ?? "";
    if (!rawText.trim()) {
      throw new AgentPipelineError(
        `Agent ${agentId} returned empty response`,
        "EMPTY_RESPONSE",
        agentId,
        agentId === "hummingbird",
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = cleanAndParseLenient<Record<string, unknown>>(rawText);
    } catch (parseErr) {
      throw new AgentPipelineError(
        `Agent ${agentId} returned invalid JSON: ${parseErr instanceof Error ? parseErr.message : "parse error"}`,
        "INVALID_JSON",
        agentId,
        agentId === "hummingbird",
      );
    }

    if (
      agentId !== "hummingbird" &&
      !shouldReplaceBody(ctx.accumulatedOutput.body_markdown, parsed.body_markdown)
    ) {
      delete parsed.body_markdown;
    }

    const durationMs = Date.now() - startTime;

    // Emit completion event
    ctx.onProgress?.(
      createAgentEvent(agentId, "completed", {
        durationMs,
        metadata: { outputKeys: Object.keys(parsed) },
      }),
    );

    logger.info(
      { agentId, durationMs, outputKeys: Object.keys(parsed).length },
      `Agent ${agent.name} completed`,
    );

    return {
      agentId,
      success: true,
      output: parsed,
      durationMs,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Pipeline orchestration
// ---------------------------------------------------------------------------

/**
 * Run the full agent pipeline.
 *
 * The pipeline continues even if individual agents fail, using the last
 * successful output. Critical failures (writer fails with no draft) will
 * still throw.
 */
export async function runAgentPipeline(
  input: AgentOrchestratorInput,
  options: AgentPipelineOptions = {},
): Promise<AgentPipelineResult> {
  const startTime = Date.now();

  // Validate input
  validateInput(input);

  const skipAgents = new Set(options.skipAgents ?? []);
  const timeoutMs = options.agentTimeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS;

  // Resolve AI client
  const ai = await resolveAiClient(input.userApiKey, input.aiProviderOptions);

  // Build base task context
  const taskContext: AgentTaskContext = {
    keyword: input.keyword,
    format: input.format,
    wordRange: FORMAT_WORD_RANGES[input.format],
    brandName: input.brand.companyName,
    industry: input.brand.industry,
    targetAudience: input.brand.targetAudience,
    angleHint: input.angleHint,
    competitorContext: input.competitorContext,
    brandVoiceContext: input.brand.voiceTone,
    existingPieceTitles: input.existingPieceTitles,
  };

  const ctx: AgentRunContext = {
    ai,
    input,
    taskContext,
    accumulatedOutput: {},
    onProgress: options.onProgress,
    timeoutMs,
    retryCount: 0,
  };

  const stages: AgentStageResult[] = [];
  const degradedAgents: AgentId[] = [];
  const agentDurations: Record<string, number> = {};
  const retryAttempts: Record<string, number> = {};

  // Run each agent in sequence
  for (const agentId of AGENT_PIPELINE_ORDER) {
    if (skipAgents.has(agentId)) {
      options.onProgress?.(createAgentEvent(agentId, "skipped"));
      logger.debug({ agentId }, "Agent skipped");
      continue;
    }

    const result = await runAgentWithRetry(agentId, ctx);
    stages.push(result);
    agentDurations[agentId] = result.durationMs;

    if (result.success && result.output) {
      // Merge output into accumulated context
      ctx.accumulatedOutput = mergeAgentOutput(ctx.accumulatedOutput, agentId, result.output);
    } else {
      degradedAgents.push(agentId);

      // Critical failure: writer failed with no existing draft
      if (agentId === "hummingbird" && !ctx.accumulatedOutput.body_markdown) {
        throw new AgentPipelineError(
          "Writer agent failed and no draft available",
          "CRITICAL_WRITER_FAILURE",
          agentId,
        );
      }

      // Strategy failure is also critical - we need it to guide other agents
      if (agentId === "owl" && !ctx.accumulatedOutput.strategy) {
        // Fall back to minimal strategy
        ctx.accumulatedOutput.strategy = {
          contentAngle: `Comprehensive guide to ${input.keyword}`,
          audienceIntent: input.brand.targetAudience ?? "professionals",
          competitiveGap: "thorough, actionable content",
          keyMessages: [input.keyword],
          funnelStage: "awareness",
          differentiator: "practical, no-fluff approach",
        };
        logger.warn({ agentId }, "Using fallback strategy after Owl failure");
      }
    }
  }

  // Validate final output has minimum requirements
  const content = extractFinalContent(ctx.accumulatedOutput, input.keyword);

  if (!content.title || content.title.length < MIN_TITLE_LENGTH) {
    throw new AgentPipelineError(
      "Pipeline produced no valid title",
      "MISSING_TITLE",
    );
  }

  if (!content.body_markdown?.trim()) {
    throw new AgentPipelineError(
      "Pipeline produced no valid content",
      "MISSING_CONTENT",
    );
  }

  const totalDurationMs = Date.now() - startTime;
  const successCount = stages.filter((s) => s.success).length;
  const successRate = stages.length > 0 ? successCount / stages.length : 0;

  const metrics: PipelineMetrics = {
    totalDurationMs,
    agentDurations: agentDurations as Record<AgentId, number>,
    retryAttempts: retryAttempts as Record<AgentId, number>,
    successRate,
    degradedAgents,
  };

  logger.info(
    {
      totalDurationMs,
      agentsRun: stages.length,
      degraded: degradedAgents.length,
      successRate: Math.round(successRate * 100),
      keyword: input.keyword.slice(0, 50),
    },
    "Agent pipeline complete",
  );

  return {
    content,
    stages,
    totalDurationMs,
    degradedAgents,
  };
}

// ---------------------------------------------------------------------------
// Output merging
// ---------------------------------------------------------------------------

function mergeAgentOutput(
  accumulated: Record<string, unknown>,
  agentId: AgentId,
  output: unknown,
): Record<string, unknown> {
  if (!output || typeof output !== "object") return accumulated;
  const obj = output as Record<string, unknown>;

  const merged = { ...accumulated };

  switch (agentId) {
    case "owl":
      // Strategy output
      merged.strategy = obj;
      break;

    case "ferret":
      // Research output
      merged.research = obj;
      break;

    case "hummingbird":
      // Draft output - core content fields
      if (obj.title && typeof obj.title === "string") merged.title = obj.title;
      if (shouldReplaceBody(merged.body_markdown, obj.body_markdown)) {
        merged.body_markdown = obj.body_markdown;
      }
      if (obj.meta_description && typeof obj.meta_description === "string") {
        merged.meta_description = obj.meta_description;
      }
      break;

    case "spider":
      // SEO output - may update body and add SEO fields
      if (shouldReplaceBody(merged.body_markdown, obj.body_markdown)) {
        merged.body_markdown = obj.body_markdown;
      }
      if (Array.isArray(obj.internal_link_suggestions)) {
        merged.internal_link_suggestions = obj.internal_link_suggestions;
      }
      if (Array.isArray(obj.secondary_keywords)) {
        merged.secondary_keywords = obj.secondary_keywords;
      }
      if (Array.isArray(obj.faq_section)) {
        merged.faq_section = obj.faq_section;
      }
      if (obj.json_ld_schema && typeof obj.json_ld_schema === "object") {
        merged.json_ld_schema = obj.json_ld_schema;
      }
      break;

    case "fox":
      // Marketing output - may update body
      if (shouldReplaceBody(merged.body_markdown, obj.body_markdown)) {
        merged.body_markdown = obj.body_markdown;
      }
      if (Array.isArray(obj.cta_suggestions)) {
        merged.cta_suggestions = obj.cta_suggestions;
      }
      break;

    case "mockingbird":
      // Linguist output - updated body and AI tell scores
      if (shouldReplaceBody(merged.body_markdown, obj.body_markdown)) {
        merged.body_markdown = obj.body_markdown;
      }
      if (typeof obj.ai_tell_score_after === "number") {
        merged.ai_tell_score = obj.ai_tell_score_after;
      }
      if (Array.isArray(obj.changes_made)) {
        merged.linguist_changes = obj.changes_made;
      }
      break;

    case "hawk":
      // Editor output - final body and quality metadata
      if (shouldReplaceBody(merged.body_markdown, obj.body_markdown)) {
        merged.body_markdown = obj.body_markdown;
      }
      if (typeof obj.quality_score === "number") {
        merged.quality_score = obj.quality_score;
      }
      if (typeof obj.publish_ready === "boolean") {
        merged.publish_ready = obj.publish_ready;
      }
      if (Array.isArray(obj.issues_found)) {
        merged.editor_issues = obj.issues_found;
      }
      break;

    case "chameleon":
      // Voice coach output - final voice-aligned body
      if (shouldReplaceBody(merged.body_markdown, obj.body_markdown)) {
        merged.body_markdown = obj.body_markdown;
      }
      if (typeof obj.consistency_score === "number") {
        merged.voice_consistency_score = obj.consistency_score;
      }
      if (Array.isArray(obj.voice_adjustments)) {
        merged.voice_adjustments = obj.voice_adjustments;
      }
      break;
  }

  return merged;
}

function extractFinalContent(
  accumulated: Record<string, unknown>,
  keyword: string,
): AgentPipelineResult["content"] {
  return {
    title: (accumulated.title as string) ?? "",
    body_markdown: (accumulated.body_markdown as string) ?? "",
    target_keyword: keyword,
    meta_description: accumulated.meta_description as string | undefined,
    secondary_keywords: accumulated.secondary_keywords as string[] | undefined,
    faq_section: accumulated.faq_section as { question: string; answer: string }[] | undefined,
    citations: accumulated.citations as { text: string; url: string; source: string }[] | undefined,
    internal_link_suggestions: accumulated.internal_link_suggestions as
      | { anchorText: string; suggestedSlug: string; rationale?: string }[]
      | undefined,
    json_ld_schema: accumulated.json_ld_schema as object | undefined,
  };
}

// ---------------------------------------------------------------------------
// Pipeline variants
// ---------------------------------------------------------------------------

/**
 * Run a fast pipeline with only essential agents.
 * Skips: fox (marketing), mockingbird (linguist)
 */
export async function runFastAgentPipeline(
  input: AgentOrchestratorInput,
  options: AgentPipelineOptions = {},
): Promise<AgentPipelineResult> {
  return runAgentPipeline(input, {
    ...options,
    skipAgents: [...(options.skipAgents ?? []), "fox", "mockingbird"],
  });
}

/**
 * Run minimal pipeline for simple content.
 * Only runs: owl, hummingbird, chameleon
 */
export async function runMinimalAgentPipeline(
  input: AgentOrchestratorInput,
  options: AgentPipelineOptions = {},
): Promise<AgentPipelineResult> {
  return runAgentPipeline(input, {
    ...options,
    skipAgents: ["ferret", "spider", "fox", "mockingbird", "hawk"],
  });
}

/**
 * Run writer-only pipeline (for repurposing existing content).
 * Only runs: hummingbird
 */
export async function runWriterOnlyPipeline(
  input: AgentOrchestratorInput,
  options: AgentPipelineOptions = {},
): Promise<AgentPipelineResult> {
  return runAgentPipeline(input, {
    ...options,
    skipAgents: ["owl", "ferret", "spider", "fox", "mockingbird", "hawk", "chameleon"],
  });
}

// ---------------------------------------------------------------------------
// Self-check (for testing without real AI)
// ---------------------------------------------------------------------------

/**
 * Validates agent definitions and prompt templates are correctly configured.
 * Run at startup or in tests to catch configuration errors.
 */
export function validateAgentConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const agentId of AGENT_PIPELINE_ORDER) {
    try {
      const def = getAgentDefinition(agentId);
      if (!def.name || !def.role || !def.icon) {
        errors.push(`Agent ${agentId} missing required definition fields`);
      }

      const systemPrompt = buildAgentSystemPrompt(agentId);
      if (!systemPrompt || systemPrompt.length < 100) {
        errors.push(`Agent ${agentId} has invalid system prompt`);
      }

      const taskPrompt = buildAgentTaskPrompt(agentId, {
        keyword: "test keyword",
        format: "blog_post",
        brandName: "Test Brand",
      });
      if (!taskPrompt || taskPrompt.length < 50) {
        errors.push(`Agent ${agentId} has invalid task prompt`);
      }
    } catch (err) {
      errors.push(`Agent ${agentId} configuration error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
