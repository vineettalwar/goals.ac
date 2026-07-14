"use client";

import { isPlaceholderUrl, sanitizeBrandExtract } from "@workspace/content-engine/brand/brand-extract-sanitize";
import { SUPPORTED_LANGUAGES } from "@/lib/utils/supported-languages";
import type { WebsiteProject } from "@/lib/projects/project-detail-types";

export const TONE_PRESETS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "conversational", label: "Conversational" },
] as const;

export const READING_LEVELS = [
  { value: "general", label: "General (accessible to everyone)" },
  { value: "intermediate", label: "Intermediate (assumes some domain knowledge)" },
  { value: "expert", label: "Expert (deep technical audience)" },
] as const;

export const LANGUAGES = SUPPORTED_LANGUAGES;

export const WORD_COUNT_PRESETS = [
  { label: "Short", value: 400 },
  { label: "Medium", value: 800 },
  { label: "Long", value: 1500 },
];

export const HUMANIZATION_LEVELS = [
  { value: "off", label: "Off", description: "Publish the first AI draft as-is." },
  { value: "light", label: "Light", description: "Polish rhythm and remove AI-tell phrases." },
  { value: "strong", label: "Strong", description: "Full editorial rewrite while preserving SEO structure." },
] as const;

export const STOCK_PROVIDERS = [
  { value: "auto", label: "Auto (Unsplash or Pexels)" },
  { value: "unsplash", label: "Unsplash" },
  { value: "pexels", label: "Pexels" },
] as const;

export interface BrandForm {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string;
  competitorUrls: string;
  brandColors: string;
  productOfferings: string;
}

export interface StyleForm {
  tonePreset: string;
  personaName: string;
  defaultWordCount: number;
  primaryLanguage: string;
  forbiddenWords: string;
  readingLevel: string;
  humanizationLevel: string;
  writingSample: string;
  stockProvider: string;
  autoInlineImages: boolean;
}

export function profileToBrandForm(
  bp: WebsiteProject["brandProfile"],
  scrapeData?: WebsiteProject["scrapeData"],
): BrandForm {
  const raw = {
    companyName: bp?.companyName ?? scrapeData?.companyName ?? "",
    industry: bp?.industry ?? scrapeData?.industry ?? "",
    targetAudience: bp?.targetAudience ?? scrapeData?.targetAudience ?? "",
    voiceTone: bp?.voiceTone ?? scrapeData?.voiceTone ?? "",
    primaryKeywords: bp?.primaryKeywords ?? scrapeData?.primaryKeywords ?? [],
    competitorUrls: bp?.competitorUrls ?? scrapeData?.competitorUrls ?? [],
  };

  const sanitized = sanitizeBrandExtract({
    ...raw,
    confidence: scrapeData?.confidence ?? {
      companyName: "medium",
      industry: "medium",
      targetAudience: "medium",
      voiceTone: "medium",
      primaryKeywords: "medium",
      competitorUrls: "low",
    },
  });

  return {
    companyName: sanitized.companyName,
    industry: sanitized.industry,
    targetAudience: sanitized.targetAudience,
    voiceTone: sanitized.voiceTone,
    primaryKeywords: sanitized.primaryKeywords.join(", "),
    competitorUrls: sanitized.competitorUrls.join("
"),
    brandColors: (bp?.brandColors ?? []).join(", "),
    productOfferings: (bp?.productOfferings ?? []).join("
"),
  };
}
