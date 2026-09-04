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

  it("surfaces a position-24 query with real impressions as low_hanging_fruit", () => {
    const scored = scoreGscQueries(
      rollupGscQueries([
        {
          query: "outsourced accounting services",
          page: "/services/accounting",
          impressions: 800,
          clicks: 8,
          ctr: 0.01,
          position: 24,
        },
      ]),
    );

    expect(scored).toHaveLength(1);
    expect(scored[0]?.pattern).toBe("low_hanging_fruit");
    expect(scored[0]?.opportunityScore).toBeGreaterThanOrEqual(40);
  });

  it("still filters out a position-24 query with thin impressions", () => {
    const scored = scoreGscQueries(
      rollupGscQueries([
        {
          query: "niche accounting question",
          page: "/blog/niche",
          impressions: 40,
          clicks: 0,
          ctr: 0,
          position: 24,
        },
      ]),
    );

    expect(scored).toHaveLength(0);
  });

  it("keeps position-7 queries on the unchanged striking_distance formula", () => {
    const scored = scoreGscQueries(
      rollupGscQueries([
        {
          query: "crm for agencies",
          page: "/blog/crm",
          impressions: 500,
          clicks: 20,
          ctr: 0.04,
          position: 7,
        },
      ]),
    );

    expect(scored).toHaveLength(1);
    expect(scored[0]?.pattern).toBe("striking_distance");
    // Unchanged formula: 55 base + min(20, round((20 - 7) * 1.5)) = 75.
    expect(scored[0]?.opportunityScore).toBe(75);
  });

  it("ranks a heavy position-12 query above a light position-29 query", () => {
    const scored = scoreGscQueries(
      rollupGscQueries([
        {
          query: "position twelve heavy",
          page: "/blog/twelve",
          impressions: 5000,
          clicks: 50,
          ctr: 0.01,
          position: 12,
        },
        {
          query: "position twenty nine light",
          page: "/blog/twentynine",
          impressions: 105,
          clicks: 1,
          ctr: 0.01,
          position: 29,
        },
      ]),
    );

    const heavy = scored.find((s) => s.query === "position twelve heavy");
    const light = scored.find((s) => s.query === "position twenty nine light");
    expect(heavy?.pattern).toBe("low_hanging_fruit");
    expect(heavy?.opportunityScore).toBeGreaterThanOrEqual(40);
    // The thin position-29 query should not clear the score cutoff at all.
    expect(light).toBeUndefined();
    expect(heavy).toBeDefined();
  });

  it("draws the striking_distance / low_hanging_fruit line at positions 10 and 11", () => {
    const atTen = scoreGscQueries(
      rollupGscQueries([
        {
          query: "at position ten",
          page: "/blog/ten",
          impressions: 500,
          clicks: 20,
          ctr: 0.04,
          position: 10,
        },
      ]),
    );
    const atEleven = scoreGscQueries(
      rollupGscQueries([
        {
          query: "at position eleven",
          page: "/blog/eleven",
          impressions: 500,
          clicks: 20,
          ctr: 0.04,
          position: 11,
        },
      ]),
    );

    expect(atTen[0]?.pattern).toBe("striking_distance");
    expect(atEleven[0]?.pattern).toBe("low_hanging_fruit");
  });

  it("draws the low_hanging_fruit boundary at positions 30 and 31", () => {
    const atThirty = scoreGscQueries(
      rollupGscQueries([
        {
          query: "at position thirty",
          page: "/blog/thirty",
          impressions: 2000,
          clicks: 10,
          ctr: 0.005,
          position: 30,
        },
      ]),
    );
    const atThirtyOne = scoreGscQueries(
      rollupGscQueries([
        {
          query: "at position thirty one",
          page: "/blog/thirtyone",
          impressions: 2000,
          clicks: 10,
          ctr: 0.005,
          position: 31,
        },
      ]),
    );

    expect(atThirty[0]?.pattern).toBe("low_hanging_fruit");
    // Past position 30, no band applies, so the query falls under the score
    // cutoff even with strong impressions (unless another pattern rescues it).
    expect(atThirtyOne).toHaveLength(0);
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
