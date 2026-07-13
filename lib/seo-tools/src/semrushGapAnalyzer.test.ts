import { describe, expect, it } from "vitest";
import { semrushGapToOpportunity } from "./semrushGapAnalyzer";

describe("semrushGapAnalyzer", () => {
  it("maps Semrush gap rows to scored opportunities", () => {
    const opp = semrushGapToOpportunity(
      {
        keyword: "b2b seo strategy",
        searchVolume: 2400,
        keywordDifficulty: 42,
        difficulty: "medium",
        competitorPositions: [3, 7],
      },
      {
        suggestedTitle: "B2B SEO Strategy Playbook",
        suggestedAngle: "Close the gap with a tactical guide.",
        intent: "informational",
      },
    );

    expect(opp.source).toBe("semrush");
    expect(opp.keyword).toBe("b2b seo strategy");
    expect(opp.estimatedVolume).toBe("2,400/mo");
    expect(opp.opportunityScore).toBeGreaterThan(0);
    expect(opp.suggestedTitle).toBe("B2B SEO Strategy Playbook");
  });

  it("uses German fallback copy when language is de", () => {
    const opp = semrushGapToOpportunity(
      {
        keyword: "b2b seo strategie",
        searchVolume: 2400,
        keywordDifficulty: 42,
        difficulty: "medium",
        competitorPositions: [3, 7],
      },
      undefined,
      "de",
    );

    expect(opp.suggestedTitle).toBe("Leitfaden: b2b seo strategie");
    expect(opp.suggestedAngle).toContain("Wettbewerber ranken");
  });
});
