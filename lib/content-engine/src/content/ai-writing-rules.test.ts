import { describe, expect, it } from "vitest";
import { countAiSlopSignals, countEmDashes, sanitizeAiProse, sanitizeAiSlopPhrases } from "./ai-writing-rules";

/** A clean 50-word paragraph with no AI tells, for building longer fixtures without pasting prose. */
const CLEAN_PARAGRAPH =
  "Our team shipped the new checklist last week after three rounds of user testing with real customers. " +
  "The support queue dropped by half within four days, and onboarding time fell from twelve minutes to five. " +
  "We tracked every metric on a shared dashboard so nobody had to guess what changed.";

/** Repeats the clean paragraph until the article reaches at least `targetWords` words. */
function buildCleanArticle(targetWords: number): string {
  const paragraphWords = CLEAN_PARAGRAPH.split(/\s+/).filter(Boolean).length;
  const repeats = Math.ceil(targetWords / paragraphWords);
  return Array.from({ length: repeats }, () => CLEAN_PARAGRAPH).join("\n\n");
}

/** Inserts `word` as its own sentence into the first `times` paragraphs of `article`. */
function insertWordIntoParagraphs(article: string, word: string, times: number): string {
  const paragraphs = article.split("\n\n");
  for (let i = 0; i < times && i < paragraphs.length; i++) {
    paragraphs[i] = `${word} matters here. ${paragraphs[i]}`;
  }
  return paragraphs.join("\n\n");
}

describe("sanitizeAiSlopPhrases", () => {
  it("retains mid-sentence corporate verbs instead of blind-deleting them", () => {
    const input = "We need to optimize our funnel before scaling spend.";
    const out = sanitizeAiSlopPhrases(input);
    expect(out).toContain("optimize");
    expect(out).toBe(input);
  });

  it("strips multi-word AI-tell openers", () => {
    const input = "In today's fast-paced world, growth matters.";
    const out = sanitizeAiSlopPhrases(input);
    expect(out.toLowerCase()).not.toContain("fast-paced world");
    expect(out).toMatch(/growth matters/i);
  });

  it("keeps em-dash sanitization via sanitizeAiProse", () => {
    const input = "Growth works—when the funnel is ready.";
    const out = sanitizeAiProse(input);
    expect(out).not.toContain("—");
    expect(out).toContain("Growth works");
  });
});

describe("countAiSlopSignals: soft-tell density scoring", () => {
  it.each(["optimize", "comprehensive", "robust"])(
    "scores 0 for a single '%s' in a 1,500-word article",
    (word) => {
      const article = insertWordIntoParagraphs(buildCleanArticle(1500), word, 1);
      expect(countAiSlopSignals(article)).toBe(0);
    },
  );

  it("scores above 0 for six 'additionally' in a 1,500-word article", () => {
    const clean = buildCleanArticle(1500);
    const sloppy = insertWordIntoParagraphs(clean, "additionally", 6);
    expect(countAiSlopSignals(clean)).toBe(0);
    expect(countAiSlopSignals(sloppy)).toBeGreaterThan(0);
  });

  it("scores 0 for a literal 'navigate to' UI instruction", () => {
    const article = insertWordIntoParagraphs(buildCleanArticle(1500), "Navigate to the dashboard", 1);
    expect(countAiSlopSignals(article)).toBe(0);
  });

  it("scores above 0 for the metaphorical 'navigate the complexities of'", () => {
    const article = insertWordIntoParagraphs(
      buildCleanArticle(1500),
      "Navigate the complexities of enterprise procurement",
      1,
    );
    expect(countAiSlopSignals(article)).toBeGreaterThan(0);
  });

  it("scores 0 for the literal noun 'landscape photography'", () => {
    const article = insertWordIntoParagraphs(buildCleanArticle(1500), "Landscape photography", 1);
    expect(countAiSlopSignals(article)).toBe(0);
  });

  it("scores above 0 for the metaphorical 'the evolving digital landscape'", () => {
    const article = insertWordIntoParagraphs(buildCleanArticle(1500), "The evolving digital landscape", 1);
    expect(countAiSlopSignals(article)).toBeGreaterThan(0);
  });

  it("scores every em dash per occurrence regardless of article length", () => {
    const shortWithDash = `${CLEAN_PARAGRAPH} Growth works—when the funnel is ready.`;
    const longWithDash = `${buildCleanArticle(3000)}\n\nGrowth works—when the funnel is ready.`;
    expect(countEmDashes(shortWithDash)).toBe(1);
    expect(countEmDashes(longWithDash)).toBe(1);
    expect(countAiSlopSignals(shortWithDash)).toBe(1);
    expect(countAiSlopSignals(longWithDash)).toBe(1);

    const threeDashes = `${CLEAN_PARAGRAPH} One—two—three—done.`;
    expect(countAiSlopSignals(threeDashes)).toBe(3);
  });

  it("scores a short and a long equally-sloppy draft comparably (density, not raw count)", () => {
    // Same soft-tell rate per 1,000 words in both: 2 "optimize" per 300 words, 20 per 3,000.
    const shortDraft = insertWordIntoParagraphs(buildCleanArticle(300), "optimize", 2);
    const longDraft = insertWordIntoParagraphs(buildCleanArticle(3000), "optimize", 20);

    const shortScore = countAiSlopSignals(shortDraft);
    const longScore = countAiSlopSignals(longDraft);
    expect(shortScore).toBeGreaterThan(0);
    expect(longScore).toBeGreaterThan(0);
    expect(Math.abs(shortScore - longScore)).toBeLessThanOrEqual(1);
  });
});
