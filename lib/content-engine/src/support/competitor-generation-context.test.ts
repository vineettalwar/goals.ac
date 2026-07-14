import { describe, expect, it } from "vitest";
import { buildCompetitorPromptBlock } from "./competitor-prompt-block";

describe("buildCompetitorPromptBlock", () => {
  it("returns empty string when no competitor context exists", () => {
    expect(
      buildCompetitorPromptBlock({
        competitorUrls: [],
        analyses: [],
      }),
    ).toBe("");
  });

  it("includes positioning and known competitors", () => {
    const block = buildCompetitorPromptBlock({
      competitorUrls: ["competitor.com", "https://www.rival.io"],
      analyses: [],
      competitorPositioning: "We focus on SMBs, they target enterprise",
    });

    expect(block).toContain("COMPETITIVE LANDSCAPE:");
    expect(block).toContain("Brand positioning vs competitors");
    expect(block).toContain("competitor.com, rival.io");
    expect(block).toContain("Differentiation requirements");
  });

  it("marks the focused competitor in analysis output", () => {
    const block = buildCompetitorPromptBlock({
      competitorUrls: ["https://competitor.com"],
      analyses: [
        {
          competitorUrl: "https://competitor.com",
          competitorName: "Competitor Inc",
          contentGaps: ["Missing how-to guides"],
          quickWins: ["Publish comparison posts"],
          weaknesses: ["Thin content"],
          threatLevel: "high",
        },
      ],
      focusUrl: "competitor.com",
    });

    expect(block).toContain("Primary competitor to differentiate against for this piece: competitor.com");
    expect(block).toContain(">> Competitor Inc (competitor.com)");
    expect(block).toContain("Content gaps to exploit: Missing how-to guides");
  });
});
