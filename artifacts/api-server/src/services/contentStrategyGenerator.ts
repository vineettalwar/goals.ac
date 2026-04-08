import type { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";

export interface ContentItem {
  day: number;
  title: string;
  format: string;
  topic_angle: string;
  primary_keyword: string;
}

const SYSTEM_PROMPT = `You are a senior content strategist specializing in B2B SEO and thought-leadership marketing for technology startups. You produce precise, day-by-day 30-day content plans that drive organic growth.

You MUST respond with a single valid JSON array and nothing else. No markdown, no code blocks, no explanation — only raw JSON.`;

function buildPrompt(industry: string, location: string, stage: string): string {
  return `Generate a 30-day content strategy for a ${industry} startup based in ${location} at the ${stage} stage.

Return ONLY a JSON array of exactly 30 objects (one per day), each with this exact structure:
[
  {
    "day": 1,
    "title": "<compelling content title>",
    "format": "<LinkedIn post | Blog article | Twitter thread | Case study | Video script | Newsletter | Podcast outline>",
    "topic_angle": "<specific angle or hook for this piece — 1-2 sentences>",
    "primary_keyword": "<the main SEO or search keyword this targets>"
  }
]

Requirements:
- Mix formats across the 30 days (variety of LinkedIn posts, blog articles, Twitter threads, etc.)
- Content must be specific to ${industry} in ${location} at the ${stage} stage
- Progress logically: early days build awareness, later days drive conversion and authority
- Each title must be compelling and specific — no generic titles
- Keywords should be realistic terms potential customers search for
- Return ONLY the JSON array, no other text`;
}

let aiClient: GoogleGenAI | null = null;

async function getAiClient(): Promise<GoogleGenAI | null> {
  if (aiClient) return aiClient;

  const integrationBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const integrationApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const userApiKey = process.env.GEMINI_API_KEY;

  const { GoogleGenAI: GenAI } = await import("@google/genai");

  if (integrationBaseUrl && integrationApiKey) {
    aiClient = new GenAI({
      apiKey: integrationApiKey,
      httpOptions: { apiVersion: "", baseUrl: integrationBaseUrl },
    });
    return aiClient;
  }

  if (userApiKey) {
    aiClient = new GenAI({ apiKey: userApiKey });
    return aiClient;
  }

  return null;
}

function validateContentItems(items: unknown): asserts items is ContentItem[] {
  if (!Array.isArray(items)) {
    throw new Error("Content strategy must be an array");
  }
  if (items.length !== 30) {
    throw new Error(`Expected 30 content items, got ${items.length}`);
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    if (typeof item.day !== "number" || item.day < 1 || item.day > 30) {
      throw new Error(`Item ${i + 1} has invalid day: ${item.day}`);
    }
    if (typeof item.title !== "string" || item.title.trim().length === 0) {
      throw new Error(`Item ${i + 1} missing title`);
    }
    if (typeof item.format !== "string" || item.format.trim().length === 0) {
      throw new Error(`Item ${i + 1} missing format`);
    }
    if (typeof item.topic_angle !== "string" || item.topic_angle.trim().length === 0) {
      throw new Error(`Item ${i + 1} missing topic_angle`);
    }
    if (typeof item.primary_keyword !== "string" || item.primary_keyword.trim().length === 0) {
      throw new Error(`Item ${i + 1} missing primary_keyword`);
    }
  }
}

export async function generateContentStrategy(
  industry: string,
  location: string,
  stage: string,
): Promise<ContentItem[]> {
  const ai = await getAiClient();

  if (!ai) {
    throw new Error(
      "AI generation is not configured. Set GEMINI_API_KEY or provision the Replit AI Integrations.",
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
      const parsed = JSON.parse(cleaned) as ContentItem[];
      validateContentItems(parsed);

      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, industry, location, stage }, "Content strategy generation attempt failed");

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}
