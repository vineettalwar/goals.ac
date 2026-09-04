import { describe, expect, it } from "vitest";
import {
  evaluateStyleSufficiency,
  STYLE_SUFFICIENCY_MIN_PAGES,
  STYLE_SUFFICIENCY_MIN_WORDS,
} from "./style-sufficiency";

function wordsText(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

describe("evaluateStyleSufficiency", () => {
  it("is insufficient for a single thin page", () => {
    const result = evaluateStyleSufficiency({
      pageDocuments: [{ text: wordsText(50) }],
    });
    expect(result.sufficient).toBe(false);
    expect(result.usablePages).toBe(0);
    expect(result.totalWords).toBe(50);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("page"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("word"))).toBe(true);
  });

  it("is sufficient with a comfortably large corpus at high confidence", () => {
    const result = evaluateStyleSufficiency({
      pageDocuments: [wordsText(600), wordsText(600), wordsText(600), wordsText(600)].map((text) => ({
        text,
      })),
      voiceToneConfidence: "high",
    });
    expect(result.usablePages).toBe(4);
    expect(result.totalWords).toBe(2400);
    expect(result.sufficient).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("is insufficient when there are enough words but too few usable pages", () => {
    const result = evaluateStyleSufficiency({
      pageDocuments: [{ text: wordsText(1500) }, { text: wordsText(50) }],
    });
    expect(result.totalWords).toBe(1550);
    expect(result.usablePages).toBe(1);
    expect(result.sufficient).toBe(false);
    expect(result.reasons.some((r) => r.includes("page"))).toBe(true);
  });

  it("is insufficient when there are enough pages but too few total words", () => {
    const result = evaluateStyleSufficiency({
      pageDocuments: [{ text: wordsText(130) }, { text: wordsText(130) }, { text: wordsText(130) }],
    });
    expect(result.usablePages).toBe(STYLE_SUFFICIENCY_MIN_PAGES);
    expect(result.totalWords).toBeLessThan(STYLE_SUFFICIENCY_MIN_WORDS);
    expect(result.sufficient).toBe(false);
  });

  it("low voice-tone confidence tips a borderline corpus to insufficient", () => {
    const borderlinePages = [wordsText(400), wordsText(400), wordsText(400)].map((text) => ({ text }));

    const highConfidence = evaluateStyleSufficiency({
      pageDocuments: borderlinePages,
      voiceToneConfidence: "high",
    });
    const lowConfidence = evaluateStyleSufficiency({
      pageDocuments: borderlinePages,
      voiceToneConfidence: "low",
    });

    expect(highConfidence.usablePages).toBe(3);
    expect(highConfidence.totalWords).toBe(1200);
    expect(highConfidence.sufficient).toBe(true);

    expect(lowConfidence.sufficient).toBe(false);
    expect(lowConfidence.score).toBeLessThan(highConfidence.score);
    expect(lowConfidence.reasons.some((r) => r.toLowerCase().includes("confidence"))).toBe(true);
  });

  it("a large ample corpus survives a low-confidence extraction", () => {
    const amplePages = Array.from({ length: 6 }, () => ({ text: wordsText(500) }));
    const result = evaluateStyleSufficiency({
      pageDocuments: amplePages,
      voiceToneConfidence: "low",
    });
    expect(result.totalWords).toBe(3000);
    expect(result.usablePages).toBe(6);
    expect(result.sufficient).toBe(true);
  });

  it("keeps score within 0-100", () => {
    const zero = evaluateStyleSufficiency({ pageDocuments: [] });
    expect(zero.score).toBeGreaterThanOrEqual(0);
    expect(zero.score).toBeLessThanOrEqual(100);
    expect(zero.sufficient).toBe(false);

    const huge = evaluateStyleSufficiency({
      pageDocuments: Array.from({ length: 20 }, () => ({ text: wordsText(1000) })),
    });
    expect(huge.score).toBeLessThanOrEqual(100);
  });
});
