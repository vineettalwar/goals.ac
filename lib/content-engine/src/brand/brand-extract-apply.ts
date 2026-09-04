import type { BrandExtract } from "./brand-extract-types";
import type { BrandMemory } from "@workspace/db";

export function brandMemoryFromExtract(deep: BrandExtract["deep"]): BrandMemory | null {
  if (!deep?.brandMemory) return null;
  return {
    ...deep.brandMemory,
    // Older extracts (before proof-asset support) carry no proofAssets key;
    // default to [] so downstream consumers never see it as undefined.
    proofAssets: deep.brandMemory.proofAssets ?? [],
    lastScannedAt: new Date().toISOString(),
  };
}

export function brandProfileUpdatesFromExtract(extract: BrandExtract): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    companyName: extract.companyName,
    industry: extract.industry,
    targetAudience: extract.targetAudience,
    voiceTone: extract.voiceTone,
    primaryKeywords: extract.primaryKeywords,
    competitorUrls: extract.competitorUrls,
  };

  if (extract.deep) {
    if (extract.deep.writingExamples.length) updates.writingExamples = extract.deep.writingExamples;
    if (extract.deep.doWords.length) updates.doWords = extract.deep.doWords;
    if (extract.deep.dontWords.length) updates.dontWords = extract.deep.dontWords;
    if (extract.deep.antiPatterns.length) updates.antiPatterns = extract.deep.antiPatterns;
    if (extract.deep.typicalStructure) updates.typicalStructure = extract.deep.typicalStructure;
    if (extract.deep.brandGlossary.length) updates.brandGlossary = extract.deep.brandGlossary;
    if (extract.deep.productOfferings.length) updates.productOfferings = extract.deep.productOfferings;
    const memory = brandMemoryFromExtract(extract.deep);
    if (memory) updates.brandMemory = memory;
  }

  return updates;
}
