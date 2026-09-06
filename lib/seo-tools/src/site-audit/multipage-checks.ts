/**
 * Cross-page checks — adapted from OpenSEO (MIT) multipage-checks.ts.
 */
import type { CrawledPage, DetectedIssue } from "./types";

const DUPLICATE_SAMPLE = 3;

type Slim = Pick<
  CrawledPage,
  | "id"
  | "url"
  | "statusCode"
  | "fetchClass"
  | "title"
  | "metaDescription"
  | "contentHash"
  | "redirectUrl"
  | "wordCount"
  | "isIndexable"
  | "canonicalUrl"
  | "headerCanonicalUrl"
  | "fromSitemap"
  | "links"
>;

function isOkHtml(page: Slim): boolean {
  return (
    page.fetchClass === "ok" &&
    page.statusCode !== null &&
    page.statusCode >= 200 &&
    page.statusCode < 300
  );
}

function isDuplicateCandidate(page: Slim): boolean {
  if (!isOkHtml(page) || !page.isIndexable) return false;
  const effective = page.canonicalUrl ?? page.headerCanonicalUrl;
  return !effective || effective === page.url;
}

export function findDuplicates(pages: Slim[]): DetectedIssue[] {
  const ok = pages.filter(isDuplicateCandidate);
  const groupBy = (keyOf: (p: Slim) => string | null) => {
    const groups = new Map<string, Slim[]>();
    for (const page of ok) {
      const key = keyOf(page);
      if (!key) continue;
      const g = groups.get(key);
      if (g) g.push(page);
      else groups.set(key, [page]);
    }
    return groups;
  };

  const issues: DetectedIssue[] = [];
  const emit = (groups: Map<string, Slim[]>, issueType: DetectedIssue["issueType"]) => {
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const page of group) {
        issues.push({
          issueType,
          pageId: page.id,
          pageUrl: page.url,
          details: {
            groupSize: group.length,
            otherUrls: group
              .filter((o) => o.id !== page.id)
              .slice(0, DUPLICATE_SAMPLE)
              .map((o) => o.url),
          },
        });
      }
    }
  };

  emit(
    groupBy((p) => p.title || null),
    "duplicate-title",
  );
  emit(
    groupBy((p) => p.metaDescription || null),
    "duplicate-meta-description",
  );
  emit(
    groupBy((p) => (p.wordCount > 0 ? p.contentHash : null)),
    "duplicate-content",
  );
  return issues;
}

export function findRedirectChainsAndLoops(pages: Slim[]): DetectedIssue[] {
  const redirects = new Map<string, Slim>();
  for (const page of pages) {
    const isRedirect =
      page.statusCode !== null &&
      page.statusCode >= 300 &&
      page.statusCode < 400 &&
      page.redirectUrl;
    if (isRedirect) redirects.set(page.url, page);
  }

  const redirectTargets = new Set([...redirects.values()].map((p) => p.redirectUrl!));
  const issues: DetectedIssue[] = [];
  const walked = new Set<string>();

  for (const [url, head] of redirects) {
    if (redirectTargets.has(url)) continue;
    const hops: string[] = [url];
    const seen = new Set(hops);
    walked.add(url);
    let current = head.redirectUrl;
    let isLoop = false;
    while (current) {
      if (seen.has(current)) {
        isLoop = true;
        hops.push(current);
        break;
      }
      hops.push(current);
      seen.add(current);
      if (redirects.has(current)) walked.add(current);
      current = redirects.get(current)?.redirectUrl ?? null;
    }
    if (isLoop) {
      issues.push({
        issueType: "redirect-loop",
        pageId: head.id,
        pageUrl: url,
        details: { hops },
      });
    } else if (hops.length > 2) {
      issues.push({
        issueType: "redirect-chain",
        pageId: head.id,
        pageUrl: url,
        details: { hops, finalUrl: hops[hops.length - 1] },
      });
    }
  }

  for (const [url, page] of redirects) {
    if (walked.has(url)) continue;
    const cycle: string[] = [];
    let current: string | null = url;
    while (current && !walked.has(current)) {
      walked.add(current);
      cycle.push(current);
      current = redirects.get(current)?.redirectUrl ?? null;
    }
    issues.push({
      issueType: "redirect-loop",
      pageId: page.id,
      pageUrl: url,
      details: { hops: [...cycle, url] },
    });
  }

  return issues;
}

/** Broken internal links — only for targets we actually fetched. */
export function findBrokenInternalLinks(pages: CrawledPage[]): DetectedIssue[] {
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const issues: DetectedIssue[] = [];

  for (const page of pages) {
    if (!isOkHtml(page)) continue;
    for (const link of page.links) {
      if (!link.internal) continue;
      const target = byUrl.get(link.href);
      if (!target || target.statusCode === null) continue;
      if (target.statusCode >= 400) {
        issues.push({
          issueType: "broken-internal-link",
          pageId: page.id,
          pageUrl: page.url,
          details: { targetUrl: link.href, statusCode: target.statusCode },
          dedupeKey: link.href,
        });
      }
    }
  }
  return issues;
}

/**
 * Orphans: sitemap-discovered pages with no inlinks from other crawled pages.
 * Only emit when the crawl exhausted the queue under maxPages (crawlComplete).
 */
export function findOrphans(pages: CrawledPage[], crawlComplete: boolean): DetectedIssue[] {
  if (!crawlComplete) return [];

  const inlinked = new Set<string>();
  for (const page of pages) {
    for (const link of page.links) {
      if (link.internal) inlinked.add(link.href);
    }
  }

  const issues: DetectedIssue[] = [];
  for (const page of pages) {
    if (!page.fromSitemap || !isOkHtml(page)) continue;
    if (page.crawlDepth === 0) continue; // start URL
    if (inlinked.has(page.url)) continue;
    issues.push({
      issueType: "orphan-page",
      pageId: page.id,
      pageUrl: page.url,
    });
  }
  return issues;
}
