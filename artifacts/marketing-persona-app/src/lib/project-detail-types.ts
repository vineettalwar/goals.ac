export type Confidence = "high" | "medium" | "low";

export interface ScrapeConfidence {
  companyName: Confidence;
  industry: Confidence;
  targetAudience: Confidence;
  voiceTone: Confidence;
  primaryKeywords: Confidence;
  competitorUrls: Confidence;
}

export interface ScrapeData {
  confidence?: ScrapeConfidence;
}

export interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
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
