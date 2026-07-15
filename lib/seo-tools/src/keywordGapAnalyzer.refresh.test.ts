import { describe, expect, it } from "vitest";
import { explainOpportunityScore, rankDropToOpportunity } from "./keywordGapAnalyzer";

describe("explainOpportunityScore content_refresh", () => {
  it("includes a source factor for content_refresh opportunities", () => {
    const factors = explainOpportunityScore({
      opportunityScore: 80,
      estimatedVolume: "1200/mo",
      difficulty: "medium",
      source: "content_refresh",
    });
    const intent = factors.find((factor) => factor.label === "Intent fit");
    expect(intent?.detail).toMatch(/GSC clicks declined/i);
  });
});

describe("rankDropToOpportunity", () => {
  it("builds a refresh-oriented opportunity from a rank drop", () => {
    const opp = rankDropToOpportunity({
      keyword: "b2b seo",
      previousPosition: 4,
      currentPosition: 12,
    });
    expect(opp.keyword).toBe("b2b seo");
    expect(opp.suggestedAngle).toMatch(/#4/);
    expect(opp.suggestedAngle).toMatch(/#12/);
    expect(opp.opportunityScore).toBeGreaterThan(0);
  });
});
