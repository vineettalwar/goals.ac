import { describe, expect, it } from "vitest";
import { refreshAngle, refreshTitle } from "./content-decay-service";
import type { DecayedPage } from "@workspace/seo-tools/contentDecayDetector";

function decayed(over: Partial<DecayedPage> = {}): DecayedPage {
  return {
    page: "https://example.com/wordpress-maintenance",
    query: "wordpress maintenance",
    pattern: "position_slide",
    position: 9,
    previousPosition: 4,
    clicks: 20,
    previousClicks: 80,
    impressions: 1200,
    decayScore: 75,
    ...over,
  };
}

describe("refreshTitle", () => {
  it("marks the item as a refresh so it is not mistaken for a new post", () => {
    expect(refreshTitle(decayed())).toBe("Refresh: wordpress maintenance");
  });
});

describe("refreshAngle", () => {
  it("names the URL to update", () => {
    expect(refreshAngle(decayed())).toContain("https://example.com/wordpress-maintenance");
  });

  it("states plainly that this is not a new article", () => {
    expect(refreshAngle(decayed())).toContain("do not write a new article");
  });

  it("tells the writer to keep the URL", () => {
    expect(refreshAngle(decayed())).toContain("Keep the URL");
  });

  it("carries the reason the page was flagged", () => {
    expect(refreshAngle(decayed())).toContain("Slipped from position");
  });

  it("names the query the refresh should strengthen", () => {
    expect(refreshAngle(decayed({ query: "backup plugins" }))).toContain("backup plugins");
  });

  it("works for a click-loss page with no position slide", () => {
    const angle = refreshAngle(
      decayed({ pattern: "click_loss", position: 4, previousPosition: 4, decayScore: 70 }),
    );

    expect(angle).toContain("do not write a new article");
    expect(angle).toContain("meta description");
  });
});
