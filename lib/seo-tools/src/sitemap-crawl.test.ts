import { describe, expect, it } from "vitest";
import { extractLocs } from "./sitemap-crawl";

describe("extractLocs", () => {
  it("parses loc entries from urlset XML", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about</loc></url>
</urlset>`;

    expect(extractLocs(xml)).toEqual([
      "https://example.com/",
      "https://example.com/about",
    ]);
  });

  it("parses loc entries from sitemap index XML", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`;

    expect(extractLocs(xml)).toEqual([
      "https://example.com/sitemap-posts.xml",
      "https://example.com/sitemap-pages.xml",
    ]);
  });

  it("returns empty array when no loc tags exist", () => {
    expect(extractLocs("<urlset></urlset>")).toEqual([]);
  });
});
