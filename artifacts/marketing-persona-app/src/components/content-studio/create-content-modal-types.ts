import type { ContentFormatType } from "./content-studio-format-data";

export type BriefContentDraft = {
  briefId?: number;
  keyword: string;
  angleHint?: string;
  formatType: ContentFormatType;
  workingTitle?: string;
};

export type WizardStepId =
  | "path"
  | "format"
  | "competitors"
  | "keyword"
  | "destination"
  | "linkedin-archetype"
  | "linkedin-hook"
  | "angle"
  | "planned-date"
  | "review"
  | "generating"
  | "repurpose-format"
  | "repurpose-keyword"
  | "repurpose-source"
  | "repurpose-generating"
  | "optimize-url"
  | "optimize-importing";

export type Flow = "create" | "repurpose" | "optimize";
