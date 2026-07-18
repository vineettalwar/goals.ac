import { describe, expect, it } from "vitest";
import {
  buildDefaultPrompts,
  shortAudienceLabel,
  shortIndustryLabel,
} from "./llmVisibilityChecker";

describe("shortAudienceLabel", () => {
  it("keeps short labels", () => {
    expect(shortAudienceLabel("SMB founders")).toBe("SMB founders");
  });

  it("rejects ICP paragraphs", () => {
    const icp =
      "The ideal customer profile includes SMEs, startups, and mid-market teams facing technical gaps.";
    expect(shortAudienceLabel(icp)).toBe("B2B teams");
  });
});

describe("shortIndustryLabel", () => {
  it("strips parenthetical expansions", () => {
    expect(
      shortIndustryLabel(
        "Technology Consulting and Software Development (SaaS/Digital Transformation)",
      ),
    ).toBe("Technology Consulting and Software Development");
  });
});

describe("buildDefaultPrompts", () => {
  it("does not dump ICP text into brand prompts", () => {
    const prompts = buildDefaultPrompts({
      brandName: "Some Tech Work",
      industry: "Technology Consulting and Software Development (SaaS/Digital Transformation)",
      targetAudience:
        "The ideal customer profile includes SMEs, startups, and mid-market teams facing technical gaps or needing to scale their operations.",
      primaryKeywords: ["AI Automation"],
      competitorUrls: [],
    });

    const brand = prompts.find((p) => p.prompt.includes("tools and platforms"));
    expect(brand?.prompt).toBe(
      "What are the best Technology Consulting and Software Development tools and platforms for B2B teams?",
    );
    expect(brand?.prompt.includes("ideal customer")).toBe(false);
    expect(brand?.prompt.includes("SaaS")).toBe(false);
  });
});
