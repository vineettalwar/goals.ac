import { getAiProviderClient, type AiProviderClient, type AiProviderOptions } from "@workspace/ai-providers";
import { cleanAndParse } from "../core/utils";
import type { GeneratedArticle } from "../articles/article-generator";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import {
  buildBrandVoicePromptContext,
  resolveHumanizationLevel,
  resolveWritingSample,
  type HumanizationLevel,
  type UnifiedBrandContext,
} from "../brand/brand-voice";
import { loadBrandVoiceGenerationContext } from "../support/brand/brand-voice-generation";
import { bodyWordCount, type ContentPieceMetadata, type HumanizationAudit } from "./content-piece-seo";
import {
  AI_WRITING_REWRITE_RULES_PROMPT,
  countAiSlopSignals,
  diagnoseAiTells,
  formatAiTellDiagnosisSummary,
  sanitizeAiProse,
} from "./ai-writing-rules";

export interface HumanizableContentPiece {
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
}

export type { HumanizationLevel };

export type { HumanizationAudit } from "./content-piece-seo";

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

export type HumanizeArticleResult = {
  article: GeneratedArticle;
  audit: HumanizationAudit;
  changed: boolean;
};

const SYSTEM_PROMPT = `You are a senior human editor. Rewrite AI-generated drafts so they read like an experienced human wrote them, while preserving SEO structure exactly.

Work in two ordered passes inside your rewrite:
Pass 1 — SUBTRACT:
- Delete generic intros and conclusions. Start on the actual point; end on the last real thing you have to say.
- Cut buzzwords, abstract noun fog, corporate verbs, and filler transitions.
- Break uniform section shapes where safe (one section can run long, another short).

Pass 2 — ADD specificity and voice:
- Replace generic phrasing with concrete, specific language already supported by the draft.
- Commit to claims instead of hedging where the draft allows.
- Vary sentence length deliberately: mix short punchy sentences with longer ones.
- Use contractions naturally (it's, don't, you're, we've).
- Use first/second person where it fits the context.
- Litmus test: if a sentence could appear verbatim in a thousand articles, make it specific or cut it.

${AI_WRITING_REWRITE_RULES_PROMPT}
- Never sound like marketing copy reading its own press release.
- Never fabricate statistics, quotes, or anecdotes.

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

function buildAudit(
  level: HumanizationLevel,
  slopScoreBefore: number,
  slopScoreAfter: number,
  rejected = false,
): HumanizationAudit {
  return {
    slopScoreBefore,
    slopScoreAfter,
    humanizationLevel: level,
    rejected,
    tellsFixed: Math.max(0, slopScoreBefore - slopScoreAfter),
  };
}

export async function humanizeArticle(
  article: GeneratedArticle,
  opts: HumanizeOptions,
): Promise<HumanizeArticleResult> {
  const slopScoreBefore = countAiSlopSignals(article.bodyMarkdown);
  const diagnosisSummary = formatAiTellDiagnosisSummary(diagnoseAiTells(article.bodyMarkdown));

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

    const tellCtx = diagnosisSummary
      ? `\nFix these detected AI tells in the draft:\n${diagnosisSummary}\n`
      : "";

    const prompt = `Rewrite the following article draft to read human.

${intensityCtx}
${tellCtx}
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
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true),
        changed: false,
      };
    }

    const originalHeadings = extractHeadings(article.bodyMarkdown);
    const rewrittenHeadings = extractHeadings(parsed.bodyMarkdown);
    if (rewrittenHeadings.length < originalHeadings.length) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true),
        changed: false,
      };
    }

    const originalUrls = extractLinkUrls(article.bodyMarkdown);
    const rewrittenUrls = new Set(extractLinkUrls(parsed.bodyMarkdown));
    if (!originalUrls.every((url) => rewrittenUrls.has(url))) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true),
        changed: false,
      };
    }

    const rewrittenWordCount = countWords(parsed.bodyMarkdown);
    if (
      article.wordCount > 0 &&
      (rewrittenWordCount < article.wordCount * 0.8 || rewrittenWordCount > article.wordCount * 1.25)
    ) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true),
        changed: false,
      };
    }

    const sanitizedBody = sanitizeAiProse(parsed.bodyMarkdown);
    const slopScoreAfter = countAiSlopSignals(sanitizedBody);
    const rewritten: GeneratedArticle = {
      ...article,
      bodyMarkdown: sanitizedBody,
      metaDescription:
        typeof parsed.metaDescription === "string" && parsed.metaDescription.length > 0
          ? sanitizeAiProse(parsed.metaDescription)
          : article.metaDescription,
      wordCount: rewrittenWordCount,
    };

    return {
      article: rewritten,
      audit: buildAudit(opts.level, slopScoreBefore, slopScoreAfter, false),
      changed: sanitizedBody !== article.bodyMarkdown,
    };
  } catch {
    return {
      article,
      audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true),
      changed: false,
    };
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

const SECONDARY_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "your",
  "our",
  "how",
  "what",
  "why",
  "when",
  "from",
  "into",
  "about",
  "guide",
  "best",
  "top",
]);

function normalizeKeywordList(values: string[] | undefined | null): string[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Light related terms from title/body when metadata has no secondary keywords. */
function deriveRelatedTerms(title: string, body: string, primaryKeyword: string): string[] {
  const primary = primaryKeyword.trim().toLowerCase();
  const pool = `${title} ${body.slice(0, 400)}`;
  const tokens = pool
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !SECONDARY_STOP_WORDS.has(token));

  const seen = new Set<string>();
  const related: string[] = [];
  for (const token of tokens) {
    if (token === primary || primary.includes(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    related.push(token);
    if (related.length >= 4) break;
  }
  return related;
}

function resolveSecondaryKeywords(result: HumanizableContentPiece): string[] {
  const fromField = normalizeKeywordList(result.secondary_keywords);
  if (fromField.length > 0) return fromField;

  const fromMeta = normalizeKeywordList(result.pieceMetadata?.secondaryKeywords);
  if (fromMeta.length > 0) return fromMeta;

  return deriveRelatedTerms(result.title, result.body_markdown ?? "", result.target_keyword);
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
    secondaryKeywords: resolveSecondaryKeywords(result),
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
  audit: HumanizationAudit,
): T {
  return {
    ...original,
    body_markdown: humanized.bodyMarkdown,
    meta_description: humanized.metaDescription,
    pieceMetadata: {
      ...original.pieceMetadata,
      metaDescription: humanized.metaDescription,
      humanized: true,
      humanizationAudit: audit,
    },
  };
}

export async function humanizeContentPiece<T extends HumanizableContentPiece>(
  result: T,
  brand: UnifiedBrandContext,
  opts: Omit<HumanizeOptions, "level" | "writingSample" | "brandVoice"> & {
    level?: HumanizationLevel;
  } = {},
): Promise<{ result: T; humanized: boolean; audit?: HumanizationAudit }> {
  const level = opts.level ?? resolveHumanizationLevel(brand);
  if (level === "off") return { result, humanized: false };

  const before = result.body_markdown;
  const article = contentPieceToGeneratedArticle(result);
  const { article: rewritten, audit, changed } = await humanizeArticle(article, {
    ...opts,
    level,
    writingSample: resolveWritingSample(brand),
    brandVoice: brand,
  });

  if (!changed || rewritten.bodyMarkdown === before) {
    return {
      result: {
        ...result,
        pieceMetadata: {
          ...result.pieceMetadata,
          humanizationAudit: audit,
        },
      },
      humanized: false,
      audit,
    };
  }

  return {
    result: applyGeneratedArticleToContentPiece(result, rewritten, audit),
    humanized: true,
    audit,
  };
}
