"use client";

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { toast } from "sonner";
import type { ContentFormatType } from "./content-studio-format-data";
import type { WizardStepId } from "./create-content-modal-types";
import { STEPS_WITH_ENTER_CONTINUE, newsNeedsSourceUrl } from "./create-content-modal-logic";

export function useCreateContentContinue(opts: {
  currentStep: WizardStepId;
  keyword: string;
  repurposeKeyword: string;
  repurposeContent: string;
  optimizeUrl: string;
  optimizeKeyword: string;
  selectedFormat: ContentFormatType | null;
  contentSection: string;
  sourceUrlsInput: string;
  saveCompetitorsAndContinue: (goNext: () => void) => Promise<void>;
  goNextStable: () => void;
  generationStarted: MutableRefObject<boolean>;
  setOptimizeError: Dispatch<SetStateAction<string | null>>;
}) {
  const {
    currentStep,
    keyword,
    repurposeKeyword,
    repurposeContent,
    optimizeUrl,
    optimizeKeyword,
    selectedFormat,
    contentSection,
    sourceUrlsInput,
    saveCompetitorsAndContinue,
    goNextStable,
    generationStarted,
    setOptimizeError,
  } = opts;

  return useCallback(() => {
    if (currentStep === "competitors") {
      void saveCompetitorsAndContinue(goNextStable);
      return;
    }
    if (currentStep === "keyword" && !keyword.trim()) {
      toast.error("Enter a target keyword");
      return;
    }
    if (currentStep === "repurpose-keyword" && !repurposeKeyword.trim()) {
      toast.error("Enter a target keyword");
      return;
    }
    if (currentStep === "repurpose-source") {
      if (repurposeContent.trim().length < 50) {
        toast.error("Paste at least 50 characters of source content");
        return;
      }
      generationStarted.current = false;
      goNextStable();
      return;
    }
    if (currentStep === "optimize-url") {
      if (!optimizeUrl.trim() || !optimizeKeyword.trim()) {
        toast.error("Enter a page URL and primary keyword");
        return;
      }
      setOptimizeError(null);
      generationStarted.current = false;
      goNextStable();
      return;
    }
    if (currentStep === "angle" && newsNeedsSourceUrl(contentSection, sourceUrlsInput)) {
      toast.error("Add at least one source URL for News");
      return;
    }
    if (currentStep === "review") {
      if (!selectedFormat || !keyword.trim()) {
        toast.error("Enter a target keyword");
        return;
      }
      if (newsNeedsSourceUrl(contentSection, sourceUrlsInput)) {
        toast.error("Add at least one source URL for News");
        return;
      }
      generationStarted.current = false;
      goNextStable();
      return;
    }
    goNextStable();
  }, [
    currentStep,
    keyword,
    repurposeKeyword,
    repurposeContent,
    optimizeUrl,
    optimizeKeyword,
    selectedFormat,
    saveCompetitorsAndContinue,
    goNextStable,
    contentSection,
    sourceUrlsInput,
    generationStarted,
    setOptimizeError,
  ]);
}

export function useCreateContentKeyboard(opts: {
  open: boolean;
  generating: boolean;
  isGeneratingStep: boolean;
  handleClose: () => void;
  handleContinue: () => void;
  currentStep: WizardStepId;
  keyword: string;
  repurposeKeyword: string;
  repurposeContent: string;
  selectedFormat: ContentFormatType | null;
}) {
  const {
    open,
    generating,
    isGeneratingStep,
    handleClose,
    handleContinue,
    currentStep,
    keyword,
    repurposeKeyword,
    repurposeContent,
    selectedFormat,
  } = opts;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !generating) handleClose();
      if (e.key !== "Enter" || e.shiftKey || generating || isGeneratingStep) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "select" || target?.closest("[role='combobox']")) return;
      if (currentStep === "keyword" && !keyword.trim()) return;
      if (currentStep === "repurpose-keyword" && !repurposeKeyword.trim()) return;
      if (currentStep === "repurpose-source" && repurposeContent.trim().length < 50) return;
      if (currentStep === "review" && (!selectedFormat || !keyword.trim())) return;
      if (STEPS_WITH_ENTER_CONTINUE.includes(currentStep)) {
        e.preventDefault();
        handleContinue();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    open,
    generating,
    isGeneratingStep,
    handleClose,
    handleContinue,
    currentStep,
    keyword,
    repurposeKeyword,
    repurposeContent,
    selectedFormat,
  ]);
}
