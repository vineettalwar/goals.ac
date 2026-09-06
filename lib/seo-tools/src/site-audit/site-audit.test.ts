import { describe, expect, it } from "vitest";
import { analyzeHtml, emptyPage } from "./page-analyzer";
import { runPageReporters } from "./page-reporters";
import {
  findBrokenInternalLinks,
  findDuplicates,
  findOrphans,
  findRedirectChainsAndLoops,
} from "./multipage-checks";
import { getIssueDescriptor } from "./issue-types";
import type { CrawledPage } from "./types";

function page(overrides: Partial<CrawledPage> & Pick<CrawledPage, "id" | "url">): CrawledPage {
  return {
    statusCode: 200,
    fetchClass: "ok",
    responseTimeMs: 100,
    redirectUrl: null,
    isHtml: true,
    title: "A solid page title here",
    metaDescription: "A meta description that is long enough to pass the minimum length check.",
    canonicalUrl: null,
    headerCanonicalUrl: null,
    robotsMeta: null,
    xRobotsTag: null,
    isIndexable: true,
    h1Count: 1,
    headingOrder: [1, 2],
    wordCount: 200,
    contentHash: "abc",
    imagesTotal: 0,
    imagesMissingAlt: 0,
    links: [],
    crawlDepth: 1,
    fromSitemap: false,
    ...overrides,
  };
}

describe("site-audit issue registry", () => {
  it("returns howToFix for blocked-page", () => {
    const d = getIssueDescriptor("blocked-page");
    expect(d?.severity).toBe("critical");
    expect(d?.howToFix).toContain("GoalsAc-Audit");
  });
});

describe("analyzeHtml + page reporters", () => {
  it("flags missing title and thin content", () => {
    const html = `<!doctype html><html><head></head><body><p>Hi</p></body></html>`;
    const crawled = analyzeHtml({
      html,
      pageUrl: "https://example.com/",
      statusCode: 200,
      responseTimeMs: 50,
      redirectUrl: null,
      xRobotsTag: null,
      linkHeader: null,
      crawlDepth: 0,
      fromSitemap: false,
      pageId: "p1",
    });
    const issues = runPageReporters(crawled);
    expect(issues.some((i) => i.issueType === "missing-title")).toBe(true);
    expect(issues.some((i) => i.issueType === "thin-content")).toBe(true);
    expect(issues.some((i) => i.issueType === "missing-h1")).toBe(true);
  });

  it("reports blocked-page without content checks", () => {
    const issues = runPageReporters(
      emptyPage({
        id: "p1",
        url: "https://example.com/",
        statusCode: 403,
        fetchClass: "blocked",
        responseTimeMs: 20,
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.issueType).toBe("blocked-page");
  });
});

describe("multipage checks", () => {
  it("finds duplicate titles", () => {
    const issues = findDuplicates([
      page({ id: "1", url: "https://ex.com/a", title: "Same", contentHash: "1" }),
      page({ id: "2", url: "https://ex.com/b", title: "Same", contentHash: "2" }),
    ]);
    expect(issues.filter((i) => i.issueType === "duplicate-title")).toHaveLength(2);
  });

  it("finds redirect chains", () => {
    const issues = findRedirectChainsAndLoops([
      page({
        id: "1",
        url: "https://ex.com/a",
        statusCode: 301,
        redirectUrl: "https://ex.com/b",
        isHtml: false,
      }),
      page({
        id: "2",
        url: "https://ex.com/b",
        statusCode: 302,
        redirectUrl: "https://ex.com/c",
        isHtml: false,
      }),
      page({ id: "3", url: "https://ex.com/c", title: "Final page title ok" }),
    ]);
    expect(issues.some((i) => i.issueType === "redirect-chain")).toBe(true);
  });

  it("finds broken internal links only for fetched targets", () => {
    const pages = [
      page({
        id: "1",
        url: "https://ex.com/",
        links: [
          { href: "https://ex.com/missing", internal: true, rel: "", anchor: "x" },
          { href: "https://ex.com/unseen", internal: true, rel: "", anchor: "y" },
        ],
      }),
      page({ id: "2", url: "https://ex.com/missing", statusCode: 404, isHtml: false }),
    ];
    const issues = findBrokenInternalLinks(pages);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.details).toMatchObject({ targetUrl: "https://ex.com/missing" });
  });

  it("skips orphans when crawl is truncated", () => {
    const pages = [
      page({ id: "1", url: "https://ex.com/", crawlDepth: 0 }),
      page({ id: "2", url: "https://ex.com/orphan", fromSitemap: true, crawlDepth: 1 }),
    ];
    expect(findOrphans(pages, false)).toHaveLength(0);
    expect(findOrphans(pages, true)).toHaveLength(1);
  });
});
