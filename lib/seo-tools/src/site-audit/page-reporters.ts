/**
 * Per-page issue reporters — adapted from OpenSEO (MIT) page-reporters.ts.
 * Pure functions over a crawled page record (DOM-free).
 */
import type { AuditIssueType } from "./issue-types";
import type { CrawledPage, DetectedIssue } from "./types";

const TITLE_MAX = 60;
const TITLE_MIN = 10;
const META_MAX = 160;
const META_MIN = 70;
const THIN_WORDS = 150;
const SLOW_MS = 1500;
const DEEP = 5;

function hasHeadingLevelSkip(headingOrder: number[]): boolean {
  for (let i = 1; i < headingOrder.length; i++) {
    if (headingOrder[i]! > headingOrder[i - 1]! + 1) return true;
  }
  return false;
}

export function runPageReporters(page: CrawledPage): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const report = (issueType: AuditIssueType, details?: Record<string, unknown>) =>
    issues.push({ issueType, pageId: page.id, pageUrl: page.url, details });

  if (page.fetchClass === "blocked") {
    report("blocked-page", { statusCode: page.statusCode });
    return issues;
  }
  if (page.fetchClass === "error") return issues;

  if (page.statusCode !== null && page.statusCode >= 500) {
    report("server-error", { statusCode: page.statusCode });
    return issues;
  }
  if (page.statusCode !== null && page.statusCode >= 400) {
    report("broken-page", { statusCode: page.statusCode });
    return issues;
  }
  if (page.statusCode !== null && page.statusCode >= 300) return issues;

  if (page.responseTimeMs > SLOW_MS) {
    report("slow-response", { responseTimeMs: page.responseTimeMs });
  }
  if (!page.isHtml) return issues;

  if (!page.title) report("missing-title");
  else if (page.title.length > TITLE_MAX) report("title-too-long", { length: page.title.length });
  else if (page.title.length < TITLE_MIN) report("title-too-short", { length: page.title.length });

  if (!page.metaDescription) report("missing-meta-description");
  else if (page.metaDescription.length > META_MAX)
    report("meta-description-too-long", { length: page.metaDescription.length });
  else if (page.metaDescription.length < META_MIN)
    report("meta-description-too-short", { length: page.metaDescription.length });

  if (page.h1Count === 0) report("missing-h1");
  else if (page.h1Count > 1) report("multiple-h1", { h1Count: page.h1Count });
  if (hasHeadingLevelSkip(page.headingOrder)) report("heading-order-skip");

  if (!page.isIndexable) {
    report("noindex-page", { robotsMeta: page.robotsMeta, xRobotsTag: page.xRobotsTag });
  }
  if (
    page.canonicalUrl &&
    page.headerCanonicalUrl &&
    page.canonicalUrl !== page.headerCanonicalUrl
  ) {
    report("canonical-conflict", {
      htmlCanonical: page.canonicalUrl,
      headerCanonical: page.headerCanonicalUrl,
    });
  }
  const effectiveCanonical = page.canonicalUrl ?? page.headerCanonicalUrl;
  if (effectiveCanonical && effectiveCanonical !== page.url) {
    report("canonicalized-page", { canonicalUrl: effectiveCanonical });
  }

  if (page.isIndexable && page.wordCount < THIN_WORDS) {
    report("thin-content", { wordCount: page.wordCount });
  }
  if (page.imagesMissingAlt > 0) {
    report("images-missing-alt", {
      imagesMissingAlt: page.imagesMissingAlt,
      imagesTotal: page.imagesTotal,
    });
  }
  if (page.isIndexable && page.links.length === 0) report("no-outgoing-links");
  if (page.crawlDepth !== null && page.crawlDepth >= DEEP) {
    report("deep-page", { crawlDepth: page.crawlDepth });
  }

  return issues;
}
