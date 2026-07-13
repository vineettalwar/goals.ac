import { describe, expect, it } from "vitest";
import {
  rollupGscQueries,
  scoreGscQueries,
  gscScoredToGapOpportunity,
} from "./gscOpportunityScorer";

describe("gscOpportunityScorer", () => {
  it("scores striking-distance queries", () => {
    const rollup = rollupGscQueries([
      {
        query: "b2b lead generation",
        page: "/blog/leads",
        impressions: 500,
        clicks: 20,
        ctr: 0.04,
        position: 8,
      },
    ]);

    const scored = scoreGscQueries(rollup);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0]?.query).toBe("b2b lead generation");
    expect(scored[0]?.opportunityScore).toBeGreaterThanOrEqual(40);
  });

  it("ignores low-impression noise", () => {
    const scored = scoreGscQueries(
      rollupGscQueries([
        {
          query: "tiny query",
          page: null,
          impressions: 5,
          clicks: 0,
          ctr: 0,
          position: 15,
        },
      ]),
    );
    expect(scored).toHaveLength(0);
  });

  it("maps scored query to gap opportunity", () => {
    const opp = gscScoredToGapOpportunity({
      query: "saas pricing page",
      impressions: 1200,
      clicks: 30,
      ctr: 0.025,
      position: 6,
      opportunityScore: 72,
      pattern: "striking_distance",
      topPage: "/pricing",
    });
    expect(opp.source).toBe("gsc_query");
    expect(opp.keyword).toBe("saas pricing page");
    expect(opp.suggestedTitle).toContain("saas pricing page");
  });
});
