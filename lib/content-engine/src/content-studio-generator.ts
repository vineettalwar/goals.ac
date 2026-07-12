import { createHash } from "node:crypto";
import { logger } from "./logger";
import {
  getAiProviderClient,
  wrapGeminiClient,
  createUserGeminiClient,
  isUserKeyError,
} from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { getCache } from "./cache";
import type { ContentFormatType, ContentStyle } from "@workspace/db";

// LinkedIn Post Enhancement Constants (Phase 2)
const LINKEDIN_ARCHETYPES = [
  {
    id: "listicle",
    label: "Listicle",
    description: "Numbered insights",
    exampleHook: "3 things I learned about X...",
  },
  {
    id: "case-study",
    label: "Mini Case Study",
    description: "Client/success story",
    exampleHook: "Last week we helped a client Y...",
  },
  {
    id: "hot-take",
    label: "Hot Take",
    description: "Contrarian viewpoint",
    exampleHook: "Unpopular opinion: X is actually...",
  },
  {
    id: "personal-story",
    label: "Personal Story",
    description: "Journey/confession",
    exampleHook: "5 years ago I was X, then Y happened...",
  },
  {
    id: "educational",
    label: "Educational",
    description: "How-to insight",
    exampleHook: "Here's the exact framework we use for Y...",
  },
] as const;

const LINKEDIN_HOOK_TYPES = [
  {
    id: "bold-question",
    label: "Bold Question",
    template: "What if [statement]?",
    strengthScore: 8,
  },
  {
    id: "contrarian-take",
    label: "Contrarian Take",
    template: "Most [audience] get [topic] wrong.",
    strengthScore: 9,
  },
  {
    id: "surprising-stat",
    label: "Surprising Stat",
    template: "83% of [audience] fail because of [reason].",
    strengthScore: 8,
  },
  {
    id: "personal-confession",
    label: "Personal Confession",
    template: "I used to do X. Here's why I stopped.",
    strengthScore: 6,
  },
  {
    id: "controversial",
    label: "Controversial",
    template: "Hot take: [statement]",
    strengthScore: 7,
  },
] as const;

const LINKEDIN_ARCHETYPE_STRUCTURES: Record<string, string> = {
  listicle:
    "- Opening hook\n- Brief context on why this matters\n- Numbered list of insights (3-7 items)\n- Brief explanation for each insight\n- Closing thought or question to engage readers",
  "case-study":
    "- Opening hook\n- Introduction to the client/challenge\n- The problem or situation faced\n- The solution implemented\n- Results and measurable outcomes\n- Lessons learned and closing insight",
  "hot-take":
    "- Opening hook that states the contrarian viewpoint\n- Explanation of why the common belief is wrong\n- Evidence or reasoning supporting your view\n- Who might disagree and why they're mistaken\n- Closing thought that reinforces your perspective",
  "personal-story":
    "- Opening hook that draws readers in\n- The beginning of your journey or situation\n- The challenge or turning point\n- How you overcame it or what you learned\n- Where you are now and what it means\n- Closing reflection or advice for others",
  educational:
    "- Opening hook that highlights the value of the knowledge\n- The problem or gap in understanding\n- The framework, method, or approach explained\n- How to apply it with concrete examples\n- Common mistakes to avoid\n- Closing summary and next steps",
} as const;

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
  contentStyle?: ContentStyle | null;
}

const SYSTEM_PROMPT = `You are a world-class SEO content strategist and writer. You produce authoritative, deeply researched content that ranks on Google and is cited by AI search tools like ChatGPT, Perplexity, and Claude.

Your content is brand-aligned, audience-specific, and actionable. You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation — only raw JSON.`;

const FORMAT_CONFIGS: Record<
  ContentFormatType,
  { label: string; wordRange: string; structure: string }
> = {
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
    wordRange: "1300-1800",
    structure: `- Hook: A scroll-stopping opening line (question, bold statement, or surprising fact)
 - Context: Brief explanation of why this matters to the reader
 - Main Insight: Your core perspective, lesson, or story
 - Supporting Details: Evidence, examples, or data points that back up your insight
 - Practical Takeaway: How readers can apply this information
 - Engaging Close: Question or invitation for comments to boost engagement
 - Optimal length: 1300-1800 characters for maximum engagement
 - Format: Short paragraphs (2-3 sentences max), no hashtags in body`,
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
  instagram_post: {
    label: "Instagram Post",
    wordRange: "150-300",
    structure: `- ## Caption (first 125 characters are visible before "more" — make them count)
  - Hook: one striking sentence — a bold statement, relatable pain, or surprising fact
  - 3-4 short paragraphs expanding the idea (2-3 lines each, mobile-friendly)
  - Closing CTA: invite to save, share, comment, or click the link in bio
- ## Hashtag Block (separate from caption)
  - 10-15 relevant hashtags mixing high-volume (#startup, #marketing) and niche-specific tags
- ## Alt Text: one sentence describing the visual for accessibility
- Write in first-person, conversational tone. Short sentences. High energy. No corporate speak.`,
  },
  facebook_post: {
    label: "Facebook Post",
    wordRange: "150-400",
    structure: `- Hook: one engaging opening line that stops the scroll
- 2-4 short paragraphs with the core insight, story, or tip
- End with a question or CTA to drive comments
- Optional: 3-5 relevant hashtags at the end (separate line)
- Conversational, community-friendly tone. No corporate jargon.`,
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

function buildContentStyleContext(style?: ContentStyle | null): string {
  if (!style) return "";
  const lines: string[] = [];
  if (style.personaName) lines.push(`WRITING PERSONA: ${style.personaName}`);
  if (style.tonePreset) lines.push(`TONE: ${style.tonePreset}`);
  if (style.defaultWordCount)
    lines.push(
      `TARGET WORD COUNT: ~${style.defaultWordCount} words (override format default if instructed)`,
    );
  if (style.primaryLanguage) lines.push(`LANGUAGE: ${style.primaryLanguage}`);
  if (style.readingLevel) lines.push(`READING LEVEL: ${style.readingLevel}`);
  if (style.forbiddenWords && style.forbiddenWords.length > 0) {
    lines.push(
      `DO NOT USE THESE WORDS/PHRASES: ${style.forbiddenWords.join(", ")}`,
    );
  }
  if (lines.length === 0) return "";
  return (
    "\nCONTENT STYLE GUIDELINES:\n" + lines.map((l) => `- ${l}`).join("\n")
  );
}

function buildPrompt(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
): string {
  const config = FORMAT_CONFIGS[format];
  const kwList =
    brand.primaryKeywords.length > 0
      ? brand.primaryKeywords.slice(0, 5).join(", ")
      : keyword;
  const wordRange = brand.contentStyle?.defaultWordCount
    ? `~${brand.contentStyle.defaultWordCount}`
    : config.wordRange;
  const styleContext = buildContentStyleContext(brand.contentStyle);

  // Special handling for LinkedIn posts with archetypes and hooks
  if (format === "linkedin_post") {
    // For LinkedIn, we expect angleHint to contain archetype and hook info
    // Format: "archetype:${archetypeId}|hook:${hookId}"
    let archetypeInfo = "";
    let hookInfo = "";

    if (angleHint) {
      const parts = angleHint.split("|");
      for (const part of parts) {
        if (part.startsWith("archetype:")) {
          const archetypeId = part.split(":")[1];
          const archetype = LINKEDIN_ARCHETYPES.find(
            (a) => a.id === archetypeId,
          );
          if (archetype) {
            archetypeInfo = `
SELECTED ARCHETYPE: ${archetype.label} - ${archetype.description}
EXAMPLE HOOK: "${archetype.exampleHook}"
STRUCTURE GUIDELINE: ${LINKEDIN_ARCHETYPE_STRUCTURES[archetypeId]}`;
          }
        } else if (part.startsWith("hook:")) {
          const hookId = part.split(":")[1];
          const hook = LINKEDIN_HOOK_TYPES.find((h) => h.id === hookId);
          if (hook) {
            hookInfo = `
SELECTED HOOK TYPE: ${hook.label}
HOOK TEMPLATE: "${hook.template}"
STRENGTH SCORE: ${hook.strengthScore}/10`;
          }
        }
      }
    }

    return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
BRAND VOICE: ${brand.voiceTone || "Professional, clear, and authoritative"}
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${styleContext}
${archetypeInfo}
${hookInfo}

Requirements:
- Write entirely in the brand voice described above
- Target the keyword "${keyword}" naturally throughout
- Reference ${brand.companyName} 2-3 times without being promotional
- Use specific data points, named frameworks, and concrete examples
- Content must be original, authoritative, and citation-worthy
- For LinkedIn posts: optimal length is 1300-1800 characters
- Start with a strong hook that stops scroll
- Use short paragraphs (2-3 sentences maximum)
- Include specific insights or examples
- End with an engagement question or thought-provoking insight
- Do NOT include hashtags in the body text (they go in the comments)
- Write like a founder speaking to peers - authentic and direct`;
  }

  return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
BRAND VOICE: ${brand.voiceTone || "Professional, clear, and authoritative"}
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${angleHint ? `CONTENT ANGLE / TITLE HINT: ${angleHint}` : ""}${styleContext}

Write ${wordRange} words following this structure:
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

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function buildCacheKey(
  format: string,
  keyword: string,
  brand: BrandContext,
  angleHint?: string,
): string {
  const style = brand.contentStyle;
  const raw = [
    format,
    keyword.toLowerCase().trim(),
    brand.companyName,
    brand.websiteUrl,
    brand.industry,
    brand.voiceTone,
    brand.targetAudience,
    (brand.primaryKeywords ?? []).slice().sort().join(","),
    angleHint?.trim() ?? "",
    style?.tonePreset ?? "",
    style?.personaName ?? "",
    style?.defaultWordCount?.toString() ?? "",
    style?.primaryLanguage ?? "",
    style?.readingLevel ?? "",
    (style?.forbiddenWords ?? []).slice().sort().join(","),
  ].join("::");
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export async function cacheGet(
  key: string,
): Promise<ContentPieceResult | null> {
  try {
    const cache = await getCache();
    const raw = await cache.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as ContentPieceResult;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  result: ContentPieceResult,
): Promise<void> {
  try {
    const cache = await getCache();
    await cache.set(key, JSON.stringify(result), CACHE_TTL_MS);
  } catch (err) {
    logger.warn({ err }, "Failed to write content piece to cache");
  }
}

/**
 * Gemini occasionally emits raw C0 control characters (e.g. literal \n, \r, \t)
 * inside JSON string values, which JSON.parse rejects. This function walks the
 * raw output character-by-character, tracking string boundaries, and escapes
 * any control character found inside a string region.
 */
function sanitizeJsonControlChars(raw: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }

    if (inString && code < 0x20) {
      if (code === 0x0a) out += "\\n";
      else if (code === 0x0d) out += "\\r";
      else if (code === 0x09) out += "\\t";
      else out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }

    out += ch;
  }

  return out;
}

function cleanAndParse(raw: string): ContentPieceResult {
  const stripped = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "");
  const sanitized = sanitizeJsonControlChars(stripped);
  return JSON.parse(sanitized) as ContentPieceResult;
}

function validateResult(result: unknown): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null)
    throw new Error("Result must be an object");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || r.title.trim().length === 0)
    throw new Error("Missing title");
  if (typeof r.target_keyword !== "string")
    throw new Error("Missing target_keyword");
  if (
    typeof r.body_markdown !== "string" ||
    r.body_markdown.trim().length < 200
  )
    throw new Error("body_markdown too short");
}

async function generateWithClient(
  ai: AiProviderClient,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
): Promise<ContentPieceResult> {
  const prompt = buildPrompt(format, brand, keyword, angleHint);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        thinkingBudget: 0,
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");

      const parsed = cleanAndParse(rawText);
      validateResult(parsed);
      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, attempt, format, keyword },
        "Content studio generation attempt failed",
      );
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}

async function generateWithClientStream(
  ai: AiProviderClient,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  onChunk: (text: string) => void,
  angleHint?: string,
): Promise<ContentPieceResult> {
  const prompt = buildPrompt(format, brand, keyword, angleHint);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let accumulated = "";
      // Only emit chunks on the first attempt — retries are silent so no
      // duplicate/garbled text is written to an already-open SSE connection.
      const emit = attempt === 1 ? onChunk : () => {};

      if (ai.generateStream) {
        const stream = ai.generateStream({
          prompt,
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingBudget: 0,
        });
        for await (const text of stream) {
          accumulated += text;
          if (text) emit(text);
        }
      } else {
        // Fallback: non-streaming generate
        const result = await ai.generate({
          prompt,
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingBudget: 0,
        });
        accumulated = result.text;
        emit(result.text);
      }

      const parsed = cleanAndParse(accumulated);
      validateResult(parsed);
      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn(
        { err, attempt, format, keyword },
        "Content studio stream attempt failed",
      );
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
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
    let chunksEmitted = 0;
    try {
      const userClient = wrapGeminiClient(
        await createUserGeminiClient(userApiKey),
      );
      return await generateWithClientStream(
        userClient,
        format,
        brand,
        keyword,
        (chunk) => {
          chunksEmitted++;
          onChunk(chunk);
        },
        angleHint,
      );
    } catch (err) {
      if (isUserKeyError(err) && chunksEmitted === 0) {
        logger.warn(
          { err },
          "User Gemini key failed for content stream before first chunk, falling back to platform key",
        );
      } else {
        throw err;
      }
    }
  }

  const client = await getAiProviderClient();
  return generateWithClientStream(
    client,
    format,
    brand,
    keyword,
    onChunk,
    angleHint,
  );
}

export async function generateContentPiece(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  bypassCache = false,
  userApiKey?: string | null,
): Promise<ContentPieceResult> {
  const key = buildCacheKey(format, keyword, brand, angleHint);
  if (!bypassCache) {
    const cached = await cacheGet(key);
    if (cached) {
      logger.info({ format, keyword }, "Content piece served from cache");
      return cached;
    }
  }

  if (userApiKey) {
    try {
      const userClient = wrapGeminiClient(
        await createUserGeminiClient(userApiKey),
      );
      const result = await generateWithClient(
        userClient,
        format,
        brand,
        keyword,
        angleHint,
      );
      await cacheSet(key, result);
      return result;
    } catch (err) {
      if (isUserKeyError(err)) {
        logger.warn(
          { err },
          "User Gemini key failed for content piece, falling back to platform key",
        );
      } else {
        throw err;
      }
    }
  }

  const client = await getAiProviderClient();
  const result = await generateWithClient(
    client,
    format,
    brand,
    keyword,
    angleHint,
  );
  await cacheSet(key, result);
  return result;
}

const REPURPOSE_SYSTEM_PROMPT = `You are a world-class content strategist and copywriter. You take existing content and expertly repurpose it into a different format while preserving the core insights and brand voice.

You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation — only raw JSON.`;

function buildRepurposePrompt(
  targetFormat: ContentFormatType,
  brand: BrandContext,
  existingContent: string,
  existingKeyword: string,
): string {
  const config = FORMAT_CONFIGS[targetFormat];
  const styleContext = buildContentStyleContext(brand.contentStyle);
  return `Repurpose the following existing content into a ${config.label} for ${brand.companyName} (${brand.websiteUrl}).

EXISTING CONTENT:
${existingContent.slice(0, 4000)}

TARGET FORMAT: ${config.label} (${config.wordRange} words)
TARGET KEYWORD: "${existingKeyword}"
BRAND VOICE: ${brand.voiceTone || "Professional, clear, and authoritative"}
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}${styleContext}

Rewrite the content following this structure:
${config.structure}

Return ONLY this exact JSON with no additional text:
{
  "title": "<compelling, SEO-optimised title that includes the target keyword — 55-70 characters>",
  "target_keyword": "${existingKeyword}",
  "body_markdown": "<full repurposed content in valid markdown following the structure above>"
}

Requirements:
- Preserve the core insights and key messages from the original
- Adapt the format, tone, and structure to suit ${config.label}
- Write entirely in the brand voice described above
- Reference ${brand.companyName} 2-3 times naturally
- Content must feel fresh and purpose-built for this format, not just copy-pasted`;
}

export async function repurposeContentPiece(
  targetFormat: ContentFormatType,
  brand: BrandContext,
  existingContent: string,
  existingKeyword: string,
  userApiKey?: string | null,
): Promise<ContentPieceResult> {
  const prompt = buildRepurposePrompt(
    targetFormat,
    brand,
    existingContent,
    existingKeyword,
  );

  async function attemptGeneration(
    ai: AiProviderClient,
  ): Promise<ContentPieceResult> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.generate({
          prompt,
          systemInstruction: REPURPOSE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          thinkingBudget: 0,
        });
        const rawText = response.text;
        if (!rawText) throw new Error("Empty AI response");
        const parsed = cleanAndParse(rawText);
        validateResult(parsed);
        return parsed;
      } catch (err) {
        lastError = err;
        logger.warn(
          { err, attempt, targetFormat },
          "Repurpose generation attempt failed",
        );
        if (attempt < 3)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw lastError;
  }

  if (userApiKey) {
    try {
      const userClient = wrapGeminiClient(
        await createUserGeminiClient(userApiKey),
      );
      return await attemptGeneration(userClient);
    } catch (err) {
      if (isUserKeyError(err)) {
        logger.warn(
          { err },
          "User Gemini key failed for repurpose generation, falling back to platform key",
        );
      } else {
        throw err;
      }
    }
  }

  const client = await getAiProviderClient();
  return attemptGeneration(client);
}

export { type BrandContext };
