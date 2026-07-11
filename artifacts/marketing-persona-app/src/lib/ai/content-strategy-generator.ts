import { getAiClient } from "@workspace/ai-providers";
import type { GoogleGenAI } from "@google/genai";
import type { ContentStyle } from "@workspace/db/schema";

export interface ContentItem {
  day: number;
  title: string;
  format: string;
  topic_angle: string;
  primary_keyword: string;
}

const SYSTEM_PROMPT = `You are a senior content strategist specializing in B2B SEO and thought-leadership marketing for technology startups. You produce precise, day-by-day 30-day content plans that drive organic growth.

You MUST respond with a single valid JSON array and nothing else. No markdown, no code blocks, no explanation — only raw JSON.`;

function buildContentStyleContext(style?: ContentStyle | null): string {
  if (!style) return "";
  const lines: string[] = [];
  if (style.personaName) lines.push(`Writing Persona: ${style.personaName}`);
  if (style.tonePreset) lines.push(`Tone: ${style.tonePreset}`);
  if (style.defaultWordCount) lines.push(`Target Word Count: ~${style.defaultWordCount} words`);
  if (style.primaryLanguage) lines.push(`Language: ${style.primaryLanguage}`);
  if (style.readingLevel) lines.push(`Reading Level: ${style.readingLevel}`);
  if (style.forbiddenWords && style.forbiddenWords.length > 0) {
    lines.push(`Avoid these words/phrases: ${style.forbiddenWords.join(", ")}`);
  }
  if (lines.length === 0) return "";
  return "\n\nContent Style Guidelines:\n" + lines.map((l) => `- ${l}`).join("\n");
}

function buildBatchPrompt(industry: string, location: string, stage: string, startDay: number, endDay: number, contentStyle?: ContentStyle | null): string {
  const styleContext = buildContentStyleContext(contentStyle);
  return `Generate days ${startDay} to ${endDay} of a 30-day content strategy for a ${industry} startup based in ${location} at the ${stage} stage.${styleContext}

Return ONLY a JSON array of exactly ${endDay - startDay + 1} objects (days ${startDay}–${endDay}), each with this exact structure:
[
  {
    "day": ${startDay},
    "title": "<compelling content title>",
    "format": "<LinkedIn post | Blog article | Twitter thread | Case study | Video script | Newsletter | Podcast outline>",
    "topic_angle": "<specific angle or hook for this piece — 1-2 sentences>",
    "primary_keyword": "<the main SEO or search keyword this targets>"
  }
]

Requirements:
- Mix formats (LinkedIn posts, blog articles, Twitter threads, etc.)
- Days ${startDay <= 10 ? "1-10: build brand awareness and foundational content" : startDay <= 20 ? "11-20: deepen authority and drive engagement" : "21-30: push conversion, social proof, and category leadership"}
- Content must be specific to ${industry} in ${location} at the ${stage} stage
- Each title must be compelling and specific — no generic titles
- Keywords should be realistic terms potential customers search for
- Day numbers must run from ${startDay} to ${endDay} exactly
- Return ONLY the JSON array, no other text`;
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

async function generateBatch(
  ai: GoogleGenAI,
  industry: string,
  location: string,
  stage: string,
  startDay: number,
  endDay: number,
  contentStyle?: ContentStyle | null,
): Promise<ContentItem[]> {
  const prompt = buildBatchPrompt(industry, location, stage, startDay, endDay, contentStyle);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const rawText = response.text;
      if (!rawText) throw new Error("Empty response from Gemini");
      const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned) as ContentItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid batch response");
      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

const BATCH_RANGES: [number, number][] = [[1, 10], [11, 20], [21, 30]];

export async function generateContentStrategy(
  industry: string,
  location: string,
  stage: string,
  contentStyle?: ContentStyle | null,
): Promise<ContentItem[]> {
  const ai = getAiClient();
  const [batch1, batch2, batch3] = await Promise.all([
    generateBatch(ai, industry, location, stage, 1, 10, contentStyle),
    generateBatch(ai, industry, location, stage, 11, 20, contentStyle),
    generateBatch(ai, industry, location, stage, 21, 30, contentStyle),
  ]);
  const all = [...batch1, ...batch2, ...batch3].sort((a, b) => a.day - b.day);
  validateContentItems(all);
  return all;
}

export async function generateContentStrategyWithProgress(
  industry: string,
  location: string,
  stage: string,
  onBatch: (batchNum: number, totalBatches: number, items: ContentItem[]) => void,
  contentStyle?: ContentStyle | null,
): Promise<ContentItem[]> {
  const ai = getAiClient();
  let completed = 0;
  const batchPromises = BATCH_RANGES.map(([start, end]) =>
    generateBatch(ai, industry, location, stage, start, end, contentStyle).then((items) => {
      completed++;
      onBatch(completed, BATCH_RANGES.length, items);
      return items;
    }),
  );
  const batches = await Promise.all(batchPromises);
  const sorted = batches.flat().sort((a, b) => a.day - b.day);
  validateContentItems(sorted);
  return sorted;
}
