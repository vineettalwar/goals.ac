import { getAiProviderClient, type AiProviderClient, type AiProviderOptions } from "@workspace/ai-providers";
import type { ContentFormatType } from "@workspace/db";
import type { PlatformVoices } from "@workspace/db/schema";
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
import { scoreArticleQuality } from "../articles/article-quality-score";
import {
  buildPlatformVoicePromptContext,
  PLATFORM_CHAR_LIMITS,
  PLATFORM_LABELS,
  platformForFormat,
  type SocialPlatformId,
} from "../platform-voice";

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
  /** When set, inject platform-voice presets + char limits for social formats. */
  formatType?: ContentFormatType;
  platformVoices?: PlatformVoices | null;
}

/** Default tone hints when no trained platform voice exists. */
const PLATFORM_HUMANIZE_PRESETS: Record<SocialPlatformId, string> = {
  linkedin:
    "LinkedIn: professional but direct; short paragraphs; one clear insight; soft CTA; no hashtag spam.",
  twitter:
    "X/Twitter: punchy; one idea per tweet; thread-friendly line breaks; stay under the char limit.",
  instagram:
    "Instagram: caption-first; hook in line 1; line breaks for scanability; light emoji only if natural; CTA in last line.",
  facebook:
    "Facebook: conversational; community tone; one ask or share prompt; avoid hard-sell openers.",
  bluesky:
    "Bluesky: concise AT Proto post; plain language; under 300 graphemes; no thread padding.",
  mastodon:
    "Mastodon: instance-friendly toot; clear CW-safe language; under 500 chars; no engagement bait.",
};

function buildSocialPlatformPromptBlock(
  formatType: ContentFormatType | undefined,
  voices: PlatformVoices | null | undefined,
): string {
  if (!formatType) return "";
  const platform = platformForFormat(formatType);
  if (!platform) return "";

  const label = PLATFORM_LABELS[platform];
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const trained = buildPlatformVoicePromptContext(voices, platform).trim();
  const preset = PLATFORM_HUMANIZE_PRESETS[platform];

  return [
    `Social platform: ${label} (hard max ~${limit} characters for the full post body).`,
    preset,
    trained || null,
    `Stay within ${limit} characters after rewrite. Prefer cutting fluff over truncating mid-sentence.`,
  ]
    .filter(Boolean)
    .join("\n");
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

/** Minimum human-voice score (0–15 scale) after a successful rewrite. */
export const HUMANIZE_HUMAN_VOICE_FLOOR = 4;

function buildAudit(
  level: HumanizationLevel,
  slopScoreBefore: number,
  slopScoreAfter: number,
  rejected = false,
  reason?: string,
): HumanizationAudit {
  return {
    slopScoreBefore,
    slopScoreAfter,
    humanizationLevel: level,
    rejected,
    ...(reason ? { reason } : {}),
    tellsFixed: Math.max(0, slopScoreBefore - slopScoreAfter),
  };
}

function countFaqItemsInBody(markdown: string): number {
  const faqSection = markdown.match(/##\s*(?:FAQ|Frequently Asked Questions)[\s\S]*/i)?.[0] ?? "";
  const target = faqSection || markdown;
  const h3 = (target.match(/^###\s+.+\?/gm) ?? []).length;
  const bold = (target.match(/^\*\*.+\?\*\*/gm) ?? []).length;
  return Math.max(h3, bold);
}

function hasFaqHeading(markdown: string): boolean {
  return /^##\s*(?:FAQ|Frequently Asked Questions)\b/im.test(markdown);
}

function countH2(markdown: string): number {
  return (markdown.match(/^##\s+/gm) ?? []).length;
}

/**
 * Structure guards: headings, body links, FAQ block, citation URLs, H2 floor.
 * Pure — unit-tested without calling the model.
 */
export function passesHumanizeStructureGuards(
  original: string,
  rewritten: string,
  citationUrls: string[] = [],
): { ok: true } | { ok: false; reason: string } {
  if (hasFaqHeading(original)) {
    if (!hasFaqHeading(rewritten)) {
      return { ok: false, reason: "FAQ guard" };
    }
    const beforeFaq = countFaqItemsInBody(original);
    if (beforeFaq > 0 && countFaqItemsInBody(rewritten) < beforeFaq) {
      return { ok: false, reason: "FAQ guard" };
    }
  }

  const originalHeadings = extractHeadings(original);
  const rewrittenHeadings = extractHeadings(rewritten);
  if (rewrittenHeadings.length < originalHeadings.length) {
    return { ok: false, reason: "heading guard" };
  }

  const originalH2 = countH2(original);
  if (originalH2 > 0 && countH2(rewritten) < originalH2) {
    return { ok: false, reason: "H2 floor" };
  }

  const originalUrls = extractLinkUrls(original);
  const rewrittenUrls = new Set(extractLinkUrls(rewritten));
  if (!originalUrls.every((url) => rewrittenUrls.has(url))) {
    return { ok: false, reason: "link guard" };
  }

  for (const url of citationUrls) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    if (!rewrittenUrls.has(trimmed) && !rewritten.includes(trimmed)) {
      return { ok: false, reason: "citation guard" };
    }
  }

  return { ok: true };
}

/**
 * Quality gate: slop must improve when tells existed; human-voice must clear floor.
 * Pure — unit-tested without calling the model.
 */
export function passesHumanizeQualityGate(
  bodyBefore: string,
  bodyAfter: string,
  slopBefore: number,
  slopAfter: number,
  opts: { skipHumanVoiceFloor?: boolean } = {},
): { ok: true } | { ok: false; reason: string } {
  if (slopBefore > 0 && slopAfter >= slopBefore) {
    return { ok: false, reason: "no slop improvement" };
  }

  if (opts.skipHumanVoiceFloor) {
    return { ok: true };
  }

  const voiceAfter =
    scoreArticleQuality({ bodyMarkdown: bodyAfter }).breakdown.find(
      (row) => row.label === "Human voice",
    )?.score ?? 0;

  if (voiceAfter < HUMANIZE_HUMAN_VOICE_FLOOR) {
    const voiceBefore =
      scoreArticleQuality({ bodyMarkdown: bodyBefore }).breakdown.find(
        (row) => row.label === "Human voice",
      )?.score ?? 0;
    // Reject when we fall under the floor from above, or when voice got worse while under it.
    if (voiceBefore >= HUMANIZE_HUMAN_VOICE_FLOOR || voiceAfter < voiceBefore) {
      return { ok: false, reason: "human-voice floor" };
    }
  }

  return { ok: true };
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

    const socialCtx = buildSocialPlatformPromptBlock(
      opts.formatType,
      opts.platformVoices ?? opts.brandVoice?.platformVoices,
    );

    const prompt = `Rewrite the following article draft to read human.

${intensityCtx}
${tellCtx}
${voiceCtx}
${socialCtx}

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
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "parse failed"),
        changed: false,
      };
    }

    const socialPlatform = opts.formatType ? platformForFormat(opts.formatType) : null;
    const citationUrls = (article.citations ?? []).map((c) => c.url).filter(Boolean);
    const structure = passesHumanizeStructureGuards(
      article.bodyMarkdown,
      parsed.bodyMarkdown,
      citationUrls,
    );
    if (!structure.ok) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, structure.reason),
        changed: false,
      };
    }

    const rewrittenWordCount = countWords(parsed.bodyMarkdown);
    // Long-form: stay near original length. Social: char limit is the contract.
    if (
      !socialPlatform &&
      article.wordCount > 0 &&
      (rewrittenWordCount < article.wordCount * 0.8 || rewrittenWordCount > article.wordCount * 1.25)
    ) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "length guard"),
        changed: false,
      };
    }

    const sanitizedBody = sanitizeAiProse(parsed.bodyMarkdown);
    if (socialPlatform) {
      const limit = PLATFORM_CHAR_LIMITS[socialPlatform];
      if (sanitizedBody.length > limit) {
        return {
          article,
          audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "platform length"),
          changed: false,
        };
      }
    }

    const structureAfterSanitize = passesHumanizeStructureGuards(
      article.bodyMarkdown,
      sanitizedBody,
      citationUrls,
    );
    if (!structureAfterSanitize.ok) {
      return {
        article,
        audit: buildAudit(
          opts.level,
          slopScoreBefore,
          slopScoreBefore,
          true,
          structureAfterSanitize.reason,
        ),
        changed: false,
      };
    }

    const slopScoreAfter = countAiSlopSignals(sanitizedBody);
    const quality = passesHumanizeQualityGate(
      article.bodyMarkdown,
      sanitizedBody,
      slopScoreBefore,
      slopScoreAfter,
      { skipHumanVoiceFloor: Boolean(socialPlatform) },
    );
    if (!quality.ok) {
      return {
        article,
        audit: buildAudit(opts.level, slopScoreBefore, slopScoreAfter, true, quality.reason),
        changed: false,
      };
    }

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
      audit: buildAudit(opts.level, slopScoreBefore, slopScoreBefore, true, "humanize error"),
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
      // Overwrite any earlier snapshot with the body just before this pass.
      preHumanizeBodyMarkdown: original.body_markdown,
    },
  };
}

export async function humanizeContentPiece<T extends HumanizableContentPiece>(
  result: T,
  brand: UnifiedBrandContext,
  opts: Omit<HumanizeOptions, "level" | "writingSample" | "brandVoice"> & {
    level?: HumanizationLevel;
    formatType?: ContentFormatType;
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
    formatType: opts.formatType,
    platformVoices: opts.platformVoices ?? brand.platformVoices,
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
