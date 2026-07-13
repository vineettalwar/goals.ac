export type Confidence = "high" | "medium" | "low";

export interface BrandMemoryExtract {
  summary: string;
  voiceTraits: string[];
  audienceInsights: string[];
  competitorPositioning: string;
  scanSources: string[];
  confidence: Record<string, Confidence>;
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
