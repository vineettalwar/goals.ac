import { describe, expect, it, vi } from "vitest";
import {
  CompetitorUnreachableError,
  extractPageEvidence,
  gatherCompetitorEvidence,
  scrapeCompetitorText,
} from "./competitorAnalyzer";

describe("scrapeCompetitorText SSRF", () => {
  it("rejects a private URL before fetch", async () => {
    await expect(scrapeCompetitorText("http://127.0.0.1/secret")).rejects.toThrow(
      /private\/reserved/,
    );
  });
});

describe("extractPageEvidence", () => {
  it("reads title, headings, and JSON-LD types", () => {
    const html = `<html><head><title>Acme Pricing</title>
      <script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>
      </head><body><h1>Plans</h1><h2>Starter</h2><h2>Growth</h2>${" word".repeat(400)}</body></html>`;
    const page = extractPageEvidence(html, "https://acme.test/pricing");
    expect(page.title).toBe("Acme Pricing");
    expect(page.h1).toBe("Plans");
    expect(page.h2s).toEqual(["Starter", "Growth"]);
    expect(page.schemaTypes).toContain("Organization");
    expect(page.wordCountBucket).toBe("medium");
  });
});

describe("gatherCompetitorEvidence", () => {
  it("fails when the homepage is blocked", async () => {
    const fetchImpl = vi.fn(async () => new Response("denied", { status: 403 }));
    await expect(
      gatherCompetitorEvidence("https://example.org/", { fetchImpl, maxPages: 2 }),
    ).rejects.toBeInstanceOf(CompetitorUnreachableError);
  });

  it("includes more than one URL when the homepage links another page", async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes("robots.txt") || url.includes("sitemap")) {
        return new Response("User-agent: *\nAllow: /\n", { status: 200 });
      }
      if (url.includes("/blog")) {
        return new Response(
          `<html><head><title>Blog</title></head><body><h1>Blog</h1>${" word".repeat(80)}</body></html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
      return new Response(
        `<html><head><title>Home</title></head><body><h1>Home</h1><a href="https://example.org/blog">Blog</a>${" word".repeat(80)}</body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const { pages } = await gatherCompetitorEvidence("https://example.org/", { fetchImpl, maxPages: 4 });
    expect(pages.map((p) => p.url).some((u) => u.includes("/blog"))).toBe(true);
    expect(pages.length).toBeGreaterThan(1);
  });
});
