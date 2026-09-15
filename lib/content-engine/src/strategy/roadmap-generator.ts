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

const PHASE_TITLES = [
  "Foundation & Quick Wins",
  "Scaling & Automation",
  "Market Expansion",
] as const;

const PHASE_TIMEFRAMES = ["Months 1-3", "Months 4-6", "Months 7-12"] as const;

const BASE_SYSTEM_PROMPT = `You are a senior B2B growth strategist. You write one coherent 12-month GTM roadmap: later phases continue the same channels and bets from earlier phases — they do not restart the plan.

You MUST respond with a single valid JSON object and nothing else. No markdown, no code blocks, no explanation.`;

function buildSystemPrompt(projectContext?: string): string {
  if (!projectContext?.trim()) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}

${projectContext.trim()}`;
}

export function buildRoadmapPrompt(
  industry: string,
  location: string,
  stage: string,
  projectContext?: string,
): string {
  const contextNote = projectContext?.trim()
    ? "Use the company context from the system instruction. Name the company. Tie tactics to their keywords, site, and goals."
    : `Be specific to ${industry} in ${location} at the ${stage} stage — no generic startup filler.`;

  return `Write a 12-month B2B growth roadmap for a ${industry} company in ${location} at the ${stage} stage.

${contextNote}

Return ONLY this JSON:
{
  "executiveSummary": "<2-3 sentences: current position, the one primary growth bet for this stage, headline 12-month outcome. Max 400 characters. No line breaks. Escape quotes.>",
  "phases": [
    {
      "title": "${PHASE_TITLES[0]}",
      "timeframe": "${PHASE_TIMEFRAMES[0]}",
      "objectives": ["<3-4 foundation objectives>"],
      "tactics": ["<4-6 named channels, tools, or motions for ${location}>"],
      "kpis": ["<3-4 KPIs with ${stage}-stage target numbers>"]
    },
    {
      "title": "${PHASE_TITLES[1]}",
      "timeframe": "${PHASE_TIMEFRAMES[1]}",
      "objectives": ["<3-4 objectives that scale what phase 1 started — same bets, bigger>"],
      "tactics": ["<4-6 tactics that automate or double down on phase 1, not a new GTM>"],
      "kpis": ["<3-4 KPIs showing the phase 1 trajectory compounding>"]
    },
    {
      "title": "${PHASE_TITLES[2]}",
      "timeframe": "${PHASE_TIMEFRAMES[2]}",
      "objectives": ["<3-4 expansion objectives that assume phase 1-2 channels already work>"],
      "tactics": ["<4-6 adjacent-segment, moat, or category tactics for ${industry}>"],
      "kpis": ["<3-4 commercial / market-position KPIs>"]
    }
  ]
}

Phase 2 must explicitly continue phase 1. Phase 3 must assume phases 1-2 succeeded. Name real platforms and motions.`;
}

function isPhase(value: unknown): value is RoadmapPhase {
  if (typeof value !== "object" || value === null) return false;
  const phase = value as Record<string, unknown>;
  return (
    typeof phase.title === "string" &&
    phase.title.trim().length > 0 &&
    typeof phase.timeframe === "string" &&
    phase.timeframe.trim().length > 0 &&
    Array.isArray(phase.objectives) &&
    phase.objectives.length > 0 &&
    Array.isArray(phase.tactics) &&
    phase.tactics.length > 0 &&
    Array.isArray(phase.kpis) &&
    phase.kpis.length > 0
  );
}

export function parseRoadmapContent(rawText: string): RoadmapContent {
  const parsed = cleanAndParse<RoadmapContent>(rawText);
  if (typeof parsed.executiveSummary !== "string" || parsed.executiveSummary.trim().length === 0) {
    throw new Error("Roadmap missing executiveSummary");
  }
  if (!Array.isArray(parsed.phases) || parsed.phases.length !== 3) {
    throw new Error(
      `Roadmap must have exactly 3 phases, got ${Array.isArray(parsed.phases) ? parsed.phases.length : typeof parsed.phases}`,
    );
  }
  for (let i = 0; i < parsed.phases.length; i++) {
    const phase = parsed.phases[i];
    if (!isPhase(phase)) {
      throw new Error(`Phase ${i + 1} is incomplete`);
    }
    parsed.phases[i] = {
      title: PHASE_TITLES[i]!,
      timeframe: PHASE_TIMEFRAMES[i]!,
      objectives: phase.objectives,
      tactics: phase.tactics,
      kpis: phase.kpis,
    };
  }
  parsed.executiveSummary = parsed.executiveSummary.trim();
  return parsed;
}

type ProgressEvent = {
  type: "summary" | "phase";
  phaseIndex?: number;
  data: string | RoadmapPhase;
};

async function generateWithClient(
  ai: AiProviderClient,
  industry: string,
  location: string,
  stage: string,
  onPhaseReady?: (event: ProgressEvent) => void,
  projectContext?: string,
): Promise<RoadmapContent> {
  const prompt = buildRoadmapPrompt(industry, location, stage, projectContext);
  const systemInstruction = buildSystemPrompt(projectContext);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
        thinkingBudget: 0,
      });
      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");
      const content = parseRoadmapContent(rawText);
      onPhaseReady?.({ type: "summary", data: content.executiveSummary });
      content.phases.forEach((phase, phaseIndex) => {
        onPhaseReady?.({ type: "phase", phaseIndex, data: phase });
      });
      return content;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt }, "Roadmap generation attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
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
