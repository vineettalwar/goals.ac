import type { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";
import type { ContentFormatType } from "@workspace/db";

export interface ContentPieceResult {
  title: string;
  target_keyword: string;
  body_markdown: string;
}

interface BrandContext {
  companyName: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
}

const SYSTEM_PROMPT = `You are a world-class SEO content strategist and writer. You produce authoritative, deeply researched content that ranks on Google and is cited by AI search tools like ChatGPT, Perplexity, and Claude.

Your content is brand-aligned, audience-specific, and actionable. You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation — only raw JSON.`;

const FORMAT_CONFIGS: Record<ContentFormatType, { label: string; wordRange: string; structure: string }> = {
  blog_post: {
    label: "Blog Post",
    wordRange: "900-1200",
    structure: `- Engaging introduction (hook + premise, 2-3 sentences)
- ## Why [Topic] Matters — 150-200 words
- ## [Core Insight 1] — 200-250 words
- ## [Core Insight 2] — 200-250 words
- ## [Practical Takeaways] — numbered list of 5-7 actionable tips
- ### Conclusion — 100-150 words with forward-looking close`,
  },
  news_article: {
    label: "News Article",
    wordRange: "600-900",
    structure: `- Inverted pyramid: most important facts first
- ## Background — 150 words of context
- ## Key Developments — 200 words on what's happening
- ## Industry Impact — 150 words on what this means for the sector
- ## What's Next — 100 words forward-looking
- Keep tone journalistic, factual, and timely`,
  },
  tutorial: {
    label: "Tutorial",
    wordRange: "1200-1600",
    structure: `- Introduction: what you'll learn and prerequisites
- ## What You Need — bullet list of tools/requirements
- ## Step 1: [Action] — 150-200 words with detail
- ## Step 2: [Action] — 150-200 words with detail
- ## Step 3: [Action] — 150-200 words with detail
- ## Step 4: [Action] — 150-200 words with detail
- ## Common Mistakes to Avoid — 100-150 words
- ## Summary — 100 words recap and next steps`,
  },
  guide: {
    label: "Comprehensive Guide",
    wordRange: "1400-1800",
    structure: `- Executive summary (what this guide covers)
- ## Understanding [Topic] — foundational concepts, 200-250 words
- ## Key Challenges — 200 words on what makes this hard
- ## The Right Framework — 250 words on the recommended approach
- ## Implementation Playbook — 300 words with numbered steps
- ## Tools & Resources — 150 words curated list
- ## Case Study / Example — 200 words illustrative scenario
- ### Final Thoughts — 100 words closing`,
  },
  whitepaper: {
    label: "Whitepaper",
    wordRange: "1800-2500",
    structure: `- Executive Summary — 150 words
- ## 1. Introduction — 200 words problem statement
- ## 2. Industry Context & Data — 300 words with statistics/research
- ## 3. Current Approaches & Their Limitations — 250 words
- ## 4. Proposed Framework / Solution — 350 words detailed methodology
- ## 5. Implementation Considerations — 200 words practical guidance
- ## 6. ROI & Business Case — 200 words value argument
- ## 7. Conclusion & Recommendations — 150 words
- Formal, authoritative tone. Use data, cite frameworks by name.`,
  },
  pillar_page: {
    label: "Pillar Page",
    wordRange: "2000-3000",
    structure: `- Hero introduction defining the topic space (200 words)
- ## What Is [Topic]? — 200 words clear definition
- ## Why [Topic] Matters in [Year] — 200 words relevance
- ## [Subtopic 1] — 300 words deep dive
- ## [Subtopic 2] — 300 words deep dive
- ## [Subtopic 3] — 300 words deep dive
- ## [Subtopic 4] — 300 words deep dive
- ## Common Questions — 5 FAQ-style Q&A pairs
- ## Tools & Platforms — curated recommendations
- ### Getting Started — 150 words action plan
- This is an evergreen hub page; comprehensive, link-worthy content`,
  },
  location_page: {
    label: "Location/Language Page",
    wordRange: "800-1200",
    structure: `- Opening that names the location and the service/product in first sentence
- ## [Service/Product] in [Location] — 200 words local market context
- ## Why [Location] Businesses Choose [Brand] — 150 words local proof points
- ## Local Market Insights — 200 words location-specific data and trends
- ## How We Serve [Location] Clients — 150 words operational detail
- ## Get Started in [Location] — 100 words CTA-oriented close
- Weave location-specific signals throughout; mention local landmarks, regulations, or market nuances`,
  },
  infographic_outline: {
    label: "Infographic Outline",
    wordRange: "400-600",
    structure: `- ## Infographic Title — compelling, shareable headline
- ## Hook Statistic — 1-2 surprising data points to open with
- ## Section 1: [Label] — 3-4 bullet data points or facts
- ## Section 2: [Label] — 3-4 bullet data points or facts
- ## Section 3: [Label] — 3-4 bullet data points or facts
- ## Section 4: [Label] — 3-4 bullet data points or facts
- ## Key Takeaway — 1-2 sentence summary quote
- ## Call to Action — what the viewer should do next
- Note: This is a content brief/outline for a designer, not prose. Each section is a visual panel.`,
  },
};

function buildPrompt(format: ContentFormatType, brand: BrandContext, keyword: string, angleHint?: string): string {
  const config = FORMAT_CONFIGS[format];
  const kwList = brand.primaryKeywords.length > 0 ? brand.primaryKeywords.slice(0, 5).join(", ") : keyword;

  return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
BRAND VOICE: ${brand.voiceTone || "Professional, clear, and authoritative"}
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${angleHint ? `CONTENT ANGLE / TITLE HINT: ${angleHint}` : ""}

Write ${config.wordRange} words following this structure:
${config.structure}

Return ONLY this exact JSON with no additional text:
{
  "title": "<compelling, SEO-optimised title that includes the target keyword — 55-70 characters>",
  "target_keyword": "${keyword}",
  "body_markdown": "<full content in valid markdown following the structure above>"
}

Requirements:
- Write entirely in the brand voice described above
- Target the keyword "${keyword}" naturally throughout
- Reference ${brand.companyName} 2-3 times without being promotional
- Use specific data points, named frameworks, and concrete examples
- Content must be original, authoritative, and citation-worthy`;
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

function validateResult(result: unknown): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null) throw new Error("Result must be an object");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || r.title.trim().length === 0) throw new Error("Missing title");
  if (typeof r.target_keyword !== "string") throw new Error("Missing target_keyword");
  if (typeof r.body_markdown !== "string" || r.body_markdown.trim().length < 200) throw new Error("body_markdown too short");
}

export async function generateContentPiece(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
): Promise<ContentPieceResult> {
  const ai = await getAiClient();

  if (!ai) {
    throw new Error(
      "AI generation is not configured. Set GEMINI_API_KEY or provision the Replit AI Integrations.",
    );
  }

  const prompt = buildPrompt(format, brand, keyword, angleHint);
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
      if (!rawText) throw new Error("Empty response from Gemini");

      const cleaned = rawText.trim().replace(/^```json\s*/, "").replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned) as ContentPieceResult;
      validateResult(parsed);

      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, format, keyword }, "Content studio generation attempt failed");
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}
