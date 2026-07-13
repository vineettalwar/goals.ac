import { getAiProviderClient, type AiProviderClient, type AiProviderOptions } from "@workspace/ai-providers";
import { cleanAndParse } from "./utils";
import type { GeneratedArticle } from "./article-generator";
import { resolveAiClient } from "./support/resolve-ai-client";
import {
  buildBrandVoicePromptContext,
  resolveHumanizationLevel,
  resolveWritingSample,
  type HumanizationLevel,
  type UnifiedBrandContext,
} from "./brand-voice";
import { loadBrandVoiceGenerationContext } from "./support/brand-voice-generation";
import { bodyWordCount } from "./content-piece-seo";
import {
  AI_WRITING_REWRITE_RULES_PROMPT,
  sanitizeAiProse,
} from "./ai-writing-rules";

export interface HumanizableContentPiece {
  title: string;
  target_keyword: string;
  body_markdown: string;
  meta_description?: string;
  faq_section?: { question: string; answer: string }[];
  citations?: { text: string; url: string; source: string }[];
  internal_link_suggestions?: {
    anchorText: string;
    suggestedSlug: string;
    rationale?: string;
  }[];
  json_ld_schema?: object;
  pieceMetadata?: {
    metaDescription?: string;
    faqSection?: { question: string; answer: string }[];
    citations?: { text: string; url: string; source: string }[];
    internalLinkSuggestions?: {
      anchorText: string;
      suggestedSlug: string;
      rationale?: string;
    }[];
    jsonLdSchema?: object;
    humanized?: boolean;
  };
}

export type { HumanizationLevel };

export interface HumanizeOptions {
  level: HumanizationLevel;
  writingSample?: string;
  brandVoice?: UnifiedBrandContext;
  aiClient?: AiProviderClient;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}

interface HumanizedOutput {
  bodyMarkdown: string;
  metaDescription: string;
  wordCount: number;
}

const SYSTEM_PROMPT = `You are a senior human editor. Your job is to rewrite AI-generated article drafts so they read like they were written by an experienced human writer, while preserving the article's SEO structure exactly.

Rewrite rules:
- Vary sentence length: mix short punchy sentences with longer ones. Break up monotonous rhythm.
- Use contractions naturally (it's, don't, you're, we've).
- Prefer concrete, specific phrasing over abstract filler.
- Use first/second person where it fits the context.
${AI_WRITING_REWRITE_RULES_PROMPT}
- Never sound like marketing copy reading its own press release.

You MUST preserve, character-for-character where noted:
- Every H2 (##) and H3 (###) heading: keep the exact heading text and order.
- Every Markdown link [anchor](url): keep every citation link with its exact URL. You may lightly adjust surrounding prose but the links themselves must all survive.
- The primary keyword and secondary keywords: they must still appear naturally in the text.
- Bullet lists may be reworded but not removed.
- Overall word count must stay within ±10% of the original.
- Do NOT add new sections, new claims, or new facts. Do NOT remove information.

Respond ONLY with a valid JSON object. No prose outside JSON.`;

async function resolveHumanizerClient(opts: HumanizeOptions): Promise<AiProviderClient> {
  if (opts.aiClient) return opts.aiClient;
  if (opts.userApiKey !== undefined || opts.aiProviderOptions) {
    return resolveAiClient(opts.userApiKey, opts.aiProviderOptions);
  }
  return getAiProviderClient();
}

export async function humanizeArticle(
  article: GeneratedArticle,
  opts: HumanizeOptions,
): Promise<GeneratedArticle> {
  try {
    const ai = await resolveHumanizerClient(opts);

    const intensityCtx =
      opts.level === "strong"
        ? `Intensity: STRONG. Do a full rewrite of the voice — restructure sentences and paragraphs freely (within the preservation rules), inject personality and directness, as if a sharp human editor rewrote the whole draft in their own words.`
        : `Intensity: LIGHT. Polish rhythm and word choice — fix robotic cadence, swap AI-tell phrases, add contractions, vary sentence length. Keep the original sentences where they already read naturally.`;

    const voiceCtx = await (async () => {
      const sample =
        opts.writingSample?.trim() || (opts.brandVoice ? resolveWritingSample(opts.brandVoice) : undefined);
      let brandVoiceCtx = "";
      if (opts.brandVoice) {
        if (opts.brandVoice.projectId) {
          const ctx = await loadBrandVoiceGenerationContext(
            opts.brandVoice.projectId,
            `${article.primaryKeyword} humanize`,
          );
          brandVoiceCtx = ctx?.promptContext ?? buildBrandVoicePromptContext(opts.brandVoice);
        } else {
          brandVoiceCtx = buildBrandVoicePromptContext(opts.brandVoice);
        }
      }
      const sampleCtx = sample
        ? `Mimic the cadence, diction, and tone of this writing sample from the author (do NOT copy its content, only its voice):
---WRITING SAMPLE START---
${sample.slice(0, 4000)}
---WRITING SAMPLE END---`
        : "";
      return [brandVoiceCtx.trim(), sampleCtx].filter(Boolean).join("\n\n");
    })();

    const prompt = `Rewrite the following article draft to read human.

${intensityCtx}
${voiceCtx}

Primary keyword (must remain present): "${article.primaryKeyword}"
Secondary keywords (must remain present): ${article.secondaryKeywords.join(", ")}
Original word count: ${article.wordCount} (stay within ±10%)

Meta description to also rewrite (150-160 chars, keep the primary keyword):
${article.metaDescription}

Article body (Markdown):
${article.bodyMarkdown}

Return a JSON object with these EXACT fields:
- bodyMarkdown: string — the rewritten article body in Markdown, with all headings and citation links preserved
- metaDescription: string — the rewritten meta description, 150-160 chars, includes the primary keyword
- wordCount: number — word count of the rewritten body`;

    const response = await ai.generate({
      prompt,
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      maxOutputTokens: 16384,
      thinkingBudget: 1024,
    });

    const raw = response.text ?? "";
    const parsed = cleanAndParse<HumanizedOutput>(raw);

    if (!parsed.bodyMarkdown || typeof parsed.bodyMarkdown !== "string") {
      return article;
    }

    // Safety checks: reject the rewrite if it dropped structure we must preserve.
    const originalHeadings = extractHeadings(article.bodyMarkdown);
    const rewrittenHeadings = extractHeadings(parsed.bodyMarkdown);
    if (rewrittenHeadings.length < originalHeadings.length) {
      return article;
    }

    const originalUrls = extractLinkUrls(article.bodyMarkdown);
    const rewrittenUrls = new Set(extractLinkUrls(parsed.bodyMarkdown));
    if (!originalUrls.every((url) => rewrittenUrls.has(url))) {
      return article;
    }

    const rewrittenWordCount = countWords(parsed.bodyMarkdown);
    if (
      article.wordCount > 0 &&
      (rewrittenWordCount < article.wordCount * 0.8 || rewrittenWordCount > article.wordCount * 1.25)
    ) {
      return article;
    }

    return {
      ...article,
      bodyMarkdown: sanitizeAiProse(parsed.bodyMarkdown),
      metaDescription:
        typeof parsed.metaDescription === "string" && parsed.metaDescription.length > 0
          ? sanitizeAiProse(parsed.metaDescription)
          : article.metaDescription,
      wordCount: rewrittenWordCount,
    };
  } catch {
    // Humanization must never break generation — fall back to the original article.
    return article;
  }
}

function extractHeadings(markdown: string): string[] {
  return markdown.split("\n").filter((line) => /^#{2,3}\s/.test(line.trim()));
}

function extractLinkUrls(markdown: string): string[] {
  const urls: string[] = [];
  const regex = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function contentPieceToGeneratedArticle(result: HumanizableContentPiece): GeneratedArticle {
  const body = result.body_markdown ?? "";
  const meta =
    result.meta_description ??
    result.pieceMetadata?.metaDescription ??
    "";
  return {
    title: result.title,
    metaDescription: meta,
    primaryKeyword: result.target_keyword,
    secondaryKeywords: [],
    bodyMarkdown: body,
    wordCount: bodyWordCount(body),
    readingTimeMinutes: Math.max(1, Math.ceil(bodyWordCount(body) / 200)),
    searchIntent: "informational",
    faqSection: result.faq_section ?? result.pieceMetadata?.faqSection ?? [],
    citations: result.citations ?? result.pieceMetadata?.citations ?? [],
    internalLinkSuggestions: (
      result.internal_link_suggestions ?? result.pieceMetadata?.internalLinkSuggestions ?? []
    ).map((link) => ({
      anchorText: link.anchorText,
      suggestedSlug: link.suggestedSlug,
      rationale: link.rationale ?? "",
    })),
    jsonLdSchema: result.json_ld_schema ?? result.pieceMetadata?.jsonLdSchema ?? {},
    personaAlignment: "",
  };
}

export function applyGeneratedArticleToContentPiece<T extends HumanizableContentPiece>(
  original: T,
  humanized: GeneratedArticle,
): T {
  return {
    ...original,
    body_markdown: humanized.bodyMarkdown,
    meta_description: humanized.metaDescription,
    pieceMetadata: {
      ...original.pieceMetadata,
      metaDescription: humanized.metaDescription,
      humanized: true,
    },
  };
}

export async function humanizeContentPiece<T extends HumanizableContentPiece>(
  result: T,
  brand: UnifiedBrandContext,
  opts: Omit<HumanizeOptions, "level" | "writingSample" | "brandVoice"> & {
    level?: HumanizationLevel;
  } = {},
): Promise<{ result: T; humanized: boolean }> {
  const level = opts.level ?? resolveHumanizationLevel(brand);
  if (level === "off") return { result, humanized: false };

  const before = result.body_markdown;
  const article = contentPieceToGeneratedArticle(result);
  const rewritten = await humanizeArticle(article, {
    ...opts,
    level,
    writingSample: resolveWritingSample(brand),
    brandVoice: brand,
  });

  if (rewritten.bodyMarkdown === before) {
    return { result, humanized: false };
  }

  return {
    result: applyGeneratedArticleToContentPiece(result, rewritten),
    humanized: true,
  };
}
