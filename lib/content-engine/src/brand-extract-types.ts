export type Confidence = "high" | "medium" | "low";

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
}
