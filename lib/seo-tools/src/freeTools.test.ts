import { describe, expect, it } from "vitest";
import {
  buildLlmsTxtContent,
  pagePriority,
  parseRobotsTxt,
  scoreLlmsTxtDraft,
  scoreMetaTags,
  titleFromUrlPath,
} from "./freeTools";

describe("parseRobotsTxt", () => {
  it("keeps Disallow rules scoped to each User-agent group", () => {
    const result = parseRobotsTxt(
      `
User-agent: *
Disallow: /admin

User-agent: GPTBot
Disallow: /

User-agent: Googlebot
Allow: /
Disallow: /private

Sitemap: https://example.com/sitemap.xml
`.trim(),
      "https://example.com/robots.txt",
    );

    expect(result.allowsAll).toBe(true);
    expect(result.disallows).toEqual(["/admin"]);
    expect(result.sitemapUrls).toEqual(["https://example.com/sitemap.xml"]);
    expect(result.flaggedAgents).toEqual(["GPTBot"]);
    expect(result.agents).toHaveLength(3);

    const gpt = result.agents.find((a) => a.userAgents.includes("GPTBot"));
    expect(gpt?.blocksAll).toBe(true);
    expect(gpt?.disallows).toEqual(["/"]);

    const google = result.agents.find((a) => a.userAgents.includes("Googlebot"));
    expect(google?.blocksAll).toBe(false);
    expect(google?.disallows).toEqual(["/private"]);
    expect(google?.allows).toEqual(["/"]);
  });

  it("flags * when it Disallows the whole site", () => {
    const result = parseRobotsTxt(
      `User-agent: *\nDisallow: /\n`,
      "https://example.com/robots.txt",
    );
    expect(result.allowsAll).toBe(false);
    expect(result.flaggedAgents).toContain("*");
  });

  it("groups consecutive User-agent lines", () => {
    const result = parseRobotsTxt(
      `
User-agent: Googlebot
User-agent: Bingbot
Disallow: /search
`.trim(),
      "https://example.com/robots.txt",
    );
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]?.userAgents).toEqual(["Googlebot", "Bingbot"]);
    expect(result.agents[0]?.disallows).toEqual(["/search"]);
  });
});

describe("scoreMetaTags", () => {
  const goodTitle = "Exactly thirty characters here!!";
  const goodDesc =
    "A solid meta description that sits comfortably between fifty and one hundred sixty characters for search.";

  it("penalizes missing title and description", () => {
    const result = scoreMetaTags(null, null);
    expect(result.score).toBe(30);
    expect(result.issues).toContain("Missing page title");
    expect(result.issues).toContain("Missing meta description");
  });

  it("scores ideal lengths at 100 without optional context", () => {
    const result = scoreMetaTags(goodTitle, goodDesc);
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it("flags short titles", () => {
    const result = scoreMetaTags("Short", goodDesc);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.some((i) => i.startsWith("Title length"))).toBe(true);
  });

  it("flags all-caps titles and title/description clones", () => {
    const caps = scoreMetaTags("THIS TITLE IS ALL CAPS AND LONG ENOUGH", goodDesc);
    expect(caps.issues.some((i) => i.includes("all caps"))).toBe(true);

    const clone = scoreMetaTags(goodTitle, goodTitle);
    expect(clone.issues.some((i) => i.includes("identical"))).toBe(true);
  });

  it("checks H1 overlap and Open Graph only when options are passed", () => {
    const withH1 = scoreMetaTags(goodTitle, goodDesc, { h1: "Completely unrelated heading about ships" });
    expect(withH1.issues.some((i) => i.includes("H1"))).toBe(true);

    const missingOg = scoreMetaTags(goodTitle, goodDesc, { ogTitle: null, ogDescription: null });
    expect(missingOg.issues).toContain("Missing og:title");
    expect(missingOg.issues).toContain("Missing og:description");

    const matchingOg = scoreMetaTags(goodTitle, goodDesc, {
      h1: goodTitle,
      ogTitle: goodTitle,
      ogDescription: goodDesc,
    });
    expect(matchingOg.score).toBe(100);
  });
});

describe("llms.txt helpers", () => {
  it("titleFromUrlPath humanizes the last segment", () => {
    expect(titleFromUrlPath("https://example.com/")).toBe("Home");
    expect(titleFromUrlPath("https://example.com/blog/geo-audit-checklist")).toBe(
      "Geo Audit Checklist",
    );
  });

  it("pagePriority prefers product paths over legal", () => {
    expect(pagePriority("https://example.com/pricing")).toBeLessThan(
      pagePriority("https://example.com/legal/ssa"),
    );
    expect(pagePriority("https://example.com/")).toBeLessThan(
      pagePriority("https://example.com/blog/long/nested/post"),
    );
  });

  it("buildLlmsTxtContent emits markdown sections", () => {
    const content = buildLlmsTxtContent({
      title: "Acme",
      description: "B2B growth software for founders.",
      origin: "https://acme.test",
      pages: [
        { url: "https://acme.test/", title: "Home" },
        { url: "https://acme.test/pricing", title: "Pricing" },
      ],
    });
    expect(content).toContain("# Acme");
    expect(content).toContain("> B2B growth software for founders.");
    expect(content).toContain("- [Pricing](https://acme.test/pricing)");
    expect(content).toContain("## Optional");
    expect(content).toContain("https://acme.test/sitemap.xml");
  });

  it("scoreLlmsTxtDraft flags thin summaries and missing file", () => {
    const checks = scoreLlmsTxtDraft({
      title: "Acme",
      description: "Too short",
      pageCount: 1,
      existingFound: false,
      pageSource: "homepage-links",
    });
    expect(checks.find((c) => c.id === "description")?.ok).toBe(false);
    expect(checks.find((c) => c.id === "pages")?.ok).toBe(false);
    expect(checks.find((c) => c.id === "existing")?.ok).toBe(false);
  });
});
