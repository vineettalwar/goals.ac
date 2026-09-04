import { describe, expect, it } from "vitest";
import {
  DEFAULT_BRAND_SCAN_MAX_DEPTH,
  DEFAULT_BRAND_SCAN_MAX_PAGES,
  discoverBrandScanUrls,
  isBrandCriticalPath,
  normalizeBrandScanUrl,
  pickKeyPages,
  prioritizeDiscoveredUrls,
} from "./brand-scan-discovery";

describe("normalizeBrandScanUrl", () => {
  it("strips query, hash, and trailing slash", () => {
    expect(normalizeBrandScanUrl("https://example.com/about/?ref=1#team")).toBe(
      "https://example.com/about",
    );
  });
});

describe("isBrandCriticalPath", () => {
  it("detects about and pricing paths", () => {
    expect(isBrandCriticalPath("https://example.com/about-us")).toBe(true);
    expect(isBrandCriticalPath("https://example.com/pricing")).toBe(true);
    expect(isBrandCriticalPath("https://example.com/random-page")).toBe(false);
  });
});

describe("pickKeyPages", () => {
  it("selects keyword-matching internal links", () => {
    const links = [
      "https://example.com/blog/post-1",
      "https://example.com/about",
      "https://example.com/pricing",
    ];
    const picked = pickKeyPages(links, 2);
    expect(picked).toContain("https://example.com/about");
    expect(picked.length).toBeLessThanOrEqual(2);
  });
});

describe("prioritizeDiscoveredUrls", () => {
  it("puts brand-critical paths first without dropping other URLs", () => {
    const urls = [
      "https://example.com/random",
      "https://example.com/pricing",
      "https://example.com/blog/post",
    ];
    const ranked = prioritizeDiscoveredUrls(urls);
    expect(ranked).toHaveLength(3);
    expect(ranked[0]).toBe("https://example.com/pricing");
  });
});

describe("discoverBrandScanUrls", () => {
  const websiteUrl = "https://example.com";

  it("prioritizes brand-critical sitemap URLs over generic pages", () => {
    const plan = discoverBrandScanUrls({
      websiteUrl,
      sitemapUrls: [
        "https://example.com/docs/page-99",
        "https://example.com/about",
        "https://example.com/pricing",
      ],
    });

    expect(plan.pagesToFetch[0]).toMatch(/about|pricing/);
    expect(plan.discoveryMeta.sitemap).toBe(true);
  });

  it("dedupes URLs across sources", () => {
    const plan = discoverBrandScanUrls({
      websiteUrl,
      sitemapUrls: ["https://example.com/about/"],
      homepageLinks: ["https://example.com/about"],
      gscTopPages: [{ url: "https://example.com/about?gsc=1", impressions: 500 }],
    });

    const normalized = plan.pagesToFetch.map(normalizeBrandScanUrl);
    expect(new Set(normalized).size).toBe(normalized.length);
    expect(plan.pagesToFetch).toHaveLength(1);
  });

  it("caps supplemental page fetches at the default page budget minus the homepage", () => {
    const sitemapUrls = Array.from({ length: 30 }, (_, i) => `https://example.com/page-${i}`);
    const plan = discoverBrandScanUrls({ websiteUrl, sitemapUrls });
    expect(plan.pagesToFetch.length).toBeLessThanOrEqual(DEFAULT_BRAND_SCAN_MAX_PAGES - 1);
    expect(plan.maxPages).toBe(DEFAULT_BRAND_SCAN_MAX_PAGES);
    expect(plan.maxDepth).toBe(DEFAULT_BRAND_SCAN_MAX_DEPTH);
  });

  it("respects a caller-supplied maxPages budget", () => {
    const sitemapUrls = Array.from({ length: 30 }, (_, i) => `https://example.com/page-${i}`);
    const plan = discoverBrandScanUrls({ websiteUrl, sitemapUrls, maxPages: 5, maxDepth: 1 });
    expect(plan.pagesToFetch.length).toBeLessThanOrEqual(4);
    expect(plan.maxPages).toBe(5);
    expect(plan.maxDepth).toBe(1);
  });

  it("returns every page when the site has fewer pages than the budget", () => {
    const plan = discoverBrandScanUrls({
      websiteUrl,
      sitemapUrls: ["https://example.com/about", "https://example.com/pricing"],
    });
    expect(plan.pagesToFetch).toHaveLength(2);
  });

  it("falls back to homepage link heuristics when no scored URLs exist", () => {
    const plan = discoverBrandScanUrls({
      websiteUrl,
      homepageLinks: ["https://example.com/about", "https://example.com/contact"],
    });

    expect(plan.discoveryMeta.homepage).toBe(true);
    expect(plan.pagesToFetch.length).toBeGreaterThan(0);
  });

  it("includes CMS excerpts for posts not selected for fetch", () => {
    const cmsSiteGraph = Array.from({ length: 12 }, (_, i) => ({
      url: `https://example.com/blog/post-${i}`,
      title: `Post ${i}`,
      excerpt: `Excerpt content for post ${i} with enough words to be useful.`,
    }));

    const plan = discoverBrandScanUrls({
      websiteUrl,
      cmsSiteGraph,
      sitemapUrls: cmsSiteGraph.map((p) => p.url),
      maxPages: 9,
    });

    expect(plan.discoveryMeta.cms).toBe(true);
    expect(plan.cmsExcerpts.length).toBeGreaterThan(0);
    expect(plan.scanSources).toContain(websiteUrl);
  });

  it("boosts high-impression GSC pages in fetch list", () => {
    const plan = discoverBrandScanUrls({
      websiteUrl,
      sitemapUrls: [
        "https://example.com/low-traffic",
        "https://example.com/high-traffic",
      ],
      gscTopPages: [{ url: "https://example.com/high-traffic", impressions: 10000 }],
    });

    expect(plan.pagesToFetch[0]).toBe("https://example.com/high-traffic");
    expect(plan.discoveryMeta.gsc).toBe(true);
  });
});
