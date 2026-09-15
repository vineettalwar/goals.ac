import { describe, expect, it } from "vitest";
import { assembleRoadmapProjectContext } from "./roadmap-project-context";

describe("assembleRoadmapProjectContext", () => {
  it("returns null when there is nothing to tailor to", () => {
    expect(assembleRoadmapProjectContext({})).toBeNull();
  });

  it("includes company facts, GSC, and goals — not voice-skill dump", () => {
    const block = assembleRoadmapProjectContext({
      companyName: "Acme",
      websiteUrl: "https://acme.test",
      industry: "HVAC software",
      targetAudience: "regional contractors",
      primaryKeywords: ["hvac crm", "field service"],
      competitorPositioning: "We sell to independents, they sell enterprise",
      brandSummary: "Field ops platform",
      pageCount: 40,
      gscTopPages: [{ url: "https://acme.test/pricing", impressions: 1200 }],
      goals: [
        {
          objective: "Pipeline from organic",
          targetMetric: "40 SQLs / month",
          baseline: "12",
          icp: "Owner-operators",
        },
      ],
    });

    expect(block).toContain("Company: Acme (https://acme.test)");
    expect(block).toContain("Industry: HVAC software");
    expect(block).toContain("hvac crm");
    expect(block).toContain("Top GSC pages: https://acme.test/pricing (1200 impressions)");
    expect(block).toContain("Pipeline from organic: 40 SQLs / month");
    expect(block).not.toContain("BRAND VOICE SKILL");
    expect(block).not.toContain("writing example");
  });
});
