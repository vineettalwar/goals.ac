import type { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";

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

function buildPrompt(industry: string, location: string, stage: string): string {
  const stageContext: Record<string, string> = {
    "pre-seed": "pre-revenue with a prototype or MVP, focused on problem validation and first customers",
    "seed": "early-stage with initial traction, focused on product-market fit and repeatable acquisition",
    "series-a": "post-PMF with a working revenue model, focused on scaling acquisition and building the team",
    "series-b": "scaling rapidly, focused on market expansion, operational efficiency, and international growth",
    "growth": "established player focused on market dominance, strategic moats, and category leadership",
  };

  const stageDesc = stageContext[stage] ?? stage;

  return `Generate a 12-month B2B growth roadmap for a ${industry} startup based in ${location} that is at the ${stage} stage (${stageDesc}).

Return ONLY this exact JSON structure with no additional text:

{
  "executiveSummary": "<2-3 sentences: the company's current position, the single biggest growth lever for this stage, and the headline outcome after 12 months. Be specific to ${industry} in ${location}.>",
  "phases": [
    {
      "title": "Foundation & Quick Wins",
      "timeframe": "Months 1-3",
      "objectives": ["<3-4 concrete objectives specific to ${industry} at ${stage} stage>"],
      "tactics": ["<4-6 specific, actionable tactics — name real tools, channels, and approaches relevant to ${location} market>"],
      "kpis": ["<3-4 measurable KPIs with target numbers appropriate for ${stage} stage>"]
    },
    {
      "title": "Scaling & Automation",
      "timeframe": "Months 4-6",
      "objectives": ["<3-4 concrete objectives building on phase 1 outcomes>"],
      "tactics": ["<4-6 specific tactics for scaling what worked in phase 1>"],
      "kpis": ["<3-4 measurable KPIs showing growth trajectory>"]
    },
    {
      "title": "Market Domination & Expansion",
      "timeframe": "Months 7-12",
      "objectives": ["<3-4 concrete objectives for ${location} market leadership or adjacent market entry>"],
      "tactics": ["<4-6 specific tactics for moat-building and category leadership in ${industry}>"],
      "kpis": ["<3-4 measurable KPIs demonstrating market position and commercial outcomes>"]
    }
  ]
}

Make every tactic specific and actionable — reference real platforms, partnership structures, pricing models, hiring profiles, or distribution channels where applicable. The output must be immediately useful for a ${stage}-stage ${industry} founder in ${location}.`;
}

let aiClient: GoogleGenAI | null = null;

async function getAiClient(): Promise<GoogleGenAI | null> {
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  if (!aiClient) {
    const { GoogleGenAI: GenAI } = await import("@google/genai");
    aiClient = new GenAI({
      apiKey,
      httpOptions: {
        apiVersion: "",
        baseUrl,
      },
    });
  }

  return aiClient;
}

export async function generateRoadmapContent(
  industry: string,
  location: string,
  stage: string,
): Promise<RoadmapContent> {
  const ai = await getAiClient();

  if (!ai) {
    throw new Error(
      "AI generation is not configured. Ensure AI_INTEGRATIONS_GEMINI_BASE_URL and AI_INTEGRATIONS_GEMINI_API_KEY are set.",
    );
  }

  const prompt = buildPrompt(industry, location, stage);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Empty response from Gemini");
      }

      const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned) as RoadmapContent;

      if (!parsed.executiveSummary || !Array.isArray(parsed.phases) || parsed.phases.length === 0) {
        throw new Error("Invalid roadmap structure from Gemini");
      }

      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, industry, location, stage }, "Gemini generation attempt failed");

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

export function generateSlug(industry: string, location: string, stage: string): string {
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

  const base = `${slugify(industry)}-${slugify(location)}`;
  return stage === "seed" ? base : `${base}-${slugify(stage)}`;
}
