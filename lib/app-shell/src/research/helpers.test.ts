import { describe, expect, it } from "vitest";
import {
  articleIdeaSourceLabel,
  countKeywordSignals,
  pickTopArticleIdeas,
  researchSignalsStorageKey,
} from "./helpers";

describe("countKeywordSignals", () => {
  it("counts gsc, semrush, and competitor_gap sources", () => {
    expect(
      countKeywordSignals([
        { source: "gsc_query" },
        { source: "gsc_query" },
        { source: "semrush" },
        { source: "competitor_gap" },
        { source: "manual" },
        { source: null },
      ]),
    ).toEqual({ gsc: 2, semrush: 1, competitorGap: 1, total: 6 });
  });

  it("handles empty", () => {
    expect(countKeywordSignals([])).toEqual({
      gsc: 0,
      semrush: 0,
      competitorGap: 0,
      total: 0,
    });
  });
});

describe("researchSignalsStorageKey", () => {
  it("scopes by project id", () => {
    expect(researchSignalsStorageKey(4)).toBe("research:signals:4");
    expect(researchSignalsStorageKey("12")).toBe("research:signals:12");
  });
});

describe("pickTopArticleIdeas", () => {
  const rows = [
    {
      id: 1,
      keyword: "b2b seo",
      suggestedTitle: "B2B SEO playbook",
      suggestedAngle: "Tactical guide",
      source: "semrush",
      opportunityScore: 40,
      status: "open",
    },
    {
      id: 2,
      keyword: "B2B SEO",
      suggestedTitle: "Duplicate keyword",
      suggestedAngle: "Skip me",
      source: "gsc_query",
      opportunityScore: 90,
      status: "open",
    },
    {
      id: 3,
      keyword: "content refresh",
      suggestedTitle: "When to refresh",
      suggestedAngle: "Decay signals",
      source: "rank_drop",
      opportunityScore: 70,
      status: "open",
    },
    {
      id: 4,
      keyword: "queued only",
      suggestedTitle: "Queued",
      suggestedAngle: "",
      source: "manual",
      opportunityScore: 99,
      status: "queued",
    },
    {
      id: 5,
      keyword: "geo audit checklist",
      suggestedTitle: "GEO audit checklist",
      suggestedAngle: "AI citation gaps",
      source: "competitor_gap",
      opportunityScore: 55,
      status: "open",
    },
    {
      id: 6,
      keyword: "programmatic seo",
      suggestedTitle: "Programmatic SEO for startups",
      suggestedAngle: "Templates that rank",
      source: "ai_analysis",
      opportunityScore: 60,
      status: "open",
    },
  ];

  it("returns top unique open ideas by score", () => {
    const picked = pickTopArticleIdeas(rows, 4);
    expect(picked.map((p) => p.id)).toEqual([2, 3, 6, 5]);
    expect(picked).toHaveLength(4);
    expect(picked[0]?.keyword).toBe("B2B SEO");
  });

  it("caps at limit and skips empty keywords", () => {
    expect(pickTopArticleIdeas(rows, 2)).toHaveLength(2);
    expect(
      pickTopArticleIdeas([{ id: 9, keyword: "  ", opportunityScore: 100, status: "open" }], 4),
    ).toEqual([]);
  });

  it("boosts ideas that match brand primary keywords", () => {
    const picked = pickTopArticleIdeas(rows, 4, {
      primaryKeywords: ["geo audit", "programmatic seo"],
      industry: "B2B SaaS",
    });
    // id 5 (55+24) and id 6 (60+24) beat id 3 (70) once brand boost applies
    expect(picked.map((p) => p.id).slice(0, 3)).toEqual([6, 5, 2]);
  });
});

describe("articleIdeaSourceLabel", () => {
  it("maps known sources", () => {
    expect(articleIdeaSourceLabel("gsc_query")).toBe("Search Console");
    expect(articleIdeaSourceLabel("reddit")).toBe("Reddit");
    expect(articleIdeaSourceLabel("custom_src")).toBe("custom_src");
  });
});
