export const PROJECT_DETAIL_TABS = ["brand", "voice", "content", "publishing"] as const;
export type ProjectDetailTab = (typeof PROJECT_DETAIL_TABS)[number];

export function isProjectDetailTab(value: string | null | undefined): value is ProjectDetailTab {
  return PROJECT_DETAIL_TABS.includes(value as ProjectDetailTab);
}

export type ProjectDetailBrandProfile = {
  companyName?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
  voiceTone?: string | null;
  primaryKeywords?: string[] | null;
  competitorUrls?: string[] | null;
};

export type BrandProfileFormValues = {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string;
  competitorUrls: string;
};

export type BrandProfileSavePayload = {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
};

export function brandProfileToFormValues(
  brand: ProjectDetailBrandProfile | null,
): BrandProfileFormValues {
  return {
    companyName: brand?.companyName ?? "",
    industry: brand?.industry ?? "",
    targetAudience: brand?.targetAudience ?? "",
    voiceTone: brand?.voiceTone ?? "",
    primaryKeywords: brand?.primaryKeywords?.join(", ") ?? "",
    competitorUrls: brand?.competitorUrls?.join("\n") ?? "",
  };
}

export function formValuesToSavePayload(values: BrandProfileFormValues): BrandProfileSavePayload {
  return {
    companyName: values.companyName,
    industry: values.industry,
    targetAudience: values.targetAudience,
    voiceTone: values.voiceTone,
    primaryKeywords: values.primaryKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    competitorUrls: values.competitorUrls
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean),
  };
}

export type ProjectDetailContentStyle = {
  tonePreset?: string | null;
  personaName?: string | null;
  defaultWordCount?: number | null;
  primaryLanguage?: string | null;
  readingLevel?: string | null;
  humanizationLevel?: string | null;
};

export type VoiceStyleFormValues = {
  tonePreset: string;
  personaName: string;
  defaultWordCount: number;
  primaryLanguage: string;
  readingLevel: string;
  humanizationLevel: string;
};

export type VoiceStyleSavePayload = {
  tonePreset: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount: number;
  primaryLanguage: string;
  readingLevel: "general" | "intermediate" | "expert";
  humanizationLevel: "off" | "light" | "strong";
};

export function contentStyleToFormValues(
  style: ProjectDetailContentStyle | null,
): VoiceStyleFormValues {
  return {
    tonePreset: style?.tonePreset ?? "professional",
    personaName: style?.personaName ?? "",
    defaultWordCount: style?.defaultWordCount ?? 800,
    primaryLanguage: style?.primaryLanguage ?? "en",
    readingLevel: style?.readingLevel ?? "general",
    humanizationLevel: style?.humanizationLevel ?? "light",
  };
}

export function formValuesToVoiceSavePayload(
  values: VoiceStyleFormValues,
): VoiceStyleSavePayload {
  return {
    tonePreset: values.tonePreset as VoiceStyleSavePayload["tonePreset"],
    personaName: values.personaName.trim() || undefined,
    defaultWordCount: values.defaultWordCount,
    primaryLanguage: values.primaryLanguage,
    readingLevel: values.readingLevel as VoiceStyleSavePayload["readingLevel"],
    humanizationLevel: values.humanizationLevel as VoiceStyleSavePayload["humanizationLevel"],
  };
}

export type ProjectDetailPiece = {
  id: number;
  title: string;
  status: string;
  targetKeyword?: string | null;
  wordCount?: number | null;
};

export type ProjectDetailProject = {
  id: number;
  name: string;
  url: string;
  pageCount?: number | null;
  scrapeStatus?: string | null;
};

export function contentStudioPath(projectId: number | string): string {
  return `/projects/${projectId}/content-studio`;
}

export function projectIntegrationsPath(projectId: number | string): string {
  return `/integrations?project=${projectId}`;
}

export function contentPiecePath(pieceId: number | string): string {
  return `/content-piece/${pieceId}`;
}

export function scrapeIsPending(status: string | null | undefined): boolean {
  return status === "pending";
}

export function scrapeWasAutoFilled(status: string | null | undefined): boolean {
  return status === "done" || status === "complete";
}

export function scrapeFailed(status: string | null | undefined): boolean {
  return status === "failed";
}
