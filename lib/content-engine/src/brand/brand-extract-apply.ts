import type { BrandExtract } from "./brand-extract-types";
import type { BrandMemory } from "@workspace/db";
import { isEmptyStyleVector } from "./style-vector";

export function brandMemoryFromExtract(
  deep: BrandExtract["deep"],
  styleVector?: BrandExtract["styleVector"],
  styleSufficiency?: BrandExtract["styleSufficiency"],
): BrandMemory | null {
  const measuredStyle = styleVector && !isEmptyStyleVector(styleVector) ? styleVector : undefined;
  // Style data has to survive on its own. A site too thin for the deep
  // analysis to say anything is exactly the site whose styleSufficiency
  // drives the onboarding questionnaire, so gating this on deep.brandMemory
  // would drop the signal in the one case it exists for.
  if (!deep?.brandMemory && !measuredStyle && !styleSufficiency) return null;

  const memory = deep?.brandMemory;
  return {
    ...(memory ?? {}),
    // Older extracts (before proof-asset support) carry no proofAssets key;
    // default to [] so downstream consumers never see it as undefined.
    proofAssets: memory?.proofAssets ?? [],
    lastScannedAt: new Date().toISOString(),
    ...(measuredStyle ? { styleVector: measuredStyle } : {}),
    ...(styleSufficiency ? { styleSufficiency } : {}),
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
  }

  const memory = brandMemoryFromExtract(extract.deep, extract.styleVector, extract.styleSufficiency);
  if (memory) updates.brandMemory = memory;

  return updates;
}
