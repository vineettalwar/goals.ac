import { getAiClient } from "@workspace/ai-providers";
import type { GoogleGenAI } from "@google/genai";
import type { ContentStyle } from "@workspace/db/schema";

export interface SeoArticleContent {
  title: string;
  meta_description: string;
  primary_keyword: string;
  secondary_keywords: string[];
  content: string;
}

const SYSTEM_PROMPT = `You are a world-class SEO content strategist and writer specializing in B2B technology startups. You produce authoritative, deeply researched long-form articles that rank on Google and are cited by AI search tools like ChatGPT, Perplexity, and Claude.

Your articles are brand-aligned, industry-specific, and location-aware. They combine thought leadership with practical insight to build brand authority.

You MUST respond with a single valid JSON object and nothing else. No markdown, no code blocks, no explanation — only raw JSON.`;

function buildContentStyleContext(style?: ContentStyle | null): string {
  if (!style) return "";
  const lines: string[] = [];
  if (style.personaName) lines.push(`WRITING PERSONA: ${style.personaName}`);
  if (style.tonePreset) lines.push(`TONE: ${style.tonePreset}`);
  if (style.defaultWordCount) lines.push(`TARGET WORD COUNT: ~${style.defaultWordCount} words`);
  if (style.primaryLanguage) lines.push(`LANGUAGE: ${style.primaryLanguage}`);
  if (style.readingLevel) lines.push(`READING LEVEL: ${style.readingLevel}`);
  if (style.forbiddenWords && style.forbiddenWords.length > 0) {
    lines.push(`DO NOT USE THESE WORDS/PHRASES: ${style.forbiddenWords.join(", ")}`);
  }
  if (lines.length === 0) return "";
  return "\nCONTENT STYLE GUIDELINES:\n" + lines.map((l) => `- ${l}`).join("\n");
}

function buildPrompt(
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
  contentStyle?: ContentStyle | null,
): string {
  const stageContext: Record<string, string> = {
    "pre-seed": "early-stage startup validating its concept",
    "seed": "seed-stage startup building initial traction",
    "series-a": "Series A startup scaling its go-to-market",
    "series-b": "Series B startup expanding aggressively",
    "growth": "growth-stage company building category leadership",
  };

  const stageDesc = stageContext[stage] ?? stage;
  const wordRange = contentStyle?.defaultWordCount
    ? `${contentStyle.defaultWordCount}–${Math.round(contentStyle.defaultWordCount * 1.25)}`
    : "1200–1500";
  const styleContext = buildContentStyleContext(contentStyle);

  return `Write a comprehensive, brand-aligned SEO article for ${brandName} (${websiteUrl}), a ${stageDesc} in the ${industry} industry based in ${location}.

The article must be ${wordRange} words, structured for both search ranking and AI citation. Write from the perspective of a knowledgeable insider in the ${industry} space in ${location}.${styleContext}

Return ONLY this exact JSON structure with no additional text:

{
  "title": "<compelling SEO title that includes the primary keyword and ${location} or ${industry} where natural — 55-65 characters>",
  "meta_description": "<meta description summarizing the article's value — 140-155 characters, includes primary keyword>",
  "primary_keyword": "<the single most important keyword phrase this article targets>",
  "secondary_keywords": ["<3-5 supporting keyword phrases>"],
  "content": "<full article in markdown format — see structure below>"
}

Article content structure (all in valid markdown):
- Start with a compelling 2-3 sentence introduction that hooks the reader and states the article's premise
- ## Why [Topic] Matters for ${industry} Startups in ${location} (200-250 words)
- ## [Key Strategic Insight 1 specific to ${industry}] (250-300 words)
- ## [Key Strategic Insight 2 specific to ${location} market] (250-300 words)
- ## Practical Playbook: [Actionable Framework] (300-350 words with numbered steps or bullet points)
- ## Common Mistakes ${industry} Founders Make (150-200 words)
- ## Conclusion (100-150 words — forward-looking, ties back to the opening premise)

Requirements:
- Reference ${brandName} naturally 2-3 times as an example or authority
- Include specific data points, named frameworks, and real tools used in ${industry}
- Weave in ${location}-specific market context (regulations, ecosystem, buyer behaviour)
- The content must be citation-worthy for AI search tools`;
}

async function generateWithClient(
  ai: GoogleGenAI,
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
  contentStyle?: ContentStyle | null,
): Promise<SeoArticleContent> {
  const prompt = buildPrompt(brandName, websiteUrl, industry, location, stage, contentStyle);
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
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty response from Gemini");

      const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      const result = JSON.parse(cleaned) as SeoArticleContent;

      if (!result.title || !result.content || result.content.length < 500) {
        throw new Error("Invalid article structure from Gemini");
      }

      return result;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}

export async function generateSeoArticleContent(
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
  contentStyle?: ContentStyle | null,
): Promise<SeoArticleContent> {
  const ai = getAiClient();
  return generateWithClient(ai, brandName, websiteUrl, industry, location, stage, contentStyle);
}

async function generateStreamWithClient(
  ai: GoogleGenAI,
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
  onChunk: (text: string) => void,
  contentStyle?: ContentStyle | null,
): Promise<SeoArticleContent> {
  const prompt = buildPrompt(brandName, websiteUrl, industry, location, stage, contentStyle);
  let accumulated = "";

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  for await (const chunk of stream) {
    const text = chunk.text ?? "";
    accumulated += text;
    if (text) onChunk(text);
  }

  const cleaned = accumulated.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
  const result = JSON.parse(cleaned) as SeoArticleContent;
  if (!result.title || !result.content || result.content.length < 500) {
    throw new Error("Invalid article structure from Gemini stream");
  }
  return result;
}

export async function generateSeoArticleContentStream(
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
  onChunk: (text: string) => void,
  contentStyle?: ContentStyle | null,
): Promise<SeoArticleContent> {
  const ai = getAiClient();
  return generateStreamWithClient(ai, brandName, websiteUrl, industry, location, stage, onChunk, contentStyle);
}
