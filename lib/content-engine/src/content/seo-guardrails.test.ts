import { describe, expect, it } from "vitest";
import {
  analyzeAltTextCoverage,
  analyzeKeywordDensity,
  findSimilarTitles,
} from "./seo-guardrails";

function repeatWords(word: string, count: number): string {
  return new Array(count).fill(word).join(" ");
}

function buildProseBody(paragraphs: string[]): string {
  return paragraphs.map((paragraph, index) => `## Section ${index + 1}\n\n${paragraph}`).join("\n\n");
}

describe("analyzeKeywordDensity", () => {
  it("scores a natural mention rate as ok", () => {
    const filler = repeatWords("word", 40);
    const body = buildProseBody([
      `${filler} local seo for dentists helps small practices win nearby patients. ${filler}`,
      `${filler} another mention of local seo for dentists appears here for good measure. ${filler}`,
    ]);
    const report = analyzeKeywordDensity(body, "local seo for dentists");
    expect(report.verdict).toBe("ok");
    expect(report.occurrences).toBe(2);
  });

  it("scores a stuffed article as over and reports a blocker-worthy density", () => {
    const filler = repeatWords("word", 20);
    const stuffed = repeatWords("local seo for dentists", 10);
    const body = `## Section\n\n${filler} ${stuffed} ${filler}`;
    const report = analyzeKeywordDensity(body, "local seo for dentists");
    expect(report.verdict).toBe("over");
    expect(report.densityPercent).toBeGreaterThan(3);
  });

  it("scores an article that barely mentions its keyword as under", () => {
    const filler = repeatWords("word", 500);
    const body = `## Section\n\n${filler} local seo for dentists ${filler}`;
    const report = analyzeKeywordDensity(body, "local seo for dentists");
    expect(report.verdict).toBe("under");
  });

  it("counts a multi-word phrase only as a contiguous phrase, not scattered word hits", () => {
    const body = "## Section\n\nSeo is great. For dentists, local marketing matters. Local seo for dentists is the target phrase here.";
    const report = analyzeKeywordDensity(body, "local seo for dentists");
    expect(report.occurrences).toBe(1);
  });

  it("does not match the keyword inside a longer unrelated word (word boundary check)", () => {
    const filler = repeatWords("word", 200);
    const body = `## Section\n\n${filler} seospam is not seo and should not count as a match ${filler}`;
    const report = analyzeKeywordDensity(body, "seo");
    expect(report.occurrences).toBe(1);
  });

  it("counts a simple plural variant of the last word", () => {
    const body = "## Section\n\nThis guide covers local seo for dentist offices broadly, and local seo for dentists specifically.";
    const report = analyzeKeywordDensity(body, "local seo for dentist");
    expect(report.occurrences).toBe(2);
  });

  it("returns zero occurrences and under verdict for an empty body", () => {
    const report = analyzeKeywordDensity("", "local seo for dentists");
    expect(report.occurrences).toBe(0);
    expect(report.verdict).toBe("under");
  });
});

describe("findSimilarTitles", () => {
  it("detects a near-duplicate title with reordered and re-punctuated words", () => {
    const hits = findSimilarTitles("Local SEO Guide for Dentists in 2026", [
      "Local SEO Guide for Dentists (2026)",
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.similarity).toBeGreaterThanOrEqual(0.8);
  });

  it("does not flag genuinely different titles that merely share a topic", () => {
    const hits = findSimilarTitles("Local SEO for Dentists", ["Local SEO for Personal Injury Lawyers"]);
    expect(hits).toHaveLength(0);
  });

  it("is case- and punctuation-insensitive", () => {
    const hits = findSimilarTitles("local seo for dentists!!!", ["LOCAL SEO FOR DENTISTS"]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.similarity).toBe(1);
  });

  it("returns an empty array when existingTitles is empty", () => {
    expect(findSimilarTitles("Any Title Here", [])).toEqual([]);
  });

  it("respects a custom threshold", () => {
    const hits = findSimilarTitles("Local SEO Tips for Dentists", ["Local SEO Tips for Lawyers"], 0.5);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe("analyzeAltTextCoverage", () => {
  it("reports full coverage when every image has a real, distinct alt", () => {
    const body = [
      "![A dentist office reception desk with a plant](https://example.com/a.jpg)",
      "![A patient smiling in the dental chair](https://example.com/b.jpg)",
    ].join("\n\n");
    const coverage = analyzeAltTextCoverage(body);
    expect(coverage.totalImages).toBe(2);
    expect(coverage.withAlt).toBe(2);
    expect(coverage.emptyAlt).toEqual([]);
    expect(coverage.lowQualityAlt).toEqual([]);
    expect(coverage.coveragePercent).toBe(100);
  });

  it("reports empty alt separately from low quality alt", () => {
    const body = "![](https://example.com/empty.jpg)";
    const coverage = analyzeAltTextCoverage(body);
    expect(coverage.emptyAlt).toEqual(["https://example.com/empty.jpg"]);
    expect(coverage.withAlt).toBe(0);
  });

  it("flags a one-word alt as low quality", () => {
    const body = "![photo](https://example.com/photo.jpg)";
    const coverage = analyzeAltTextCoverage(body);
    expect(coverage.lowQualityAlt).toEqual(["https://example.com/photo.jpg"]);
  });

  it("flags the same alt text reused across multiple images", () => {
    const body = [
      "![dentist office](https://example.com/a.jpg)",
      "![dentist office](https://example.com/b.jpg)",
      "![a completely distinct and descriptive caption here](https://example.com/c.jpg)",
    ].join("\n\n");
    const coverage = analyzeAltTextCoverage(body);
    expect(coverage.lowQualityAlt).toEqual(
      expect.arrayContaining(["https://example.com/a.jpg", "https://example.com/b.jpg"]),
    );
    expect(coverage.lowQualityAlt).not.toContain("https://example.com/c.jpg");
  });

  it("does not error or warn on an article with no images", () => {
    const coverage = analyzeAltTextCoverage("## Just Prose\n\nNo images live here at all.");
    expect(coverage.totalImages).toBe(0);
    expect(coverage.lowQualityAlt).toEqual([]);
    expect(coverage.coveragePercent).toBe(100);
  });
});
