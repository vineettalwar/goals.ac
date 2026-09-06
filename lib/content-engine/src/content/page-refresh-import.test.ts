import { describe, expect, it } from "vitest";
import {
  extractCanonicalUrl,
  extractFromPaste,
  extractTitleFromHtml,
  htmlToRefreshMarkdown,
  wordCountFromMarkdown,
} from "./page-refresh-import";

describe("extractTitleFromHtml", () => {
  it("prefers og:title over <title>", () => {
    const html = `<html><head>
      <title>Browser title</title>
      <meta property="og:title" content="OG Title" />
    </head></html>`;
    expect(extractTitleFromHtml(html)).toBe("OG Title");
  });

  it("falls back to h1", () => {
    expect(extractTitleFromHtml("<html><body><h1>Hello <em>World</em></h1></body></html>")).toBe(
      "Hello World",
    );
  });
});

describe("extractCanonicalUrl", () => {
  it("resolves relative canonical against base", () => {
    const html = `<link rel="canonical" href="/posts/foo" />`;
    expect(extractCanonicalUrl(html, "https://example.com/blog/bar")).toBe(
      "https://example.com/posts/foo",
    );
  });
});

describe("htmlToRefreshMarkdown", () => {
  it("keeps headings and prefixes H1 when missing", () => {
    const html = `<article><h2>Section</h2><p>One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight twentynine thirty thirtyone thirtytwo thirtythree thirtyfour thirtyfive thirtysix thirtyseven thirtyeight thirtynine forty fortyone fortytwo fortythree fortyfour fortyfive fortysix fortyseven fortyeight fortynine fifty.</p></article>`;
    const { markdown } = htmlToRefreshMarkdown(html, "My Page");
    expect(markdown.startsWith("# My Page")).toBe(true);
    expect(markdown).toContain("## Section");
  });
});

describe("extractFromPaste", () => {
  it("rejects short paste", () => {
    const result = extractFromPaste("too short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.pasteFallback).toBe(true);
  });

  it("accepts long paste and reads H1 title", () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const result = extractFromPaste(`# Pasted Title\n\n${words}`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.title).toBe("Pasted Title");
      expect(result.wordCount).toBeGreaterThanOrEqual(50);
    }
  });
});

describe("wordCountFromMarkdown", () => {
  it("counts words", () => {
    expect(wordCountFromMarkdown("one two three")).toBe(3);
  });
});
