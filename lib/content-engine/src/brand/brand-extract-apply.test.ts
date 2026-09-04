import { describe, expect, it } from "vitest";
import { brandMemoryFromExtract, brandProfileUpdatesFromExtract } from "./brand-extract-apply";
import type { BrandExtract } from "./brand-extract-types";

function baseExtract(deep: BrandExtract["deep"]): BrandExtract {
  return {
    companyName: "Acme",
    industry: "B2B SaaS",
    targetAudience: "Ops teams",
    voiceTone: "Direct and plain",
    primaryKeywords: ["workflow automation"],
    competitorUrls: [],
    confidence: {
      companyName: "high",
      industry: "high",
      targetAudience: "medium",
      voiceTone: "medium",
      primaryKeywords: "medium",
      competitorUrls: "low",
    },
    deep,
  };
}

describe("brandMemoryFromExtract", () => {
  it("returns null when there is no deep extract", () => {
    expect(brandMemoryFromExtract(undefined)).toBeNull();
  });

  it("carries proof assets through to the DB shape", () => {
    const memory = brandMemoryFromExtract({
      writingExamples: [],
      doWords: [],
      dontWords: [],
      antiPatterns: [],
      typicalStructure: "",
      brandGlossary: [],
      productOfferings: [],
      brandMemory: {
        summary: "summary",
        voiceTraits: [],
        audienceInsights: [],
        competitorPositioning: "",
        scanSources: [],
        confidence: {},
        proofAssets: [
          { kind: "metric", claim: "cut onboarding from 14 days to 3", source: "Acme Corp" },
        ],
      },
    });

    expect(memory?.proofAssets).toEqual([
      { kind: "metric", claim: "cut onboarding from 14 days to 3", source: "Acme Corp" },
    ]);
    expect(memory?.lastScannedAt).toBeTruthy();
  });

  it("defaults to an empty array, without throwing, when the extract's brandMemory has no proofAssets key (pre-existing extracts)", () => {
    // Simulates every extract produced before proof-asset support existed:
    // no proofAssets key at all on brandMemory.
    const legacyDeep = {
      writingExamples: [],
      doWords: [],
      dontWords: [],
      antiPatterns: [],
      typicalStructure: "",
      brandGlossary: [],
      productOfferings: [],
      brandMemory: {
        summary: "summary",
        voiceTraits: [],
        audienceInsights: [],
        competitorPositioning: "",
        scanSources: [],
        confidence: {},
      },
    } as unknown as BrandExtract["deep"];

    expect(() => brandMemoryFromExtract(legacyDeep)).not.toThrow();
    expect(brandMemoryFromExtract(legacyDeep)?.proofAssets).toEqual([]);
  });
});

describe("brandProfileUpdatesFromExtract", () => {
  it("includes brandMemory with proofAssets when a deep extract is present", () => {
    const extract = baseExtract({
      writingExamples: [],
      doWords: [],
      dontWords: [],
      antiPatterns: [],
      typicalStructure: "",
      brandGlossary: [],
      productOfferings: [],
      brandMemory: {
        summary: "summary",
        voiceTraits: [],
        audienceInsights: [],
        competitorPositioning: "",
        scanSources: [],
        confidence: {},
        proofAssets: [{ kind: "named_example", claim: "used by 500 logistics teams" }],
      },
    });

    const updates = brandProfileUpdatesFromExtract(extract);
    expect(updates.brandMemory).toMatchObject({
      proofAssets: [{ kind: "named_example", claim: "used by 500 logistics teams" }],
    });
  });

  it("does not throw and omits brandMemory when there is no deep extract", () => {
    const extract = baseExtract(undefined);
    expect(() => brandProfileUpdatesFromExtract(extract)).not.toThrow();
    expect(brandProfileUpdatesFromExtract(extract).brandMemory).toBeUndefined();
  });
});
