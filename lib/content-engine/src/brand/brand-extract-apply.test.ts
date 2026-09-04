import { describe, expect, it } from "vitest";
import { brandMemoryFromExtract, brandProfileUpdatesFromExtract } from "./brand-extract-apply";
import type { BrandExtract } from "./brand-extract-types";
import type { StyleVector } from "./style-vector";

function fakeStyleVector(overrides: Partial<StyleVector>): StyleVector {
  return {
    avgSentenceWords: 0,
    sentenceLengthStdDev: 0,
    avgParagraphSentences: 0,
    longSentenceRatio: 0,
    shortSentenceRatio: 0,
    questionRatio: 0,
    exclamationRatio: 0,
    firstPersonRatio: 0,
    secondPersonRatio: 0,
    contractionRatio: 0,
    avgWordLength: 0,
    complexWordRatio: 0,
    fleschReadingEase: 0,
    readingGradeLevel: 0,
    vocabularyTier: "plain",
    listUsageRatio: 0,
    headingDensity: 0,
    sampleWordCount: 0,
    sampleDocumentCount: 0,
    computedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

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

  it("carries a usable style vector and sufficiency into brand memory", () => {
    const styleVector = fakeStyleVector({
      avgSentenceWords: 14.2,
      sentenceLengthStdDev: 3.1,
      sampleWordCount: 900,
      sampleDocumentCount: 4,
    });
    const styleSufficiency = {
      sufficient: true,
      score: 0.8,
      totalWords: 900,
      usablePages: 4,
      reasons: [],
    };
    const memory = brandMemoryFromExtract(
      {
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
          proofAssets: [],
        },
      },
      styleVector,
      styleSufficiency,
    );

    expect(memory?.styleVector).toEqual(styleVector);
    expect(memory?.styleSufficiency).toEqual(styleSufficiency);
  });

  it("never writes an all-zero style vector into brand memory", () => {
    const zeroVector = fakeStyleVector({});
    const memory = brandMemoryFromExtract(
      {
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
          proofAssets: [],
        },
      },
      zeroVector,
    );

    expect(memory?.styleVector).toBeUndefined();
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

  it("does not throw and omits brandMemory when there is no deep extract and no style data", () => {
    const extract = baseExtract(undefined);
    expect(() => brandProfileUpdatesFromExtract(extract)).not.toThrow();
    expect(brandProfileUpdatesFromExtract(extract).brandMemory).toBeUndefined();
  });

  it("keeps style data when the deep extract came back empty", () => {
    // A site too thin for the deep analysis is exactly the site whose
    // sufficiency verdict drives the onboarding questionnaire, so the
    // verdict has to outlive a missing deep extract.
    const extract: BrandExtract = {
      ...baseExtract(undefined),
      styleVector: fakeStyleVector({ avgSentenceWords: 12, sampleWordCount: 400, sampleDocumentCount: 2 }),
      styleSufficiency: {
        sufficient: false,
        score: 30,
        totalWords: 400,
        usablePages: 2,
        reasons: ["Only 2 pages had enough text to read your style"],
      },
    };

    const updates = brandProfileUpdatesFromExtract(extract);
    expect(updates.brandMemory).toMatchObject({
      styleSufficiency: { sufficient: false, usablePages: 2 },
      styleVector: { avgSentenceWords: 12 },
    });
  });
});
