import { createHash } from "node:crypto";
import { logger } from "../core/logger";
import {
  wrapGeminiClient,
  createUserGeminiClient,
  isUserKeyError,
  resolveProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers";
import type { AiProviderClient } from "@workspace/ai-providers/client";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { assertAiGenerationEnabled } from "../support/publishing/platform-guard";
import { getCache } from "../core/cache";
import type { ContentFormatType, ContentStyle } from "@workspace/db";
import {
  SEO_SYSTEM_PROMPT,
  buildSeoLongformJsonSchema,
  buildSeoLongformRequirements,
  finalizeSeoContentPiece,
  isSeoLongformFormat,
  seoQualitySignals,
  type ContentPieceMetadata,
} from "./content-piece-seo";
import {
  brandVoiceCacheFingerprint,
  buildBrandVoicePromptContext,
  type UnifiedBrandContext,
} from "../brand/brand-voice";
import { loadBrandVoiceGenerationContext } from "../support/brand/brand-voice-generation";
import {
  buildPlatformVoicePromptContext,
  platformForFormat,
} from "../platform-voice";
import { humanizeContentPiece } from "./humanizer";
import { isHumanizableFormat } from "./humanize-eligibility";
import { AI_WRITING_FROM_SCRATCH_PROMPT, AI_WRITING_RULES_PROMPT } from "./ai-writing-rules";
import { buildDestinationPromptHint } from "../support/publishing/publishing-settings";
import {
  enrichContentPieceImages,
  parseImageSettings,
} from "../articles/article-image-enricher";
import { applyInfographicToContentPiece } from "./infographic-template";
import { loadStockCredentialContextForProject } from "../support/integrations/stock-credentials";
import {
  buildDeeplGenerationLanguageLine,
  maybeRefineWithDeepl,
} from "../support/integrations/deepl-refinement";
import { loadDeeplCredentialContextForProject } from "../support/integrations/deepl-credentials";
import { resolveDeeplApiKey } from "@workspace/deepl";
import { cleanAndParse } from "../core/utils";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "../support/competitor/competitor-url";

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
  meta_description?: string;
  secondary_keywords?: string[];
  faq_section?: { question: string; answer: string }[];
  citations?: { text: string; url: string; source: string }[];
  internal_link_suggestions?: {
    anchorText: string;
    suggestedSlug: string;
    rationale?: string;
  }[];
  json_ld_schema?: object;
  pieceMetadata?: ContentPieceMetadata & {
    secondaryKeywords?: string[];
  };
  generationUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export type ContentGenerationContext = {
  existingPieceTitles?: string[];
  intendedPublishPlatform?: string;
  intendedOutputMode?: string;
  intendedEditorMode?: "classic" | "gutenberg" | "elementor" | "divi";
  competitorPromptBlock?: string;
  competitorFocusUrl?: string;
  /** Per-piece competitor URLs (max 5); first is primary when focus omitted */
  competitorUrls?: string[];
};

export type BrandContext = UnifiedBrandContext;

async function resolveVoicePromptContext(
  brand: BrandContext,
  format: ContentFormatType,
  keyword: string,
  angleHint?: string,
): Promise<string> {
  const platform = platformForFormat(format);
  if (platform) {
    const platformVoice = buildPlatformVoicePromptContext(brand.platformVoices, platform);
    if (platformVoice.trim()) return platformVoice;
  }
  if (brand.projectId) {
    const ctx = await loadBrandVoiceGenerationContext(
      brand.projectId,
      `${keyword} ${format} ${angleHint ?? ""}`,
    );
    if (ctx?.promptContext.trim()) return ctx.promptContext;
  }
  return buildBrandVoicePromptContext(brand);
}

const SYSTEM_PROMPT = `You are a world-class SEO content strategist and writer. You produce authoritative, deeply researched content that ranks on Google and is cited by AI search tools like ChatGPT, Perplexity, and Claude.

Your content is brand-aligned, audience-specific, and actionable.

${AI_WRITING_FROM_SCRATCH_PROMPT}
${AI_WRITING_RULES_PROMPT}
- Outline templates are flexible guidance, not a fixed heading script: vary section names, order, and shape while keeping required SEO elements (FAQ, citations, schema) when specified.

You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation; only raw JSON.`;

const FORMAT_CONFIGS: Record<
  ContentFormatType,
  { label: string; wordRange: string; structure: string }
> = {
  blog_post: {
    label: "Blog Post",
    wordRange: "1400-1800",
    structure: `- Open on the claim (hook + premise, 2-3 sentences); no labeled intro
- One H2 on stakes or the cost of getting it wrong (~150-200 words); use a topic-specific heading, not stock phrases like "Why X Matters"
- 2-3 H2s on distinct angles (~200-250 words each); vary length and shape
- Practical application: numbered tips when helpful, or tips woven into prose
- Close on the last concrete takeaway (no "Conclusion" / "In conclusion" wrapper)`,
  },
  news_article: {
    label: "News Article",
    wordRange: "600-900",
    structure: `- Inverted pyramid: most important facts first
- Context on what led here (~150 words)
- What changed / key developments (~200 words)
- Sector impact with a specific actor or constraint (~150 words)
- What to watch next (~100 words)
- Journalistic, factual, timely tone; H2 names should fit the story, not a template`,
  },
  tutorial: {
    label: "Tutorial",
    wordRange: "1200-1600",
    structure: `- Intro: outcome readers will achieve plus prerequisites
- Setup/requirements as bullets when needed
- 3-5 sequential action H2s with concrete verb headings (~150-200 words each); avoid generic "Step 1" labels when a named action is clearer
- Pitfalls section when useful (~100-150 words)
- Short recap with next steps (no throat-clearing closer)`,
  },
  guide: {
    label: "Comprehensive Guide",
    wordRange: "1400-1800",
    structure: `- Brief overview of what the guide delivers
- Foundations H2 (~200-250 words) with a topic-specific name
- Friction / failure modes H2 (~200 words); be specific about what breaks
- Recommended approach H2 (~250 words); concrete steps, not filler "framework" language
- Implementation section with numbered steps when useful (~300 words)
- Tools/resources only if they add real value (~150 words)
- Worked example or scenario (~200 words)
- Tight close on the last useful point`,
  },
  whitepaper: {
    label: "Whitepaper",
    wordRange: "1800-2500",
    structure: `- Executive summary (~150 words)
- Cover these moves with topic-named H2s (numbering optional): problem, evidence/context, limits of current approaches, proposed approach, implementation, business case, recommendations
- Rough word budget: problem ~200, evidence ~300, limits ~250, approach ~350, implementation ~200, business case ~200, recommendations ~150
- Formal, authoritative tone; cite data and name sources. Avoid stock titles like "Industry Context & Data" unless they fit.`,
  },
  pillar_page: {
    label: "Pillar Page",
    wordRange: "2000-3000",
    structure: `- Hero intro that defines the topic space (~200 words)
- Definition/scope H2 with a specific heading (~200 words)
- Relevance/stakes H2 (~200 words) named for the audience, not "Why X Matters in [Year]"
- 3-4 deep-dive H2s on real subtopics (~300 words each); vary length and shape
- ## Frequently Asked Questions: 5 Q&A pairs (required)
- Tools/platforms when useful
- Getting-started close (~150 words)
- Evergreen hub: comprehensive, link-worthy content`,
  },
  location_page: {
    label: "Location/Language Page",
    wordRange: "800-1200",
    structure: `- Opening that names the location and the service/product in the first sentence
- Local market context H2 (~200 words)
- Local proof / fit H2 (~150 words) with concrete signals (not "Why [Location] Businesses Choose [Brand]")
- Location-specific insights (~200 words): data, trends, or constraints
- How the offer works in that market (~150 words)
- Local CTA close (~100 words)
- Weave landmarks, regulations, or market nuance throughout`,
  },
  infographic_outline: {
    label: "Infographic Outline",
    wordRange: "400-600",
    structure: `- ## Infographic Title: compelling, shareable headline
- ## Hook Statistic: 1-2 surprising data points to open with
- ## Section 1: [Label]: 3-4 bullet data points or facts
- ## Section 2: [Label]: 3-4 bullet data points or facts
- ## Section 3: [Label]: 3-4 bullet data points or facts
- ## Section 4: [Label]: 3-4 bullet data points or facts
- ## Key Takeaway: 1-2 sentence summary quote
- ## Call to Action: what the viewer should do next
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
- Tweet 2: Context: why this matters for founders right now
- Tweets 3-6: One insight per tweet. Start each with a number (2/, 3/, etc.). Short, punchy sentences.
- Tweet 7: The counterintuitive point most people miss
- Tweet 8: Practical 3-step framework or checklist
- Tweet 9 (close): Restate the core insight. Tell them to bookmark / retweet if useful.
- Each tweet ≤ 280 characters. Use line breaks for readability. Format as "1/ [text]\\n\\n2/ [text]" etc.`,
  },
  instagram_post: {
    label: "Instagram Post",
    wordRange: "150-300",
    structure: `- ## Caption (first 125 characters are visible before "more": make them count)
  - Hook: one striking sentence: a bold statement, relatable pain, or surprising fact
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
  bluesky_post: {
    label: "Bluesky Post",
    wordRange: "50-280",
    structure: `- Single post under 300 characters (Bluesky limit)
- Hook in the first line: opinion, insight, or question
- 1-2 short paragraphs max; plain text only (no markdown headings)
- Optional: 1-3 relevant hashtags at the end
- Conversational, punchy tone. No thread unless explicitly requested.`,
  },
  mastodon_post: {
    label: "Mastodon Post",
    wordRange: "50-500",
    structure: `- Single toot under 500 characters (or use content warning if longer concept)
- Hook first: direct statement or question for the fediverse
- Plain text; hashtags are discoverable on Mastodon: use 2-4 relevant tags
- Community-friendly, authentic tone; avoid engagement bait
- Optional content warning line if discussing sensitive topics`,
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
- ## Problem / Agitation: 2-3 short paragraphs naming the pain
- ## Solution Introduction: 2-3 paragraphs introducing the product/service
- ## Key Features (3-4 items)
  - Feature name + 1-sentence benefit description each
- ## Social Proof: 2 testimonial templates with [Name, Title, Company] placeholders
- ## FAQ (3 questions): anticipate objections
- ## Final CTA Section: headline + CTA button + urgency line`,
  },
  product_description: {
    label: "Product Description",
    wordRange: "300-500",
    structure: `- ## Product Name + Tagline (1 line)
- ## The 30-Second Pitch: 2-3 sentences: what it is, who it's for, the #1 benefit
- ## Key Benefits (3-5 bullet points): outcome-focused, not feature lists
- ## How It Works: 3-step simple explanation
- ## Who It's For: 2-3 customer personas or use cases
- ## Why Choose [Brand]: 2-3 differentiators vs. alternatives
- ## CTA: one clear next step`,
  },
  press_release: {
    label: "Press Release",
    wordRange: "500-700",
    structure: `- FOR IMMEDIATE RELEASE
- ## Headline: newsworthy, specific, keyword-rich (active voice)
- ## Subheadline: one sentence expanding the news
- [City, Date]: Opening paragraph: the 5 Ws (who, what, when, where, why) in 2-3 sentences
- ## Body Paragraph 1: context and significance of the announcement
- ## Quote from [CEO/Founder Name, Title, Company]: genuine-sounding, 2-3 sentences
- ## Body Paragraph 2: additional details, data points, or background
- ## About [Company Name]: 3-sentence boilerplate
- ### Media Contact: [Name] | [Email] | [Phone]`,
  },
  faq_article: {
    label: "FAQ / Knowledge Base",
    wordRange: "800-1200",
    structure: `- ## Introduction: 1 paragraph explaining what this FAQ covers and who it's for
- ## Frequently Asked Questions (8-12 questions)
  - Each Q&A follows this format:
    ### [Question phrased exactly as a user would type it]
    [Answer: 2-4 sentences. Clear, direct, jargon-free. Link to related resources where relevant.]
- Questions should progress from basic ("What is X?") to advanced ("How do I troubleshoot Y?")
- Include the target keyword naturally in at least 3 question/answer pairs
- ## Still Have Questions?: 1-paragraph close with CTA to contact support or book a demo`,
  },
};

/** Primary-first competitor URL hints for the generate prompt. */
function buildCompetitorUrlsPromptFragment(
  competitorUrls?: string[],
  focusUrl?: string,
): string {
  const urls = normalizeCompetitorUrlList(competitorUrls ?? []);
  if (urls.length === 0) return "";

  const primary =
    (focusUrl?.trim() ? normalizeCompetitorUrl(focusUrl) : null) ?? urls[0]!;
  const others = urls.filter((u) => hostFromUrl(u) !== hostFromUrl(primary));
  const lines = [
    "\nCOMPETITOR URLS FOR THIS PIECE:",
    `- Primary competitor to differentiate against: ${primary}`,
  ];
  if (others.length > 0) {
    lines.push(`- Additional competitors to account for: ${others.join(", ")}`);
  }
  return lines.join("\n");
}

async function buildPrompt(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  existingPieceTitles?: string[],
  generationContext?: ContentGenerationContext,
): Promise<string> {
  const config = FORMAT_CONFIGS[format];
  const destinationHint = buildDestinationPromptHint(
    generationContext?.intendedPublishPlatform,
    generationContext?.intendedOutputMode ?? generationContext?.intendedEditorMode,
  );
  const kwList =
    brand.primaryKeywords.length > 0
      ? brand.primaryKeywords.slice(0, 5).join(", ")
      : keyword;
  const wordRange = brand.contentStyle?.defaultWordCount
    ? `~${brand.contentStyle.defaultWordCount}`
    : config.wordRange;
  const brandVoiceContext = await resolveVoicePromptContext(brand, format, keyword, angleHint);
  const defaultVoice = brand.voiceTone?.trim() || "Professional, clear, and authoritative";
  const competitorContext = [
    generationContext?.competitorPromptBlock?.trim() ?? "",
    buildCompetitorUrlsPromptFragment(
      generationContext?.competitorUrls,
      generationContext?.competitorFocusUrl,
    ),
  ]
    .filter(Boolean)
    .join("");

  let languageLine = "";
  if (brand.projectId) {
    const deeplContext = await loadDeeplCredentialContextForProject(brand.projectId);
    const deeplConfigured = Boolean(resolveDeeplApiKey(deeplContext));
    languageLine = buildDeeplGenerationLanguageLine(brand.contentStyle, deeplConfigured);
    if (languageLine) {
      languageLine = `\n${languageLine}`;
    }
  }

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
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${brandVoiceContext || `BRAND VOICE: ${defaultVoice}`}
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
- Write like a founder speaking to peers - authentic and direct${competitorContext}${destinationHint}`;
  }

  if (isSeoLongformFormat(format)) {
    const existingArticlesCtx = existingPieceTitles?.length
      ? `\nExisting content on this site (use for internal links): ${existingPieceTitles.slice(0, 12).join("; ")}`
      : "";

    return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${angleHint ? `CONTENT ANGLE / TITLE HINT: ${angleHint}` : ""}${brandVoiceContext || `\nBRAND VOICE: ${defaultVoice}`}${languageLine}${existingArticlesCtx}

Write a complete, publish-ready ${wordRange}-word article. Use this outline as internal guidance only: do NOT copy these bullet labels, word counts, or placeholder headings into the output:
${config.structure}

Return ONLY this JSON object:
${buildSeoLongformJsonSchema(keyword)}

${buildSeoLongformRequirements(brand.companyName, keyword, wordRange)}${competitorContext}${destinationHint}`;
  }

  return `Create a ${config.label} for ${brand.companyName} (${brand.websiteUrl}), a company in the ${brand.industry} industry.

TARGET KEYWORD: "${keyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}
RELATED KEYWORDS TO WEAVE IN: ${kwList}
${angleHint ? `CONTENT ANGLE / TITLE HINT: ${angleHint}` : ""}${brandVoiceContext || `\nBRAND VOICE: ${defaultVoice}`}

Write a complete, publish-ready ${wordRange}-word piece. Use this outline as internal guidance only: do NOT copy outline labels into the output:
${config.structure}

Return ONLY this exact JSON with no additional text:
{
  "title": "<compelling title>",
  "target_keyword": "${keyword}",
  "body_markdown": "<full content in valid markdown>"
}

Requirements:
- Write real prose: never output planning notes or placeholder headings
- Write entirely in the brand voice described above
- Target the keyword "${keyword}" naturally throughout
- Reference ${brand.companyName} where appropriate without being promotional
- Content must be original and actionable${competitorContext}${destinationHint}`;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function buildCacheKey(
  format: string,
  keyword: string,
  brand: BrandContext,
  angleHint?: string,
  intendedPlatform?: string,
  competitorFocusUrl?: string,
  competitorUrls?: string[],
): string {
  const urlsKey = normalizeCompetitorUrlList(competitorUrls ?? []).join(",");
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
    intendedPlatform?.trim() ?? "",
    competitorFocusUrl?.trim() ?? "",
    urlsKey,
    brandVoiceCacheFingerprint(brand),
    "seo-v8",
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

function getAiGenerationOptions(format: ContentFormatType) {
  if (isSeoLongformFormat(format)) {
    return {
      systemInstruction: SEO_SYSTEM_PROMPT,
      maxOutputTokens: 16384,
      thinkingBudget: 2048,
    };
  }
  return {
    systemInstruction: SYSTEM_PROMPT,
    maxOutputTokens: 8192,
    thinkingBudget: 0,
  };
}

function processGeneratedResult(
  parsed: ContentPieceResult,
  format: ContentFormatType,
  humanized = false,
): ContentPieceResult {
  if (!isSeoLongformFormat(format)) return parsed;
  const finalized = finalizeSeoContentPiece(parsed);
  const signals = seoQualitySignals(finalized.body_markdown);
  if (signals.words < 700) {
    throw new Error("Generated SEO article too short");
  }
  if (humanized || parsed.pieceMetadata?.humanizationAudit) {
    finalized.pieceMetadata = {
      ...finalized.pieceMetadata,
      humanized: humanized || parsed.pieceMetadata?.humanized,
      humanizationAudit: parsed.pieceMetadata?.humanizationAudit,
    };
  }
  return finalized;
}

async function postProcessGeneratedResult(
  parsed: ContentPieceResult,
  format: ContentFormatType,
  brand: BrandContext,
  ai: AiProviderClient,
): Promise<ContentPieceResult> {
  const MAX_HUMANIZE_PASSES = 2;
  let humanizePasses = 0;
  let result: ContentPieceResult = parsed;

  if (isHumanizableFormat(format)) {
    const { result: humanizedResult, humanized } = await humanizeContentPiece(parsed, brand, {
      aiClient: ai,
    });
    humanizePasses += 1;
    result = isSeoLongformFormat(format)
      ? processGeneratedResult(humanizedResult, format, humanized)
      : {
          ...humanizedResult,
          pieceMetadata: {
            ...humanizedResult.pieceMetadata,
            humanized: humanized || humanizedResult.pieceMetadata?.humanized,
          },
        };
  }

  if (isSeoLongformFormat(format)) {
    const beforeDeeplBody = result.body_markdown;
    result = await maybeRefineWithDeepl(result, brand, format);
    const primaryLanguage = brand.contentStyle?.primaryLanguage ?? "en";
    const deeplChangedBody = result.body_markdown !== beforeDeeplBody;
    const needsPostDeeplHumanize =
      humanizePasses < MAX_HUMANIZE_PASSES &&
      (deeplChangedBody || primaryLanguage !== "en");

    if (needsPostDeeplHumanize) {
      const { result: humanizedResult, humanized } = await humanizeContentPiece(result, brand, {
        aiClient: ai,
        level: "light",
      });
      humanizePasses += 1;
      result = processGeneratedResult(humanizedResult, format, humanized);
    }
  }

  // Infographic first so enricher can rasterize visualSummary SVG→PNG (Node/sharp)
  // when stock featured is unavailable. Never leave SVG data URIs on featuredImageUrl.
  result = applyInfographicToContentPiece(result, format, brand.companyName);

  try {
    const stockCredentials = brand.projectId
      ? await loadStockCredentialContextForProject(brand.projectId)
      : undefined;
    const enriched = await enrichContentPieceImages(
      {
        title: result.title,
        target_keyword: result.target_keyword,
        body_markdown: result.body_markdown,
        formatType: format,
        pieceMetadata: result.pieceMetadata,
      },
      {
        imageSettings: parseImageSettings(brand.contentStyle),
        ai,
        brandName: brand.companyName,
        stockCredentials,
      },
    );
    result = {
      ...result,
      body_markdown: enriched.body_markdown,
      pieceMetadata: enriched.pieceMetadata,
    };
  } catch (err) {
    logger.warn({ err, format }, "Stock image enrichment skipped");
  }

  return result;
}

function validateResult(result: unknown, format: ContentFormatType): asserts result is ContentPieceResult {
  if (typeof result !== "object" || result === null)
    throw new Error("Result must be an object");
  const r = result as Record<string, unknown>;
  if (typeof r.title !== "string" || r.title.trim().length === 0)
    throw new Error("Missing title");
  if (typeof r.target_keyword !== "string")
    throw new Error("Missing target_keyword");
  const minLength = isSeoLongformFormat(format) ? 700 : 200;
  if (
    typeof r.body_markdown !== "string" ||
    r.body_markdown.trim().length < minLength
  )
    throw new Error("body_markdown too short");
}

function estimateUsageFromText(prompt: string, output: string) {
  const promptTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(output.length / 4);
  return { promptTokens, outputTokens, totalTokens: promptTokens + outputTokens };
}

async function generateWithClient(
  ai: AiProviderClient,
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  generationContext: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  const prompt = await buildPrompt(
    format,
    brand,
    keyword,
    angleHint,
    generationContext.existingPieceTitles,
    generationContext,
  );
  const aiOptions = getAiGenerationOptions(format);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.generate({
        prompt,
        systemInstruction: aiOptions.systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: aiOptions.maxOutputTokens,
        thinkingBudget: aiOptions.thinkingBudget,
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty AI response");

      const parsed = cleanAndParse(rawText);
      validateResult(parsed, format);
      const processed = await postProcessGeneratedResult(parsed, format, brand, ai);
      return {
        ...processed,
        generationUsage: response.usage ?? estimateUsageFromText(prompt, rawText),
      };
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
  generationContext: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  const prompt = await buildPrompt(
    format,
    brand,
    keyword,
    angleHint,
    generationContext.existingPieceTitles,
    generationContext,
  );
  const aiOptions = getAiGenerationOptions(format);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let accumulated = "";
      // Only emit chunks on the first attempt: retries are silent so no
      // duplicate/garbled text is written to an already-open SSE connection.
      const emit = attempt === 1 ? onChunk : () => {};

      if (ai.generateStream) {
        const stream = ai.generateStream({
          prompt,
          systemInstruction: aiOptions.systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: aiOptions.maxOutputTokens,
          thinkingBudget: aiOptions.thinkingBudget,
        });
        for await (const text of stream) {
          accumulated += text;
          if (text) emit(text);
        }
      } else {
        const result = await ai.generate({
          prompt,
          systemInstruction: aiOptions.systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: aiOptions.maxOutputTokens,
          thinkingBudget: aiOptions.thinkingBudget,
        });
        accumulated = result.text;
        emit(result.text);
      }

      const parsed = cleanAndParse(accumulated);
      validateResult(parsed, format);
      const processed = await postProcessGeneratedResult(parsed, format, brand, ai);
      return {
        ...processed,
        generationUsage: estimateUsageFromText(prompt, accumulated),
      };
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
  aiProviderOptions?: AiProviderOptions,
  context: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  await assertAiGenerationEnabled();
  if (userApiKey && resolveProviderId(aiProviderOptions) === "gemini") {
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
        context,
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

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return generateWithClientStream(
    client,
    format,
    brand,
    keyword,
    onChunk,
    angleHint,
    context,
  );
}

export async function generateContentPiece(
  format: ContentFormatType,
  brand: BrandContext,
  keyword: string,
  angleHint?: string,
  bypassCache = false,
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
  context: ContentGenerationContext = {},
): Promise<ContentPieceResult> {
  await assertAiGenerationEnabled();
  const key = buildCacheKey(
    format,
    keyword,
    brand,
    angleHint,
    context.intendedPublishPlatform,
    context.competitorFocusUrl,
    context.competitorUrls,
  );
  if (!bypassCache) {
    const cached = await cacheGet(key);
    if (cached) {
      logger.info({ format, keyword }, "Content piece served from cache");
      if (!isSeoLongformFormat(format)) return cached;
      // Re-finalize then re-attach infographic so visualSummaryMarkdown is not dropped.
      return applyInfographicToContentPiece(
        processGeneratedResult(cached, format),
        format,
        brand.companyName,
      );
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  const result = await generateWithClient(
    client,
    format,
    brand,
    keyword,
    angleHint,
    context,
  );
  await cacheSet(key, result);
  return result;
}

const REPURPOSE_SYSTEM_PROMPT = `You are a world-class content strategist and copywriter. You take existing content and expertly repurpose it into a different format while preserving the core insights and brand voice.

${AI_WRITING_RULES_PROMPT}

You MUST respond with a single valid JSON object and nothing else. No markdown code fences, no explanation; only raw JSON.`;

async function buildRepurposePrompt(
  targetFormat: ContentFormatType,
  brand: BrandContext,
  existingContent: string,
  existingKeyword: string,
  competitorPromptBlock?: string,
): Promise<string> {
  const config = FORMAT_CONFIGS[targetFormat];
  const brandVoiceContext = await resolveVoicePromptContext(
    brand,
    targetFormat,
    existingKeyword,
  );
  const defaultVoice = brand.voiceTone?.trim() || "Professional, clear, and authoritative";
  const competitorContext = competitorPromptBlock?.trim() ?? "";
  return `Repurpose the following existing content into a ${config.label} for ${brand.companyName} (${brand.websiteUrl}).

EXISTING CONTENT:
${existingContent.slice(0, 4000)}

TARGET FORMAT: ${config.label} (${config.wordRange} words)
TARGET KEYWORD: "${existingKeyword}"
TARGET AUDIENCE: ${brand.targetAudience || "Business professionals and decision makers"}${brandVoiceContext || `\nBRAND VOICE: ${defaultVoice}`}${competitorContext}

Rewrite the content following this structure:
${config.structure}

Return ONLY this exact JSON with no additional text:
{
  "title": "<compelling, SEO-optimised title that includes the target keyword: 55-70 characters>",
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
  aiProviderOptions?: AiProviderOptions,
  context: Pick<ContentGenerationContext, "competitorPromptBlock"> = {},
): Promise<ContentPieceResult> {
  const prompt = await buildRepurposePrompt(
    targetFormat,
    brand,
    existingContent,
    existingKeyword,
    context.competitorPromptBlock,
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
        validateResult(parsed, targetFormat);
        return postProcessGeneratedResult(parsed, targetFormat, brand, ai);
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

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return attemptGeneration(client);
}
