import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";

export type OnboardingStep1Values = {
  name: string;
  url: string;
};

export type BrandFields = {
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
};

export type OnboardingProject = {
  id: number;
  scrapeStatus: string | null;
};

export type OnboardingStepProps = {
  step1Form: UseFormReturn<OnboardingStep1Values>;
  project: OnboardingProject | null;
  brandFields: BrandFields;
  setBrandFields: Dispatch<SetStateAction<BrandFields>>;
  isSavingBrand: boolean;
  selectedTone: string;
  setSelectedTone: (value: string) => void;
  wordCount: number;
  setWordCount: (value: number) => void;
  language: string;
  setLanguage: (value: string) => void;
  isSavingStyle: boolean;
  roadmapSlug: string | null;
  roadmapLoading: boolean;
  TONES: ReadonlyArray<{ value: string; label: string; desc: string }>;
  LANGUAGES: readonly string[];
  onStep1Submit: (values: OnboardingStep1Values) => void | Promise<void>;
  onStep2Confirm: () => void | Promise<void>;
  onStep3Confirm: () => void | Promise<void>;
  completeWizard: () => void;
  isScanning: boolean;
};
