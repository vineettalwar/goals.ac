import { describe, expect, it } from "vitest";
import { sanitizeAiProse, sanitizeAiSlopPhrases } from "./ai-writing-rules";

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
