import { createHash } from "node:crypto";
import { logger } from "../lib/logger";
import { getPlatformGeminiClient, createUserGeminiClient, isUserKeyError } from "../lib/geminiClient";
import type { GoogleGenAI } from "@google/genai";
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
  linkedin_post: {
    label: "LinkedIn Post",
    wordRange: "200-400",
    structure: `- Opening hook: a bold statement, surprising stat, or provocative question (1-2 lines, no fluff)
- ## The Core Insight — 3-4 short paragraphs sharing a genuine perspective or lesson
- ## Practical Takeaways — 3-5 bullet points the reader can act on today
- Closing line: a thought-provoking question or call-to-reflect that invites comments
- Use short paragraphs (1-3 sentences each). No corporate language. Write like a founder speaking to peers.`,
  },
  twitter_thread: {
    label: "Twitter / X Thread",
    wordRange: "300-500",
    structure: `- Tweet 1 (hook): A bold claim or surprising stat that makes people stop scrolling. End with "Thread 🧵"
- Tweet 2: Context — why this matters for founders right now
- Tweets 3-6: One insight per tweet. Start each with a number (2/, 3/, etc.). Short, punchy sentences.
- Tweet 7: The counterintuitive point most people miss
- Tweet 8: Practical 3-step framework or checklist
- Tweet 9 (close): Restate the core insight. Tell them to bookmark / retweet if useful.
- Each tweet ≤ 280 characters. Use line breaks for readability. Format as "1/ [text]\\n\\n2/ [text]" etc.`,
  },
  email_sequence: {
    label: "Email Sequence",
    wordRange: "800-1200",
    structure: `- ## Email 1: Welcome / Problem Awareness
  - Subject line (A/B option): two variants
  - Preview text: 80-100 characters
  - Body: warm opener, introduce the core problem, tease the solution, clear CTA
- ## Email 2: Education / Value (Day 3)
  - Subject line + preview text
  - Body: deliver the promised insight, 3 key lessons, soft CTA to explore further
- ## Email 3: Social Proof + Offer (Day 7)
  - Subject line + preview text
  - Body: case study or testimonial, bridge to the offer, strong CTA with urgency
- Write in the brand voice. Keep each email 200-400 words. Include [FIRST NAME] personalization token.`,
  },
  ad_copy: {
    label: "Ad Copy",
    wordRange: "300-500",
    structure: `- ## Google Search Ads
  - Headline 1 (30 chars max): primary keyword + value prop
  - Headline 2 (30 chars max): benefit or differentiator
  - Headline 3 (30 chars max): CTA
  - Description 1 (90 chars max): expand the benefit, include keyword
  - Description 2 (90 chars max): social proof or urgency
- ## Meta (Facebook/Instagram) Ads
  - Primary Text (125 chars ideal): hook + problem agitation
  - Headline (40 chars max): bold benefit statement
  - Description (30 chars max): supporting proof point
  - CTA button: [Book Now | Learn More | Get Started | Sign Up]
- ## 3 Headline Variations: alternative angles for A/B testing`,
  },
  landing_page_copy: {
    label: "Landing Page Copy",
    wordRange: "600-900",
    structure: `- ## Hero Section
  - H1: clear, keyword-rich headline (benefit-led, ≤ 10 words)
  - Subheadline: expand the promise (1-2 sentences)
  - Primary CTA button text + secondary link text
- ## Problem / Agitation — 2-3 short paragraphs naming the pain
- ## Solution Introduction — 2-3 paragraphs introducing the product/service
- ## Key Features (3-4 items)
  - Feature name + 1-sentence benefit description each
- ## Social Proof — 2 testimonial templates with [Name, Title, Company] placeholders
- ## FAQ (3 questions) — anticipate objections
- ## Final CTA Section — headline + CTA button + urgency line`,
  },
  product_description: {
    label: "Product Description",
    wordRange: "300-500",
    structure: `- ## Product Name + Tagline (1 line)
- ## The 30-Second Pitch — 2-3 sentences: what it is, who it's for, the #1 benefit
- ## Key Benefits (3-5 bullet points) — outcome-focused, not feature lists
- ## How It Works — 3-step simple explanation
- ## Who It's For — 2-3 customer personas or use cases
- ## Why Choose [Brand] — 2-3 differentiators vs. alternatives
- ## CTA — one clear next step`,
  },
  press_release: {
    label: "Press Release",
    wordRange: "500-700",
    structure: `- FOR IMMEDIATE RELEASE
- ## Headline — newsworthy, specific, keyword-rich (active voice)
- ## Subheadline — one sentence expanding the news
- [City, Date] — Opening paragraph: the 5 Ws (who, what, when, where, why) in 2-3 sentences
- ## Body Paragraph 1 — context and significance of the announcement
- ## Quote from [CEO/Founder Name, Title, Company] — genuine-sounding, 2-3 sentences
- ## Body Paragraph 2 — additional details, data points, or background
- ## About [Company Name] — 3-sentence boilerplate
- ### Media Contact: [Name] | [Email] | [Phone]`,
  },
  faq_article: {
    label: "FAQ / Knowledge Base",
    wordRange: "800-1200",
    structure: `- ## Introduction — 1 paragraph explaining what this FAQ covers and who it's for
- ## Frequently Asked Questions (8-12 questions)
  - Each Q&A follows this format:
    ### [Question phrased exactly as a user would type it]
    [Answer: 2-4 sentences. Clear, direct, jargon-free. Link to related resources where relevant.]
- Questions should progress from basic ("What is X?") to advanced ("How do I troubleshoot Y?")
- Include the target keyword naturally in at least 3 question/answer pairs
- ## Still Have Questions? — 1-paragraph close with CTA to contact support or book a demo`,
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

interface CacheEntry {
  result: ContentPieceResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_SIZE = 500;
const contentCache = new Map<string, CacheEntry>();

function cacheKey(format: string, keyword: string, brand: BrandContext): string {
  const raw = `${format}::${keyword.toLowerCase().trim()}::${brand.companyName}::${brand.industry}::${brand.voiceTone}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function cacheGet(key: string): ContentPieceResult | null {
  const entry = contentCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { contentCache.delete(key); return null; }
  return entry.result;
}

function cacheSet(key: string, result: ContentPieceResult): void {
  if (contentCache.size >= CACHE_MAX_SIZE) {
    const firstKey = contentCache.keys().next().value;
    if (firstKey) contentCache.delete(firstKey);
  }
  contentCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

function validateResult(result: unknown): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null) throw new Error("Result must be an object");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || r.title.trim().length === 0) throw new Error("Missing title");
  if (typeof r.target_keyword !== "string") throw new Error("Missing target_keyword");
  if (typeof r.body_markdown !== "string" || r.body_markdown.trim().length < 200) throw new Error("body_markdown too short");
}

async function generateWithClient(
  ai: GoogleGenAI,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
): Promise<ContentPieceResult> {
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
          thinkingConfig: { thinkingBudget: 0 },
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

async function generateWithClientStream(
  ai: GoogleGenAI,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  onChunk: (text: string) => void,
  angleHint?: string,
): Promise<ContentPieceResult> {
  const prompt = buildPrompt(format, brand, keyword, angleHint);
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
  const parsed = JSON.parse(cleaned) as ContentPieceResult;
  validateResult(parsed);
  return parsed;
}

export async function generateContentPieceStream(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  onChunk: (text: string) => void,
  angleHint?: string,
  userApiKey?: string | null,
): Promise<ContentPieceResult> {
  if (userApiKey) {
    const userClient = await createUserGeminiClient(userApiKey);
    return await generateWithClientStream(userClient, format, brand, keyword, onChunk, angleHint);
  }

  const platformClient = await getPlatformGeminiClient();
  if (!platformClient) throw new Error("AI generation is not configured.");
  return generateWithClientStream(platformClient, format, brand, keyword, onChunk, angleHint);
}

export async function generateContentPiece(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  bypassCache = false,
  userApiKey?: string | null,
): Promise<ContentPieceResult> {
  const key = cacheKey(format, keyword, brand);
  if (!bypassCache && !userApiKey) {
    const cached = cacheGet(key);
    if (cached) { logger.info({ format, keyword }, "Content piece served from cache"); return cached; }
  }

  if (userApiKey) {
    try {
      const userClient = await createUserGeminiClient(userApiKey);
      const result = await generateWithClient(userClient, format, brand, keyword, angleHint);
      cacheSet(key, result);
      return result;
    } catch (err) {
      if (isUserKeyError(err)) {
        logger.warn({ err }, "User Gemini key failed for content piece, falling back to platform key");
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

  const result = await generateWithClient(platformClient, format, brand, keyword, angleHint);
  cacheSet(key, result);
  return result;
}

export { type BrandContext };
