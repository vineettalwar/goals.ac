import { describe, expect, it } from "vitest";
import { geoAuditContentRecommendations } from "./geo-audit-content-recommendations";

describe("geoAuditContentRecommendations", () => {
  it("returns a plain FAQ draft when FAQ schema fails", () => {
    const recs = geoAuditContentRecommendations({
      url: "https://diligent.ai/teammates",
      pageTitle: "Diligent · AI teammates for performance marketing",
      issues: [
        {
          check: "FAQ Schema",
          status: "fail",
          detail: "No FAQ schema found",
          fix: "Add FAQPage JSON-LD",
        },
      ],
    });

    expect(recs[0]?.id).toBe("faq-schema");
    expect(recs[0]?.reason).toBe(
      "No FAQPage markup — answer engines have nothing concrete to quote.",
    );
    expect(recs[0]?.reason).not.toMatch(/surface|publish-ready|technical gaps/i);
    expect(recs[0]?.title).toContain("Frequently Asked Questions");
  });
});
