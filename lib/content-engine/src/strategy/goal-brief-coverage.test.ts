import { describe, expect, it } from "vitest";
import { annotateBriefsWithCoverage, type CompiledBriefDraft } from "./goal-brief-compiler";
import type { CoveredPost } from "./content-coverage";

const SITE: CoveredPost[] = [
  {
    url: "https://example.com/wordpress-maintenance-plans",
    title: "WordPress Maintenance Plans",
    excerpt: "What a maintenance plan covers and how to price one.",
  },
  { url: "https://example.com/wordpress-security", title: "WordPress Security Checklist" },
];

function brief(overrides: Partial<CompiledBriefDraft> = {}): CompiledBriefDraft {
  return {
    workingTitle: "Untitled",
    targetKeywordCluster: "wordpress maintenance plans",
    searchIntent: "commercial",
    funnelStage: "mofu",
    angle: "An angle",
    format: "blog_post",
    wordCount: 1200,
    successMetric: "leads",
    ...overrides,
  };
}

describe("annotateBriefsWithCoverage", () => {
  it("flags a brief that duplicates an existing post", () => {
    const [annotated] = annotateBriefsWithCoverage([brief()], SITE);

    expect(annotated!.coverage?.verdict).toBe("covered");
    expect(annotated!.coverage?.existingUrl).toBe(
      "https://example.com/wordpress-maintenance-plans",
    );
    expect(annotated!.coverage?.reason).toContain("refresh");
  });

  it("keeps the flagged brief rather than dropping it", () => {
    const annotated = annotateBriefsWithCoverage([brief(), brief()], SITE);

    expect(annotated).toHaveLength(2);
  });

  it("passes a genuinely new topic as clear with no reason", () => {
    const [annotated] = annotateBriefsWithCoverage(
      [brief({ targetKeywordCluster: "shopify theme performance" })],
      SITE,
    );

    expect(annotated!.coverage?.verdict).toBe("clear");
    expect(annotated!.coverage?.reason).toBeNull();
  });

  it("populates internal link targets from the site graph", () => {
    const [annotated] = annotateBriefsWithCoverage(
      [brief({ targetKeywordCluster: "wordpress maintenance plans" })],
      SITE,
    );

    expect(annotated!.internalLinkTargets?.length).toBeGreaterThan(0);
    expect(annotated!.internalLinkTargets![0]).toHaveProperty("url");
    expect(annotated!.internalLinkTargets![0]).toHaveProperty("title");
  });

  it("falls back to the working title when no keyword cluster is set", () => {
    const [annotated] = annotateBriefsWithCoverage(
      [brief({ targetKeywordCluster: "", workingTitle: "WordPress Maintenance Plans" })],
      SITE,
    );

    expect(annotated!.coverage?.verdict).toBe("covered");
  });

  it("leaves briefs untouched when the site graph is empty", () => {
    const input = [brief()];
    const annotated = annotateBriefsWithCoverage(input, []);

    expect(annotated).toBe(input);
    expect(annotated[0]!.coverage).toBeUndefined();
  });
});
