import type { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";

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

function buildPrompt(
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
): string {
  const stageContext: Record<string, string> = {
    "pre-seed": "early-stage startup validating its concept",
    "seed": "seed-stage startup building initial traction",
    "series-a": "Series A startup scaling its go-to-market",
    "series-b": "Series B startup expanding aggressively",
    "growth": "growth-stage company building category leadership",
  };

  const stageDesc = stageContext[stage] ?? stage;

  return `Write a comprehensive, brand-aligned SEO article for ${brandName} (${websiteUrl}), a ${stageDesc} in the ${industry} industry based in ${location}.

The article must be 1200–1500 words, structured for both search ranking and AI citation. Write from the perspective of a knowledgeable insider in the ${industry} space in ${location}.

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
- ## Section 1: [Industry Context in ${location}] — 200-250 words on the current state of ${industry} in ${location}, key trends, market dynamics
- ## Section 2: [Core Challenge for ${stage} ${industry} Startups] — 200-250 words on the biggest growth challenge at this stage
- ## Section 3: [Strategic Approach] — 200-250 words on how smart ${industry} companies in ${location} are solving this
- ## Section 4: [${brandName}'s Perspective / Unique Angle] — 150-200 words naturally weaving in ${brandName}'s approach without being promotional
- ## Section 5: [Practical Steps / Framework] — 200-250 words with actionable numbered steps or bullet points
- ## Section 6: [Future Outlook] — 100-150 words on where ${industry} in ${location} is heading
- ### Conclusion — 100-150 words summarizing key points and a forward-looking call to reflection

Requirements:
- Use specific data points, statistics, and named frameworks where appropriate
- Reference real tools, platforms, and market dynamics relevant to ${location}
- Write at a level that earns citations from AI search tools (authoritative, specific, non-generic)
- Naturally mention ${brandName} 2-3 times without making it an advertisement
- Include ${location}-specific market context throughout`;
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

function validateSeoArticleContent(content: unknown): asserts content is SeoArticleContent {
  if (typeof content !== "object" || content === null) {
    throw new Error("SEO article content must be an object");
  }
  const c = content as Record<string, unknown>;
  if (typeof c.title !== "string" || c.title.trim().length === 0) {
    throw new Error("SEO article missing title");
  }
  if (typeof c.meta_description !== "string" || c.meta_description.trim().length === 0) {
    throw new Error("SEO article missing meta_description");
  }
  if (typeof c.primary_keyword !== "string" || c.primary_keyword.trim().length === 0) {
    throw new Error("SEO article missing primary_keyword");
  }
  if (!Array.isArray(c.secondary_keywords) || c.secondary_keywords.length === 0) {
    throw new Error("SEO article missing secondary_keywords");
  }
  if (typeof c.content !== "string" || c.content.trim().length < 500) {
    throw new Error("SEO article content is too short or missing");
  }
}

export async function generateSeoArticleContent(
  brandName: string,
  websiteUrl: string,
  industry: string,
  location: string,
  stage: string,
): Promise<SeoArticleContent> {
  const ai = await getAiClient();

  if (!ai) {
    throw new Error(
      "AI generation is not configured. Set GEMINI_API_KEY or provision the Replit AI Integrations (AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY).",
    );
  }

  const prompt = buildPrompt(brandName, websiteUrl, industry, location, stage);
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
      const parsed = JSON.parse(cleaned) as SeoArticleContent;
      validateSeoArticleContent(parsed);

      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, brandName, industry, location, stage }, "Gemini SEO generation attempt failed");

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}
