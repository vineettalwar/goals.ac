import { describe, expect, it } from "vitest";
import { scrapeDataForStorage } from "./brand-scrape-orchestrator";
import type { BrandExtract } from "../../brand/brand-extract-types";

const extract: BrandExtract = {
  companyName: "Technical Tip",
  industry: "IT tips",
  targetAudience: "operators",
  voiceTone: "plain",
  primaryKeywords: ["tips"],
  competitorUrls: [],
  confidence: {
    companyName: "high",
    industry: "medium",
    targetAudience: "low",
    voiceTone: "medium",
    primaryKeywords: "medium",
    competitorUrls: "low",
  },
  pageDocuments: [{ sourceUrl: "https://technicaltip.com/", text: "x".repeat(200), sourceType: "website" }],
};

describe("scrapeDataForStorage", () => {
  it("drops page bodies so scrape_data stays small", () => {
    const stored = scrapeDataForStorage(extract);
    expect(stored.companyName).toBe("Technical Tip");
    expect("pageDocuments" in stored).toBe(false);
  });
});
