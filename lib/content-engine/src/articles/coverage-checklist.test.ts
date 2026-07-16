import { describe, expect, it } from "vitest";
import { scoreCoverageChecklist } from "./coverage-checklist";

const body = `# B2B lead generation guide

B2B lead generation needs a clear funnel and ICP scoring before outreach.

## Qualification framework

Use intent signals to prioritize accounts.
`;

describe("scoreCoverageChecklist", () => {
  it("marks secondary keywords covered when the phrase appears in the body", () => {
    const result = scoreCoverageChecklist({
      bodyMarkdown: body,
      secondaryKeywords: ["ICP scoring", "cold email templates"],
    });

    expect(result.items).toEqual([
      { term: "ICP scoring", type: "secondary", covered: true },
      { term: "cold email templates", type: "secondary", covered: false },
    ]);
    expect(result.coveredCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.percent).toBe(50);
  });

  it("covers a PAA question via significant-word overlap without an exact phrase match", () => {
    const result = scoreCoverageChecklist({
      bodyMarkdown: body,
      peopleAlsoAsk: ["What is the qualification framework for B2B lead generation?"],
    });

    expect(result.items[0]?.covered).toBe(true);
    expect(result.items[0]?.type).toBe("paa");
  });

  it("treats rival H2 topics as a distinct bucket and flags missing ones", () => {
    const result = scoreCoverageChecklist({
      bodyMarkdown: body,
      h2Topics: ["Qualification framework", "Enterprise ABM cold calling"],
    });

    expect(result.items[0]).toEqual({
      term: "Qualification framework",
      type: "h2",
      covered: true,
    });
    expect(result.items[1]?.covered).toBe(false);
  });

  it("returns zeros when no terms are supplied", () => {
    const result = scoreCoverageChecklist({ bodyMarkdown: body });
    expect(result).toEqual({ items: [], coveredCount: 0, totalCount: 0, percent: 0 });
  });

  it("dedupes case-insensitive duplicate terms within a bucket", () => {
    const result = scoreCoverageChecklist({
      bodyMarkdown: body,
      secondaryKeywords: ["ICP scoring", "icp scoring", " ICP Scoring "],
    });
    expect(result.items).toHaveLength(1);
  });
});
