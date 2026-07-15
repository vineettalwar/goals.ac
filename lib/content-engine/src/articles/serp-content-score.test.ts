import { describe, expect, it } from "vitest";
import {
  buildCompetitorTopicDiff,
  computeH2Coverage,
  scoreDualContentQuality,
  scoreSerpCoverage,
} from "./serp-content-score";

const richBody = `# B2B lead generation guide

B2B lead generation needs a clear funnel and published proof.

## Qualification framework

Use ICP scoring and intent signals before sales outreach.

## Outreach sequences

- LinkedIn + email cadence
- Follow-up checklist

### What is B2B lead generation?

A process for attracting demand-ready accounts.

### How long does B2B lead generation take?

Usually 30–90 days depending on channel mix.

### Which channels work best for B2B lead generation?

Search, LinkedIn, and partner referrals.

| Channel | Role |
| --- | --- |
| Search | Intent |
| LinkedIn | Trust |
`;

describe("scoreSerpCoverage", () => {
  it("flags missing keyword and competitor angles on a thin draft", () => {
    const result = scoreSerpCoverage({
      bodyMarkdown: "## Hello\n\nShort copy.",
      metaTitle: "Hello world",
      targetKeyword: "b2b seo",
      competitorTitles: ["Complete B2B SEO playbook for startups"],
    });

    expect(result.gaps.some((gap) => gap.includes("b2b seo"))).toBe(true);
    expect(result.gaps.some((gap) => gap.includes("Complete B2B SEO"))).toBe(true);
    expect(result.total).toBeLessThan(70);
    expect(result.h2Coverage).toEqual({ covered: 0, total: 1, percent: 0 });
  });

  it("scores higher when keyword, FAQ, lists, and rival topics are covered", () => {
    const result = scoreSerpCoverage({
      bodyMarkdown: richBody,
      metaTitle: "B2B lead generation guide for startups",
      targetKeyword: "B2B lead generation",
      competitorTitles: ["B2B lead generation qualification framework"],
      peopleAlsoAsk: [
        "What is B2B lead generation?",
        "How long does B2B lead generation take?",
      ],
      serpFeatures: { featuredSnippet: { title: "Definition" } },
    });

    expect(result.total).toBeGreaterThanOrEqual(55);
    expect(result.breakdown).toHaveLength(4);
    expect(result.h2Coverage.covered).toBe(1);
    expect(result.h2Coverage.total).toBe(1);
    expect(result.h2Coverage.percent).toBe(100);
  });

  it("counts serpFeatures topResults titles toward H2 coverage", () => {
    const result = scoreSerpCoverage({
      bodyMarkdown: richBody,
      targetKeyword: "B2B lead generation",
      serpFeatures: {
        topResults: [
          { title: "B2B lead generation qualification framework" },
          { title: "Enterprise ABM cold calling scripts 2026" },
        ],
      },
    });

    expect(result.h2Coverage).toEqual({ covered: 1, total: 2, percent: 50 });
  });
});

describe("computeH2Coverage", () => {
  it("uses only ## H2 lines (not H3) against rival topics at 0.25 overlap", () => {
    const body = `# Title

## Qualification framework

Details here.

### Unrelated FAQ question about cold outreach?
`;
    expect(
      computeH2Coverage(body, [
        "B2B lead generation qualification framework",
        "Cold outreach scripts",
      ]),
    ).toEqual({ covered: 1, total: 2, percent: 50 });
  });

  it("returns zeros when there are no rival topics", () => {
    expect(computeH2Coverage(richBody, [])).toEqual({ covered: 0, total: 0, percent: 0 });
  });
});

describe("buildCompetitorTopicDiff", () => {
  it("marks overlapping SERP titles covered and others missing", () => {
    const diff = buildCompetitorTopicDiff({
      bodyMarkdown: richBody,
      competitorTitles: [
        "B2B lead generation qualification framework",
        "Enterprise ABM cold calling scripts 2026",
      ],
    });

    expect(diff).toHaveLength(2);
    expect(diff[0]?.covered).toBe(true);
    expect(diff[1]?.covered).toBe(false);
  });
});

describe("scoreDualContentQuality", () => {
  it("combines editorial and SERP scores and exposes competitorDiff", () => {
    const dual = scoreDualContentQuality({
      bodyMarkdown: richBody,
      wordCount: 280,
      metaTitle: "B2B lead generation guide for startups",
      metaDescription: "Practical B2B lead generation playbook with funnel, proof, and FAQ.",
      targetKeyword: "B2B lead generation",
      citations: [{ text: "HubSpot research", url: "https://www.hubspot.com/research" }],
      faqSection: [
        { question: "What is B2B lead generation?", answer: "Attracting demand-ready accounts." },
        { question: "How long does it take?", answer: "Usually 30–90 days." },
      ],
      jsonLdSchema: { "@type": "Article" },
      internalLinkSuggestions: [{ anchorText: "pipeline scoring", suggestedSlug: "/blog/pipeline" }],
      competitorTitles: ["B2B lead generation qualification framework"],
      peopleAlsoAsk: ["What is B2B lead generation?"],
    });

    expect(dual.combined).toBe(
      Math.round(dual.editorial.total * 0.55 + dual.serp.total * 0.45),
    );
    expect(dual.competitorDiff.length).toBeGreaterThan(0);
    expect(dual.serp.h2Coverage.total).toBeGreaterThan(0);
    expect(typeof dual.publishReady).toBe("boolean");
  });
});
