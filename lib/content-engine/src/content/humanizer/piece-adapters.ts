import type { ContentFormatType } from "@workspace/db";
import type { GeneratedArticle } from "../../articles/article-generator";
import {
  resolveHumanizationLevel,
  resolveWritingSample,
  type HumanizationLevel,
  type UnifiedBrandContext,
} from "../../brand/brand-voice";
import { bodyWordCount, type HumanizationAudit } from "../content-piece-seo";
import { humanizeArticle } from "./humanize-article";
import { resolveSecondaryKeywords } from "./text-utils";
import type { HumanizableContentPiece, HumanizeOptions } from "./types";

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
