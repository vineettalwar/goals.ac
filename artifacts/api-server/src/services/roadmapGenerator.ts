import { generateRoadmapSlug } from "@workspace/db";
import { logger } from "../lib/logger";
import { getPlatformGeminiClient, createUserGeminiClient, isUserKeyError } from "@workspace/ai-providers";
import type { GoogleGenAI } from "@google/genai";

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

const SYSTEM_PROMPT = `You are a senior B2B growth strategist with deep expertise in scaling technology startups. You produce precise, actionable 12-month growth roadmaps for startup founders and executives.

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

function buildSummaryPrompt(industry: string, location: string, stage: string): string {
  return `Generate an executive summary for a 12-month B2B growth roadmap for a ${industry} startup based in ${location} at the ${stage} stage.

Return ONLY this exact JSON with no additional text:
{
  "executiveSummary": "<2-3 sentences: the company's current position, the single biggest growth lever for this stage, and the headline outcome after 12 months. Be specific to ${industry} in ${location}.>"
}`;
}

function buildPhasePrompt(industry: string, location: string, stage: string, phaseIndex: number): string {
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

  return `Generate phase ${phaseIndex + 1} of a 12-month B2B growth roadmap (months ${guidance}) for a ${industry} startup based in ${location} at the ${stage} stage.

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

async function generateSummaryWithRetry(
  ai: GoogleGenAI,
  industry: string,
  location: string,
  stage: string,
): Promise<string> {
  const prompt = buildSummaryPrompt(industry, location, stage);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 512,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const rawText = response.text;
      if (!rawText) throw new Error("Empty response from Gemini");
      const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned) as { executiveSummary: string };
      if (typeof parsed.executiveSummary !== "string" || parsed.executiveSummary.trim().length === 0) {
        throw new Error("Invalid executive summary");
      }
      return parsed.executiveSummary;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt }, "Executive summary generation attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function generatePhaseWithRetry(
  ai: GoogleGenAI,
  industry: string,
  location: string,
  stage: string,
  phaseIndex: number,
): Promise<RoadmapPhase> {
  const prompt = buildPhasePrompt(industry, location, stage, phaseIndex);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const rawText = response.text;
      if (!rawText) throw new Error("Empty response from Gemini");
      const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned) as RoadmapPhase;
      if (!parsed.title || !Array.isArray(parsed.objectives) || !Array.isArray(parsed.tactics) || !Array.isArray(parsed.kpis)) {
        throw new Error("Invalid phase structure");
      }
      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, phaseIndex }, "Roadmap phase generation attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function generateWithClient(
  ai: GoogleGenAI,
  industry: string,
  location: string,
  stage: string,
  onPhaseReady?: (event: { type: "summary" | "phase"; phaseIndex?: number; data: string | RoadmapPhase }) => void,
): Promise<RoadmapContent> {
  const [executiveSummary, phase0, phase1, phase2] = await Promise.all([
    generateSummaryWithRetry(ai, industry, location, stage).then((s) => {
      onPhaseReady?.({ type: "summary", data: s });
      return s;
    }),
    generatePhaseWithRetry(ai, industry, location, stage, 0).then((p) => {
      onPhaseReady?.({ type: "phase", phaseIndex: 0, data: p });
      return p;
    }),
    generatePhaseWithRetry(ai, industry, location, stage, 1).then((p) => {
      onPhaseReady?.({ type: "phase", phaseIndex: 1, data: p });
      return p;
    }),
    generatePhaseWithRetry(ai, industry, location, stage, 2).then((p) => {
      onPhaseReady?.({ type: "phase", phaseIndex: 2, data: p });
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

type PhaseProgressCallback = (event: { type: "summary" | "phase"; phaseIndex?: number; data: string | RoadmapPhase }) => void;

export async function generateRoadmapContent(
  industry: string,
  location: string,
  stage: string,
  userApiKey?: string | null,
  onPhaseReady?: PhaseProgressCallback,
): Promise<RoadmapContent> {
  if (userApiKey) {
    try {
      const userClient = await createUserGeminiClient(userApiKey);
      return await generateWithClient(userClient, industry, location, stage, onPhaseReady);
    } catch (err) {
      if (isUserKeyError(err)) {
        logger.warn({ err }, "User Gemini key failed for roadmap generation, falling back to platform key");
      } else {
        throw err;
      }
    }
  }

  const platformClient = await getPlatformGeminiClient();
  if (!platformClient) {
    throw new Error(
      "AI generation is not configured. Set GEMINI_API_KEY or provision the Replit AI Integrations.",
    );
  }

  return generateWithClient(platformClient, industry, location, stage, onPhaseReady);
}

export { generateRoadmapSlug as generateSlug } from "@workspace/db";
