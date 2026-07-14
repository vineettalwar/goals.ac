import type { BrandExtract, Confidence } from "@workspace/content-engine/brand/brand-extract-types";

export type { Confidence };

export type ScrapeConfidence = BrandExtract["confidence"];

export type ScrapeData = Partial<Omit<BrandExtract, "confidence">> & {
  confidence?: ScrapeConfidence;
};

export interface ProjectImageSettings {
  stockProvider?: "auto" | "unsplash" | "pexels";
  autoFeaturedImage?: boolean;
  autoInlineImages?: boolean;
  maxInlineImages?: number;
  includeAttribution?: boolean;
}

export interface ProjectTranslationSettings {
  encryptedDeeplApiKey?: string;
  deeplRefinementEnabled?: boolean;
  deeplGlossaryId?: string;
}

export interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
  humanizationLevel?: "off" | "light" | "strong";
  writingSample?: string | null;
  imageSettings?: ProjectImageSettings;
  translationSettings?: ProjectTranslationSettings;
}

export interface BrandProfile {
  id: number;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
  writingExamples?: string[];
  brandGlossary?: string[];
  antiPatterns?: string[];
  typicalStructure?: string;
  doWords?: string[];
  dontWords?: string[];
  brandColors?: string[];
  productOfferings?: string[];
  updatedAt?: string;
}

export interface WebsiteProject {
  id: number;
  name: string;
  url: string;
  pageCount?: number;
  scrapeStatus: string | null;
  scrapeData: ScrapeData | null;
  contentStyle: ContentStyle | null;
  brandProfile: BrandProfile | null;
}

export interface ProjectContent {
  contentStrategies: Array<{
    id: number;
    industry: string;
    location: string;
    stage: string;
    createdAt: string;
  }>;
  seoArticles: Array<{
    id: number;
    title: string;
    primaryKeyword: string;
    wordCount: number;
    status: string;
    createdAt: string;
  }>;
  geoAudits: Array<{
    id: number;
    url: string;
    geoScore: number;
    createdAt: string;
  }>;
  roadmaps: Array<{
    id: number;
    slug: string;
    industry: string;
    location: string;
    stage: string;
    createdAt: string;
  }>;
}

export const PROJECT_TABS = ["brand", "voice", "content", "publishing"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export function isProjectTab(value: string | null | undefined): value is ProjectTab {
  return PROJECT_TABS.includes(value as ProjectTab);
}
