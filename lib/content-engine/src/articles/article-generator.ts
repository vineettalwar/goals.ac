import { getAiProviderClient, type AiProviderClient, type AiProviderOptions } from "@workspace/ai-providers";
import { cleanAndParse } from "../core/utils";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import {
  buildBrandVoicePromptContext,
  type UnifiedBrandContext,
} from "../brand/brand-voice";
import { loadBrandVoiceGenerationContext } from "../support/brand/brand-voice-generation";
import { AI_WRITING_RULES_PROMPT } from "../content/ai-writing-rules";

export interface ArticleInput {
  company: {
    name: string;
    websiteUrl: string;
    industry: string;
    description: string;
    targetAudience: string;
  };
  persona: {
    name: string;
    jobTitle: string;
    painPoints: string[];
    goals: string[];
    preferredContent: string[];
  } | null;
  keyword?: string;
  angle?: string;
  contentGoal?: string;
  tonePreference?: string;
  existingArticleTitles?: string[]; // for internal link suggestions
  brandVoice?: UnifiedBrandContext;
}

export interface Citation {
  text: string;       // anchor text used in article
  url: string;        // authoritative external URL
  source: string;     // source name e.g. "Harvard Business Review"
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface InternalLinkSuggestion {
  anchorText: string;      // text to hyperlink
  suggestedSlug: string;   // e.g. "/blog/keyword-research-guide"
  rationale: string;       // why this internal link matters
}

export interface GeneratedArticle {
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  bodyMarkdown: string;
  wordCount: number;
  readingTimeMinutes: number;
  searchIntent: "informational" | "navigational" | "commercial" | "transactional";
  faqSection: FaqItem[];
  citations: Citation[];
  internalLinkSuggestions: InternalLinkSuggestion[];
  jsonLdSchema: object;    // Article + FAQPage structured data
  personaAlignment: string; // 1-sentence: why this article matches the persona
  generationUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

const SYSTEM_PROMPT = `You are a world-class SEO strategist and content writer who produces editorial-quality articles that rank on Google and surface in AI search engines (ChatGPT, Perplexity, Claude).

Writing principles:
- Be specific, concrete, and direct. No vague generalities or padding.
- Use real-world examples, stats, named frameworks, and actionable steps
- Write naturally for humans. No AI-sounding filler.
- Structure with H2/H3 headings, short paragraphs, and scannable bullet lists
${AI_WRITING_RULES_PROMPT}
- Every claim that can be cited MUST be cited with a real, authoritative source (gov, university, industry research, named publications)
- Include a 4-6 item FAQ section targeting long-tail and "People Also Ask" queries
- The article must be worth bookmarking and sharing

Respond ONLY with a valid JSON object. No prose outside JSON.`;

export interface GenerateArticleOptions {
  aiClient?: AiProviderClient;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}

async function resolveArticleClient(options?: GenerateArticleOptions): Promise<AiProviderClient> {
  if (options?.aiClient) return options.aiClient;
  if (options?.userApiKey !== undefined || options?.aiProviderOptions) {
    return resolveAiClient(options?.userApiKey, options?.aiProviderOptions);
  }
  return getAiProviderClient();
}

export async function generateArticle(
  input: ArticleInput,
  options?: GenerateArticleOptions,
): Promise<GeneratedArticle> {
  const ai = await resolveArticleClient(options);

  const personaContext = input.persona
    ? `Target reader persona: ${input.persona.name} (${input.persona.jobTitle})
Pain points: ${input.persona.painPoints.slice(0, 3).join("; ")}
Goals: ${input.persona.goals.slice(0, 2).join("; ")}
Preferred content: ${input.persona.preferredContent.join(", ")}`
    : `Target reader: ${input.company.targetAudience}`;

  const keywordCtx = input.keyword
    ? `Primary keyword to rank for: "${input.keyword}"`
    : `Select the highest-value SEO keyword for ${input.company.name} in ${input.company.industry} based on the audience.`;

  const existingArticlesCtx = input.existingArticleTitles?.length
    ? `Existing published articles on this site (use for internal link suggestions): ${input.existingArticleTitles.slice(0, 10).join("; ")}`
    : "";

  const angleCtx = input.angle ? `Preferred angle for this draft: ${input.angle}` : "";
  const goalCtx = input.contentGoal ? `Business goal for this article: ${input.contentGoal}` : "";
  const toneCtx = input.tonePreference ? `Tone preference: ${input.tonePreference}` : "";
  let brandVoiceCtx = "";
  if (input.brandVoice) {
    if (input.brandVoice.projectId) {
      const ctx = await loadBrandVoiceGenerationContext(
        input.brandVoice.projectId,
        `${input.keyword ?? ""} article ${input.angle ?? ""}`,
      );
      brandVoiceCtx = ctx?.promptContext ?? buildBrandVoicePromptContext(input.brandVoice);
    } else {
      brandVoiceCtx = buildBrandVoicePromptContext(input.brandVoice);
    }
  }

  const prompt = `Write a detailed 1400-1800 word SEO article for ${input.company.name} (${input.company.websiteUrl}), a ${input.company.industry} company.

Company description: ${input.company.description}
${personaContext}
${keywordCtx}
${existingArticlesCtx}
${angleCtx}
${goalCtx}
${toneCtx}
${brandVoiceCtx}

Return a JSON object with these EXACT fields:

- title: string — compelling, SEO-optimized H1 headline
- metaDescription: string — 150-160 chars, includes primary keyword, drives clicks
- primaryKeyword: string — main keyword this article targets
- secondaryKeywords: string[] — 4-6 related/LSI keywords woven naturally into the article
- bodyMarkdown: string — full article in Markdown (## H2, ### H3, - bullets). 1400-1800 words. Must include at minimum: an intro paragraph, 4-6 H2 sections with detail, a short conclusion. Embed citations inline using [Source Name](URL) format.
- wordCount: number
- readingTimeMinutes: number
- searchIntent: "informational" | "navigational" | "commercial" | "transactional"
- faqSection: array of { question: string, answer: string } — 4-6 FAQs targeting PAA and long-tail queries around the primary keyword
- citations: array of { text: string, url: string, source: string } — 4-8 real authoritative sources cited in the article (use .gov, .edu, named publications, industry research). Use REAL URLs.
- internalLinkSuggestions: array of { anchorText: string, suggestedSlug: string, rationale: string } — 3-5 internal link opportunities using contextually relevant anchor text
- jsonLdSchema: object — valid JSON-LD combining Article schema and FAQPage schema based on the article content
- personaAlignment: string — one sentence explaining exactly why this article addresses the target persona's core need`;

  const response = await ai.generate({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: "application/json",
    maxOutputTokens: 16384,
    thinkingBudget: 2048,
  });

  const raw = response.text ?? "";
  return cleanAndParse<GeneratedArticle>(raw);
}
