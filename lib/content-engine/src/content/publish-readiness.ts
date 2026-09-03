/**
 * Deterministic publish-readiness gate. All quality signals upstream (SEO checks,
 * AI-tell diagnosis, article quality score) are advisory by design: nothing stops a
 * bad draft from reaching WordPress. This module is the objective, no-judgment-call
 * layer that a publish route can actually block on before it calls a CMS adapter.
 *
 * Pure and side-effect free: no I/O, no DB, no network. Callers decide what to do
 * with the result.
 */
import {
  countAiSlopSignals,
  countEmDashes,
  diagnoseAiTells,
} from "./ai-writing-rules";
import {
  bodyWordCount,
  countExternalLinks,
  countFaqItems,
  type ContentPieceCitation,
  type ContentPieceFaqItem,
  type ContentPieceInternalLink,
  type ContentPieceMetadata,
} from "./content-piece-seo";
import { scoreArticleQuality } from "../articles/article-quality-score";
import {
  analyzeAltTextCoverage,
  analyzeKeywordDensity,
  findSimilarTitles,
} from "./seo-guardrails";

export type PublishReadinessSeverity = "blocker" | "warning";

export type PublishReadinessIssue = {
  code: string;
  severity: PublishReadinessSeverity;
  message: string;
  detail?: string;
};

export type PublishReadinessResult = {
  ok: boolean;
  blockers: PublishReadinessIssue[];
  warnings: PublishReadinessIssue[];
  qualityScore: number;
};

export type PublishReadinessOptions = {
  /** When set, a quality score below this is a blocker instead of a warning. */
  minQualityScore?: number;
  /** Slugs known to exist on the destination site. Omit to skip internal-slug checks. */
  knownSlugs?: string[];
  /** Citation URLs already verified as reachable. Omit to skip citation-reachability checks. */
  verifiedCitationUrls?: string[];
  /** Target keyword for density scoring. Omit to skip keyword-density checks entirely. */
  targetKeyword?: string;
  /** Titles already live on the destination site. Omit to skip title-uniqueness checks. */
  existingTitles?: string[];
};

/**
 * Structural input, permissive on purpose: accepts both a raw DB row shape (fields
 * folded into pieceMetadata) and a shape with the same fields promoted to the top
 * level, so both the Next route row and the cf-write-worker row pass through as-is.
 */
export type PublishReadinessPiece = {
  title: string;
  bodyMarkdown: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  citations?: ContentPieceCitation[] | null;
  faqSection?: ContentPieceFaqItem[] | null;
  internalLinkSuggestions?: ContentPieceInternalLink[] | null;
  jsonLdSchema?: object | null;
  pieceMetadata?: ContentPieceMetadata | null;
};

const DEFAULT_QUALITY_SCORE_REFERENCE = 70;
const EXCERPT_RADIUS = 40;

type ResolvedFields = {
  title: string;
  metaTitle: string | undefined;
  metaDescription: string | undefined;
  body: string;
  citations: ContentPieceCitation[];
  faqSection: ContentPieceFaqItem[];
  internalLinkSuggestions: ContentPieceInternalLink[];
  jsonLdSchema: object | undefined;
};

function resolveFields(piece: PublishReadinessPiece): ResolvedFields {
  const meta = piece.pieceMetadata ?? {};
  return {
    title: piece.title ?? "",
    metaTitle: piece.metaTitle ?? meta.seoTitle ?? piece.title ?? undefined,
    metaDescription: piece.metaDescription ?? meta.metaDescription ?? undefined,
    body: piece.bodyMarkdown ?? "",
    citations: piece.citations ?? meta.citations ?? [],
    faqSection: piece.faqSection ?? meta.faqSection ?? [],
    internalLinkSuggestions:
      piece.internalLinkSuggestions ?? meta.internalLinkSuggestions ?? [],
    jsonLdSchema: piece.jsonLdSchema ?? meta.jsonLdSchema ?? undefined,
  };
}

function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - EXCERPT_RADIUS);
  const end = Math.min(text.length, index + length + EXCERPT_RADIUS);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function checkEmDash(fields: ResolvedFields): PublishReadinessIssue | null {
  const combined = [fields.title, fields.metaTitle, fields.metaDescription, fields.body]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const count = countEmDashes(combined);
  if (count === 0) return null;

  const match = combined.match(/[—–]/);
  const detail = match?.index != null ? excerptAround(combined, match.index, 1) : undefined;
  return {
    code: "em_dash",
    severity: "blocker",
    message: `Found ${count} em dash or en dash character${count === 1 ? "" : "s"}. Replace with commas, colons, or split sentences.`,
    detail,
  };
}

function checkHeadingHierarchy(body: string): PublishReadinessIssue | null {
  const headingLines = body.match(/^#{1,6}\s+.+$/gm) ?? [];
  const skips: string[] = [];
  let prevLevel: number | null = null;

  for (const line of headingLines) {
    const levelMatch = line.match(/^(#{1,6})/);
    const level = levelMatch![1]!.length;
    const text = line.replace(/^#{1,6}\s+/, "").trim();

    if (prevLevel === null) {
      if (level > 2) {
        skips.push(`First heading is H${level} ("${text}"), expected H2 or higher up the tree`);
      }
    } else if (level > prevLevel + 1) {
      skips.push(`H${prevLevel} is followed by H${level} ("${text}") with no H${prevLevel + 1} between`);
    }
    prevLevel = level;
  }

  if (skips.length === 0) return null;
  return {
    code: "heading_hierarchy",
    severity: "blocker",
    message: `Heading levels skip a step in ${skips.length} place${skips.length === 1 ? "" : "s"}. Fix the outline before publishing.`,
    detail: skips[0],
  };
}

function checkMissingAltText(body: string): PublishReadinessIssue | null {
  const pattern = /!\[(\s*)\]\(([^)]+)\)/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    urls.push(match[2]!.trim());
  }
  if (urls.length === 0) return null;
  return {
    code: "missing_alt_text",
    severity: "blocker",
    message: `${urls.length} image${urls.length === 1 ? "" : "s"} missing alt text.`,
    detail: urls[0],
  };
}

function checkMetaDescriptionLength(metaDescription: string | undefined): PublishReadinessIssue | null {
  if (!metaDescription || metaDescription.trim().length === 0) {
    return {
      code: "meta_description_length",
      severity: "blocker",
      message: "Meta description is missing.",
    };
  }
  const length = metaDescription.trim().length;
  if (length < 50 || length > 160) {
    return {
      code: "meta_description_length",
      severity: "blocker",
      message: `Meta description is ${length} characters. Keep it between 50 and 160 (target 150-160).`,
      detail: metaDescription,
    };
  }
  return null;
}

function checkMetaTitleLength(metaTitle: string | undefined): PublishReadinessIssue | null {
  if (!metaTitle || metaTitle.trim().length === 0) return null;
  const length = metaTitle.trim().length;
  if (length < 25 || length > 65) {
    return {
      code: "meta_title_length",
      severity: "blocker",
      message: `Meta title is ${length} characters. Keep it between 25 and 65.`,
      detail: metaTitle,
    };
  }
  return null;
}

function normalizeSlug(slug: string): string {
  return slug.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function checkDanglingInternalLinks(
  body: string,
  internalLinkSuggestions: ContentPieceInternalLink[],
  knownSlugs: string[] | undefined,
): PublishReadinessIssue | null {
  if (!knownSlugs) return null;
  const known = new Set(knownSlugs.map(normalizeSlug));

  const bodySlugs = new Set<string>();
  const pattern = /\[[^\]]+\]\((\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    bodySlugs.add(normalizeSlug(match[1]!));
  }
  for (const suggestion of internalLinkSuggestions) {
    if (suggestion.suggestedSlug) bodySlugs.add(normalizeSlug(suggestion.suggestedSlug));
  }

  const dangling = [...bodySlugs].filter((slug) => !known.has(slug));
  if (dangling.length === 0) return null;

  return {
    code: "dangling_internal_link",
    severity: "blocker",
    message: `${dangling.length} internal link${dangling.length === 1 ? "" : "s"} point to a slug not known on the destination site.`,
    detail: dangling[0],
  };
}

function checkUnreachableCitations(
  body: string,
  citations: ContentPieceCitation[],
  verifiedCitationUrls: string[] | undefined,
): PublishReadinessIssue | null {
  if (!verifiedCitationUrls) return null;
  const verified = new Set(verifiedCitationUrls.map((url) => url.trim()));

  const externalUrls = new Set<string>();
  const pattern = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    externalUrls.add(match[1]!.trim());
  }
  for (const citation of citations) {
    if (citation.url) externalUrls.add(citation.url.trim());
  }

  const unreachable = [...externalUrls].filter((url) => !verified.has(url));
  if (unreachable.length === 0) return null;

  return {
    code: "unreachable_citation",
    severity: "blocker",
    message: `${unreachable.length} citation URL${unreachable.length === 1 ? "" : "s"} could not be verified as reachable.`,
    detail: unreachable[0],
  };
}

function checkKeywordStuffing(body: string, targetKeyword: string | undefined): PublishReadinessIssue | null {
  if (!targetKeyword || targetKeyword.trim().length === 0) return null;
  const report = analyzeKeywordDensity(body, targetKeyword);
  if (report.verdict !== "over") return null;
  return {
    code: "keyword_stuffing",
    severity: "blocker",
    message: `Keyword "${report.keyword}" appears ${report.occurrences} times (${report.densityPercent.toFixed(2)}% density) across ${report.wordCount} words. That reads as stuffed; thin it out.`,
  };
}

function checkKeywordUnderused(body: string, targetKeyword: string | undefined): PublishReadinessIssue | null {
  if (!targetKeyword || targetKeyword.trim().length === 0) return null;
  const report = analyzeKeywordDensity(body, targetKeyword);
  if (report.verdict !== "under") return null;
  return {
    code: "keyword_underused",
    severity: "warning",
    message: `Keyword "${report.keyword}" appears only ${report.occurrences} time${report.occurrences === 1 ? "" : "s"} (${report.densityPercent.toFixed(2)}% density) across ${report.wordCount} words. Work it in more naturally.`,
  };
}

function checkDuplicateTitle(title: string, existingTitles: string[] | undefined): PublishReadinessIssue | null {
  if (!existingTitles) return null;
  const hits = findSimilarTitles(title, existingTitles);
  if (hits.length === 0) return null;
  const closest = hits[0]!;
  return {
    code: "duplicate_title",
    severity: "blocker",
    message: `Title is ${(closest.similarity * 100).toFixed(0)}% similar to an existing title. That risks self-cannibalization in search.`,
    detail: closest.existingTitle,
  };
}

function checkWeakAltText(body: string): PublishReadinessIssue | null {
  const coverage = analyzeAltTextCoverage(body);
  if (coverage.lowQualityAlt.length === 0) return null;
  return {
    code: "weak_alt_text",
    severity: "warning",
    message: `${coverage.lowQualityAlt.length} image${coverage.lowQualityAlt.length === 1 ? "" : "s"} have alt text that is too short or duplicated across images (${coverage.coveragePercent.toFixed(0)}% coverage).`,
    detail: coverage.lowQualityAlt[0],
  };
}

export function assessPublishReadiness(
  piece: PublishReadinessPiece,
  options: PublishReadinessOptions = {},
): PublishReadinessResult {
  const fields = resolveFields(piece);
  const blockers: PublishReadinessIssue[] = [];
  const warnings: PublishReadinessIssue[] = [];

  for (const issue of [
    checkEmDash(fields),
    checkHeadingHierarchy(fields.body),
    checkMissingAltText(fields.body),
    checkMetaDescriptionLength(fields.metaDescription),
    checkMetaTitleLength(fields.metaTitle),
    checkDanglingInternalLinks(fields.body, fields.internalLinkSuggestions, options.knownSlugs),
    checkUnreachableCitations(fields.body, fields.citations, options.verifiedCitationUrls),
    checkKeywordStuffing(fields.body, options.targetKeyword),
    checkDuplicateTitle(fields.title, options.existingTitles),
  ]) {
    if (issue) blockers.push(issue);
  }

  for (const issue of [
    checkKeywordUnderused(fields.body, options.targetKeyword),
    checkWeakAltText(fields.body),
  ]) {
    if (issue) warnings.push(issue);
  }

  const wordCount = bodyWordCount(fields.body);
  const quality = scoreArticleQuality({
    bodyMarkdown: fields.body,
    metaTitle: fields.metaTitle,
    metaDescription: fields.metaDescription,
    citations: fields.citations,
    faqSection: fields.faqSection,
    jsonLdSchema: fields.jsonLdSchema,
    internalLinkSuggestions: fields.internalLinkSuggestions,
    wordCount,
  });

  if (options.minQualityScore != null) {
    if (quality.total < options.minQualityScore) {
      blockers.push({
        code: "low_quality_score",
        severity: "blocker",
        message: `Quality score ${quality.total} is below the required minimum of ${options.minQualityScore}.`,
      });
    }
  } else if (quality.total < DEFAULT_QUALITY_SCORE_REFERENCE) {
    warnings.push({
      code: "low_quality_score",
      severity: "warning",
      message: `Quality score ${quality.total} is below the advisory reference of ${DEFAULT_QUALITY_SCORE_REFERENCE}. This does not block publish.`,
    });
  }

  const slopScore = countAiSlopSignals(fields.body);
  if (slopScore > 0) {
    const diagnosis = diagnoseAiTells(fields.body);
    const examples: string[] = [];
    for (const matches of Object.values(diagnosis.categories)) {
      for (const example of matches) {
        examples.push(example);
        if (examples.length >= 3) break;
      }
      if (examples.length >= 3) break;
    }
    warnings.push({
      code: "ai_tells",
      severity: "warning",
      message: `${slopScore} AI-writing tell${slopScore === 1 ? "" : "s"} detected.`,
      detail: examples.join(", "),
    });
  }

  if (wordCount < 800) {
    warnings.push({
      code: "thin_content",
      severity: "warning",
      message: `Body is ${wordCount} words. Aim for at least 800.`,
    });
  }

  const externalLinks = countExternalLinks(fields.body);
  if (externalLinks < 3) {
    warnings.push({
      code: "few_citations",
      severity: "warning",
      message: `Only ${externalLinks} external citation link${externalLinks === 1 ? "" : "s"} in the body. Aim for 3+.`,
    });
  }

  const faqItems = countFaqItems(fields.body);
  if (faqItems < 3) {
    warnings.push({
      code: "no_faq",
      severity: "warning",
      message: `Only ${faqItems} FAQ item${faqItems === 1 ? "" : "s"} found. Aim for 3+.`,
    });
  }

  if (!fields.jsonLdSchema || Object.keys(fields.jsonLdSchema).length === 0) {
    warnings.push({
      code: "no_schema",
      severity: "warning",
      message: "No JSON-LD structured data set for this piece.",
    });
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    qualityScore: quality.total,
  };
}
