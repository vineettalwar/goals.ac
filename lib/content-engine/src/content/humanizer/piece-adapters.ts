import type { ContentFormatType } from "@workspace/db";
import type { GeneratedArticle } from "../../articles/article-generator";
import {
  resolveHumanizationLevel,
  resolveWritingSample,
  type HumanizationLevel,
  type UnifiedBrandContext,
} from "../../brand/brand-voice";
import { countAiSlopSignals, sanitizeAiProse } from "../ai-writing-rules";
import { bodyWordCount, type HumanizationAudit } from "../content-piece-seo";
import { humanizeArticle } from "./humanize-article";
import { buildAudit, passesHumanizeQualityGate, passesHumanizeStructureGuards } from "./guards";
import { resolveSecondaryKeywords } from "./text-utils";
import type { HumanizableContentPiece, HumanizeOptions } from "./types";

/**
 * When the model rewrite is discarded, still persist a useful result:
 * strip slop phrases if that passes guards, otherwise mark clean drafts as done
 * so the publish checklist is not stuck on an amber Humanize chip.
 */
export function recoverHumanizeWhenUnchanged(
  body: string,
  audit?: HumanizationAudit,
): { body: string; humanized: boolean; audit?: HumanizationAudit } {
  const slopBefore = audit?.slopScoreBefore ?? countAiSlopSignals(body);
  const sanitized = sanitizeAiProse(body);
  if (sanitized !== body) {
    const slopAfter = countAiSlopSignals(sanitized);
    const structure = passesHumanizeStructureGuards(body, sanitized);
    const quality = passesHumanizeQualityGate(body, sanitized, slopBefore, slopAfter, {
      skipHumanVoiceFloor: true,
    });
    if (structure.ok && quality.ok) {
      return {
        body: sanitized,
        humanized: true,
        audit: buildAudit(audit?.humanizationLevel ?? "light", slopBefore, slopAfter, false),
      };
    }
  }
  return { body, humanized: slopBefore === 0, audit };
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
  if (level === "off") {
    return {
      result: {
        ...result,
        pieceMetadata: {
          ...result.pieceMetadata,
          humanizeSkippedReason: "humanize off",
        },
      },
      humanized: false,
    };
  }

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
    const recovered = recoverHumanizeWhenUnchanged(before, audit);
    if (recovered.humanized && recovered.body !== before) {
      return {
        result: applyGeneratedArticleToContentPiece(
          result,
          { ...article, bodyMarkdown: recovered.body, wordCount: bodyWordCount(recovered.body) },
          recovered.audit!,
        ),
        humanized: true,
        audit: recovered.audit,
      };
    }
    return {
      result: {
        ...result,
        pieceMetadata: {
          ...result.pieceMetadata,
          humanizationAudit: recovered.audit ?? audit,
          ...(recovered.humanized ? { humanized: true } : {}),
        },
      },
      humanized: recovered.humanized,
      audit: recovered.audit ?? audit,
    };
  }

  return {
    result: applyGeneratedArticleToContentPiece(result, rewritten, audit),
    humanized: true,
    audit,
  };
}
