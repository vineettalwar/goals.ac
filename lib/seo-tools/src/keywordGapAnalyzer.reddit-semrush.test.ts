import { describe, expect, it } from "vitest";
import {
  applySemrushMetricsToGaps,
  opportunitiesFromCompetitorGaps,
  opportunitiesFromRedditThreads,
} from "./keywordGapAnalyzer";

describe("opportunitiesFromRedditThreads", () => {
  it("prefers matching brand keyword and scores from intent", () => {
    const [opp] = opportunitiesFromRedditThreads({
      brandKeywords: ["programmatic seo", "geo audit"],
      threads: [
        {
          title: "Best tools for programmatic SEO in 2026?",
          url: "https://reddit.com/r/SEO/1",
          subreddit: "SEO",
          intentScore: 72,
        },
      ],
    });
    expect(opp?.source).toBe("reddit");
    expect(opp?.keyword).toBe("programmatic seo");
    expect(opp?.opportunityScore).toBe(72);
    expect(opp?.competitorUrl).toBe("https://reddit.com/r/SEO/1");
    expect(opp?.suggestedAngle).toContain("r/SEO");
  });

  it("falls back to cleaned title when no brand keyword matches", () => {
    const [opp] = opportunitiesFromRedditThreads({
      brandKeywords: ["unrelated"],
      threads: [
        {
          title: "How do founders find customers??",
          url: "https://reddit.com/r/startups/2",
          subreddit: "r/startups",
          intentScore: 40,
        },
      ],
    });
    expect(opp?.keyword.toLowerCase()).toContain("founders");
    expect(opp?.source).toBe("reddit");
  });
});

describe("applySemrushMetricsToGaps", () => {
  it("overlays volume and difficulty when metrics exist", () => {
    const gaps = opportunitiesFromCompetitorGaps({
      contentGaps: ["AI citation strategy for B2B"],
      competitorUrl: "https://competitor.com",
      competitorName: "Competitor",
      industry: "SEO",
    });
    expect(gaps[0]?.estimatedVolume).toBe("500-1,500/mo");

    const metrics = new Map([
      ["ai citation strategy for b2b", { searchVolume: 2400, difficulty: "low" as const }],
    ]);
    const enriched = applySemrushMetricsToGaps(gaps, metrics, (n) => `${n}/mo`);
    expect(enriched[0]?.estimatedVolume).toBe("2400/mo");
    expect(enriched[0]?.difficulty).toBe("low");
    expect(enriched[0]?.opportunityScore).toBeGreaterThan(gaps[0]!.opportunityScore);
  });

  it("keeps placeholders when Semrush has no match", () => {
    const gaps = opportunitiesFromCompetitorGaps({
      contentGaps: ["obscure niche topic"],
      competitorUrl: "https://competitor.com",
      competitorName: "Competitor",
      industry: "SEO",
    });
    const enriched = applySemrushMetricsToGaps(gaps, new Map(), (n) => `${n}/mo`);
    expect(enriched[0]?.estimatedVolume).toBe("500-1,500/mo");
    expect(enriched[0]?.difficulty).toBe("medium");
  });
});
