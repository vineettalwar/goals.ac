import type { BrandMemoryProofAsset } from "@workspace/db";

export type Confidence = "high" | "medium" | "low";

/**
 * Extraction-time shape of a proof asset. Structurally identical to
 * `BrandMemoryProofAsset` (the DB jsonb shape) and to `ProofAsset` (the
 * content-engine consumer in `content/personalization.ts`), re-exported
 * here rather than redeclared since `content-engine` already depends on
 * `@workspace/db` one-way (see `brand-extract-apply.ts`), so importing it
 * carries no circular-import risk.
 */
export type ProofAssetExtract = BrandMemoryProofAsset;

export interface BrandMemoryExtract {
  summary: string;
  voiceTraits: string[];
  audienceInsights: string[];
  competitorPositioning: string;
  scanSources: string[];
  confidence: Record<string, Confidence>;
  /**
   * Verified proof points pulled verbatim (or near-verbatim) from the
   * customer's own scraped pages. Empty is the expected, correct result for
   * most sites. See the extraction prompt in `brand-scraper.ts`.
   */
  proofAssets: ProofAssetExtract[];
}

export interface BrandDeepExtract {
  writingExamples: string[];
  doWords: string[];
  dontWords: string[];
  antiPatterns: string[];
  typicalStructure: string;
  brandGlossary: string[];
  productOfferings: string[];
  brandMemory: BrandMemoryExtract;
}

export interface BrandPageDocument {
  sourceUrl: string;
  title?: string;
  text: string;
  sourceType: "website" | "cms";
}

export interface BrandExtract {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
  confidence: {
    companyName: Confidence;
    industry: Confidence;
    targetAudience: Confidence;
    voiceTone: Confidence;
    primaryKeywords: Confidence;
    competitorUrls: Confidence;
  };
  deep?: BrandDeepExtract;
  scannedPages?: string[];
  pageDocuments?: BrandPageDocument[];
  discoveryMeta?: {
    sitemap: boolean;
    gsc: boolean;
    cms: boolean;
    homepage: boolean;
    sitemapUrlCount?: number;
    gscPageCount?: number;
    cmsPostCount?: number;
  };
}
