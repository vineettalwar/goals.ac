import { logger } from "../core/logger";
import { type AiProviderOptions } from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { generateRoadmapSlug } from "@workspace/db";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { cleanAndParse } from "../core/utils";

export interface RoadmapPhase {
  title: string;
  timeframe: string;
  objectives: string[];
  tactics: string[];
  kpis: string[];
}

export interface RoadmapContent {
  executiveSummary: string;
  phases: RoadmapPhase[];
}

const BASE_SYSTEM_PROMPT = `You are a senior B2B growth strategist with deep expertise in scaling technology startups. You produce precise, actionable 12-month growth roadmaps for startup founders and executives.

Your roadmaps are grounded in proven go-to-market frameworks, unit economics thinking, and stage-appropriate tactics. Each roadmap must be specific to the industry, location, and growth stage provided — never generic.

You MUST respond with a single valid JSON object and nothing else. No markdown, no code blocks, no explanation — only raw JSON.`;

const PHASE_TITLES = [
  "Foundation & Quick Wins",
  "Scaling & Automation",
  "Market Domination & Expansion",
];

const PHASE_TIMEFRAMES = ["Months 1-3", "Months 4-6", "Months 7-12"];

const PHASE_GUIDANCE = [
  "1-3: build the foundation — establish core acquisition channels, close first logos, instrument key metrics",
  "4-6: scale what works — double down on winning channels, automate workflows, grow the team",
  "7-12: market domination — expand to adjacent segments, build strategic moats, achieve category leadership",
];

function buildSystemPrompt(projectContext?: string): string {
  if (!projectContext?.trim()) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}

When company context is provided below, reference the company by name. Tactics must reflect their actual site, keywords, content gaps, and goals — never generic startup advice.

${projectContext.trim()}`;
}

function projectContextBlock(projectContext?: string): string {
  if (!projectContext?.trim()) return "";
  return `\n\n${projectContext.trim()}\n\nUse the company context above. Reference the company by name and tie tactics to their site, keywords, and goals.`;
}

function extractExecutiveSummaryFallback(raw: string): string | null {
  const match = raw.match(/"executiveSummary"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim() || null;
  }
}

function parseExecutiveSummary(rawText: string): string {
  try {
    const parsed = cleanAndParse<{ executiveSummary: string }>(rawText);
    if (typeof parsed.executiveSummary === "string" && parsed.executiveSummary.trim().length > 0) {
      return parsed.executiveSummary.trim();
    }
  } catch {
    const fallback = extractExecutiveSummaryFallback(rawText);
    if (fallback?.trim()) return fallback.trim();
  }
  throw new Error("Invalid executive summary");
}

function parsePhase(rawText: string): RoadmapPhase {
  const parsed = cleanAndParse<RoadmapPhase>(rawText);
  if (
    !parsed.title ||
    !Array.isArray(parsed.objectives) ||
    !Array.isArray(parsed.tactics) ||
    !Array.isArray(parsed.kpis)
  ) {
    throw new Error("Invalid phase structure");
  }
  return parsed;
}

function buildSummaryPrompt(
  industry: string,
  location: string,
  stage: string,
  projectContext?: string,
): string {
  return `Generate an executive summary for a 12-month B2B growth roadmap for a ${industry} startup based in ${location} at the ${stage} stage.${projectContextBlock(projectContext)}

Return ONLY this exact JSON with no additional text:
{
  "executiveSummary": "<2-3 sentences: the company's current position, the single biggest growth lever for this stage, and the headline outcome after 12 months. Be specific to ${industry} in ${location}. Max 400 characters. No line breaks inside the string. Escape double quotes.>"
}`;
}

function buildPhasePrompt(
  industry: string,
  location: string,
  stage: string,
  phaseIndex: number,
  projectContext?: string,
): string {
  const title = PHASE_TITLES[phaseIndex]!;
  const timeframe = PHASE_TIMEFRAMES[phaseIndex]!;
  const guidance = PHASE_GUIDANCE[phaseIndex]!;

  const objectiveGuidance = phaseIndex === 0
    ? `specific to ${industry} at ${stage} stage — foundation and quick wins`
    : phaseIndex === 1
    ? `building on phase 1 outcomes — scaling and automation`
    : `${location} market leadership or adjacent market entry`;

  const tacticGuidance = phaseIndex === 0
    ? `for establishing presence — name real tools, channels, and approaches relevant to ${location} market`
    : phaseIndex === 1
    ? `for scaling what worked in phase 1`
    : `for moat-building and category leadership in ${industry}`;

  const kpiGuidance = phaseIndex === 0
    ? `with target numbers appropriate for ${stage} stage`
    : phaseIndex === 1
    ? `showing growth trajectory`
    : `demonstrating market position and commercial outcomes`;

  return `Generate phase ${phaseIndex + 1} of a 12-month B2B growth roadmap (months ${guidance}) for a ${industry} startup based in ${location} at the ${stage} stage.${projectContextBlock(projectContext)}

Return ONLY this exact JSON with no additional text:
{
  "title": "${title}",
  "timeframe": "${timeframe}",
  "objectives": ["<3-4 concrete objectives ${objectiveGuidance}>"],
  "tactics": ["<4-6 specific, actionable tactics — ${tacticGuidance}>"],
  "kpis": ["<3-4 measurable KPIs ${kpiGuidance}>"]
}

Make every tactic specific and actionable — reference real platforms, partnership structures, pricing models, hiring profiles, or distribution channels where applicable. The output must be immediately useful for a ${stage}-stage ${industry} founder in ${location}.`;
}

function validateRoadmapContent(content: unknown): asserts content is RoadmapContent {
  if (typeof content !== "object" || content === null) {
    throw new Error("Roadmap content must be an object");
  }
  const c = content as Record<string, unknown>;
  if (typeof c.executiveSummary !== "string" || c.executiveSummary.trim().length === 0) {
    throw new Error("Roadmap missing executiveSummary");
  }
  if (!Array.isArray(c.phases) || c.phases.length !== 3) {
    throw new Error(`Roadmap must have exactly 3 phases, got ${Array.isArray(c.phases) ? c.phases.length : typeof c.phases}`);
  }
  for (let i = 0; i < c.phases.length; i++) {
    const phase = c.phases[i] as Record<string, unknown>;
    if (typeof phase.title !== "string" || phase.title.trim().length === 0) {
      throw new Error(`Phase ${i + 1} missing title`);
    }
    if (typeof phase.timeframe !== "string" || phase.timeframe.trim().length === 0) {
      throw new Error(`Phase ${i + 1} missing timeframe`);
    }
    if (!Array.isArray(phase.objectives) || phase.objectives.length === 0) {
      throw new Error(`Phase ${i + 1} missing objectives`);
    }
    if (!Array.isArray(phase.tactics) || phase.tactics.length === 0) {
      throw new Error(`Phase ${i + 1} missing tactics`);
    }
    if (!Array.isArray(phase.kpis) || phase.kpis.length === 0) {
      throw new Error(`Phase ${i + 1} missing kpis`);
    }
  }
}

type ProgressEvent = {
  type: "summary" | "phase";
  phaseIndex?: number;
  data: string | RoadmapPhase;
};

function createOrderedProgressEmitter(onPhaseReady?: (event: ProgressEvent) => void) {
  const order: ProgressEvent[] = [];
  let nextIndex = 0;
  const expected: ("summary" | number)[] = ["summary", 0, 1, 2];

  return (event: ProgressEvent) => {
    order.push(event);
    while (nextIndex < expected.length) {
      const expectedKey = expected[nextIndex]!;
      const match = order.find((item) =>
        expectedKey === "summary"
          ? item.type === "summary"
          : item.type === "phase" && item.phaseIndex === expectedKey,
      );
      if (!match) break;
      onPhaseReady?.(match);
      nextIndex++;
    }
  };
}

async function generateSummaryWithRetry(
  ai: AiProviderClient,
  industry: string,
  location: string,
  stage: string,
  projectContext?: string,
): Promise<string> {
  const prompt = buildSummaryPrompt(industry, location, stage, projectContext);
  const systemInstruction = buildSystemPrompt(projectContext);
  let lastError: unknown;
  let lastRawText = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 1024,
        thinkingBudget: 0,
      });
      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");
      lastRawText = rawText;
      return parseExecutiveSummary(rawText);
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt }, "Executive summary generation attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  logger.warn(
    { rawPreview: lastRawText.slice(0, 500) },
    "Executive summary generation failed after retries",
  );
  throw lastError;
}

async function generatePhaseWithRetry(
  ai: AiProviderClient,
  industry: string,
  location: string,
  stage: string,
  phaseIndex: number,
  projectContext?: string,
): Promise<RoadmapPhase> {
  const prompt = buildPhasePrompt(industry, location, stage, phaseIndex, projectContext);
  const systemInstruction = buildSystemPrompt(projectContext);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        thinkingBudget: 0,
      });
      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");
      return parsePhase(rawText);
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, phaseIndex }, "Roadmap phase generation attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function generateWithClient(
  ai: AiProviderClient,
  industry: string,
  location: string,
  stage: string,
  onPhaseReady?: (event: ProgressEvent) => void,
  projectContext?: string,
): Promise<RoadmapContent> {
  const emitOrdered = createOrderedProgressEmitter(onPhaseReady);

  const [executiveSummary, phase0, phase1, phase2] = await Promise.all([
    generateSummaryWithRetry(ai, industry, location, stage, projectContext).then((s) => {
      emitOrdered({ type: "summary", data: s });
      return s;
    }),
    generatePhaseWithRetry(ai, industry, location, stage, 0, projectContext).then((p) => {
      emitOrdered({ type: "phase", phaseIndex: 0, data: p });
      return p;
    }),
    generatePhaseWithRetry(ai, industry, location, stage, 1, projectContext).then((p) => {
      emitOrdered({ type: "phase", phaseIndex: 1, data: p });
      return p;
    }),
    generatePhaseWithRetry(ai, industry, location, stage, 2, projectContext).then((p) => {
      emitOrdered({ type: "phase", phaseIndex: 2, data: p });
      return p;
    }),
  ]);

  const content: RoadmapContent = {
    executiveSummary,
    phases: [phase0, phase1, phase2],
  };

  validateRoadmapContent(content);
  return content;
}

type PhaseProgressCallback = (event: ProgressEvent) => void;

export interface GenerateRoadmapOptions {
  userApiKey?: string | null;
  onPhaseReady?: PhaseProgressCallback;
  aiProviderOptions?: AiProviderOptions;
  projectContext?: string;
}

export async function generateRoadmapContent(
  industry: string,
  location: string,
  stage: string,
  userApiKey?: string | null,
  onPhaseReady?: PhaseProgressCallback,
  aiProviderOptions?: AiProviderOptions,
  projectContext?: string,
): Promise<RoadmapContent> {
  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return generateWithClient(
    client,
    industry,
    location,
    stage,
    onPhaseReady,
    projectContext,
  );
}

/** @deprecated Use generateRoadmapContent — alias for marketing-persona-app compatibility */
export async function generateRoadmap(
  industry: string,
  location: string,
  stage: string,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<RoadmapContent> {
  return generateRoadmapContent(industry, location, stage, userApiKey, undefined, aiProviderOptions);
}

/** Streaming alias — emits SSE-style events via onEvent callback */
export async function generateRoadmapStream(
  industry: string,
  location: string,
  stage: string,
  onEvent: (event: string, data: unknown) => void,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
  projectContext?: string,
): Promise<RoadmapContent> {
  return generateRoadmapContent(
    industry,
    location,
    stage,
    userApiKey,
    (event) => {
      if (event.type === "summary") onEvent("summary", { executiveSummary: event.data });
      if (event.type === "phase") onEvent("phase", { phaseIndex: event.phaseIndex, phase: event.data });
    },
    aiProviderOptions,
    projectContext,
  );
}

export function generateProjectRoadmapSlug(
  industry: string,
  location: string,
  stage: string,
  projectId: number,
): string {
  const base = generateRoadmapSlug(industry, location, stage);
  return `${base}-project-${projectId}`;
}

export { generateRoadmapSlug as generateSlug } from "@workspace/db";
