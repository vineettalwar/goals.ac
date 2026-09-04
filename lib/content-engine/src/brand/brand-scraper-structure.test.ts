import { describe, expect, it } from "vitest";
import { stripHtmlStructured } from "./brand-scraper";
import { computeStyleVector } from "./style-vector";

const PAGE = `
<html><body>
  <h1>Our firm</h1>
  <p>We help homeowners. We are based in Berlin.</p>
  <p>We take the cases other firms turn down.</p>
  <h2>What we do</h2>
  <ul><li>Rental disputes</li><li>Deposit recovery</li><li>Eviction defence</li></ul>
  <p>Call us and we will tell you where you stand. Then we win.</p>
</body></html>
`;

describe("stripHtmlStructured", () => {
  it("keeps paragraph, list and heading breaks that stripHtml collapses", () => {
    const text = stripHtmlStructured(PAGE);
    expect(text).toContain("\n");
    expect(text).toMatch(/^# Our firm/m);
    expect(text).toMatch(/^- Rental disputes/m);
    // A blank line between blocks is what splitParagraphs needs.
    expect(text).toMatch(/\n\n/);
  });

  it("measures structure the flattened text cannot express", () => {
    // The regression this guards: text run through the flattening strip
    // reports every page as one paragraph with no lists and no headings, and
    // those wrong numbers go into the generation prompt as instructions.
    const flattened = PAGE.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();

    const measured = computeStyleVector([{ text: stripHtmlStructured(PAGE) }]);
    const collapsed = computeStyleVector([{ text: flattened }]);

    expect(collapsed.listUsageRatio).toBe(0);
    expect(collapsed.headingDensity).toBe(0);

    expect(measured.listUsageRatio).toBeGreaterThan(0);
    expect(measured.headingDensity).toBeGreaterThan(0);
    expect(measured.avgParagraphSentences).toBeLessThan(collapsed.avgParagraphSentences);
  });
});
