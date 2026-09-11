"use client";

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ContentFormatType } from "./content-studio-format-data";
import type { LinkedInArchetypeId, LinkedInHookId } from "@workspace/app-shell/studio";
import type { WizardStepId } from "./create-content-modal-types";
import { parseSourceUrls } from "./create-content-modal-logic";
import {
  runGeneration as runGenerationFn,
  runRepurpose as runRepurseFn,
  runOptimizeImport as runOptimizeImportFn,
} from "./create-content-modal-runners";
import type { ContentPieceRow } from "./content-studio-utils";
import type { AgentProgressEvent } from "@workspace/content-engine";

type GenerationShared = {
  selectedFormat: ContentFormatType | null;
  keyword: string;
  bypassCache: boolean;
  plannedDate: string;
  briefId: number | null;
  intendedDestination: string;
  projectId: string;
  contentSection: string;
  showBedrockModelPicker: boolean;
  bedrockModel: string;
  canManageBedrockModel: boolean;
  saveBedrockModel: boolean;
  useAgentTeam: boolean;
  agentFastMode: boolean;
  buildAngleHint: (format: ContentFormatType) => string | undefined;
  competitorGenerateFields: () => Record<string, unknown>;
  onVoiceRequired?: () => void;
  onAgentEvent?: (event: AgentProgressEvent | { type: string; [key: string]: unknown }) => void;
};

export function buildAngleHintFromFields(opts: {
  format: ContentFormatType;
  contentSection: string;
  editorNotes: string;
  angleHint: string;
  sourceUrlsInput: string;
  linkedinArchetype: LinkedInArchetypeId | "";
  linkedinHook: LinkedInHookId | "";
}): string | undefined {
  const parts: string[] = [];
  const section = opts.contentSection.trim();
  const notes = opts.editorNotes.trim() || opts.angleHint.trim();
  const sourceUrls = parseSourceUrls(opts.sourceUrlsInput);
  if (section) parts.push(`section:${section}`);
  if (notes) parts.push(notes);
  if (sourceUrls.length > 0) parts.push(`sources: ${sourceUrls.join(", ")}`);
  if (opts.format === "linkedin_post") {
    parts.unshift(`archetype:${opts.linkedinArchetype || ""}`, `hook:${opts.linkedinHook || ""}`);
  }
  return parts.join("|").trim() || undefined;
}

export function useCreateContentGeneration(opts: {
  open: boolean;
  currentStep: WizardStepId;
  generationStarted: MutableRefObject<boolean>;
  sharedGenerateParams: () => GenerationShared;
  onCreated: (piece: ContentPieceRow) => void;
  handleClose: () => void;
  setGenerating: Dispatch<SetStateAction<boolean>>;
  setDetectedSections: Dispatch<SetStateAction<string[]>>;
  setStepIndex: Dispatch<SetStateAction<number>>;
  setOptimizeError: Dispatch<SetStateAction<string | null>>;
  repurposeFormat: ContentFormatType;
  repurposeKeyword: string;
  repurposeContent: string;
  projectId: string;
  optimizeUrl: string;
  optimizeKeyword: string;
  optimizeSecondary: string;
  optimizePaste: string;
}) {
  const {
    open,
    currentStep,
    generationStarted,
    sharedGenerateParams,
    onCreated,
    handleClose,
    setGenerating,
    setDetectedSections,
    setStepIndex,
    setOptimizeError,
    repurposeFormat,
    repurposeKeyword,
    repurposeContent,
    projectId,
    optimizeUrl,
    optimizeKeyword,
    optimizeSecondary,
    optimizePaste,
  } = opts;

  const runGeneration = useCallback(async () => {
    await runGenerationFn({
      ...sharedGenerateParams(),
      onCreated,
      handleClose,
      setGenerating,
      setDetectedSections,
      setStepIndex,
      generationStarted,
    });
  }, [
    sharedGenerateParams,
    onCreated,
    handleClose,
    setGenerating,
    setDetectedSections,
    setStepIndex,
    generationStarted,
  ]);

  const runRepurpose = useCallback(async () => {
    await runRepurseFn({
      repurposeFormat,
      repurposeKeyword,
      repurposeContent,
      projectId,
      onCreated,
      handleClose,
      setGenerating,
      setStepIndex,
      generationStarted,
    });
  }, [
    repurposeFormat,
    repurposeKeyword,
    repurposeContent,
    projectId,
    onCreated,
    handleClose,
    setGenerating,
    setStepIndex,
    generationStarted,
  ]);

  const runOptimizeImport = useCallback(async () => {
    await runOptimizeImportFn({
      optimizeUrl,
      optimizeKeyword,
      optimizeSecondary,
      optimizePaste,
      projectId,
      onCreated,
      handleClose,
      setGenerating,
      setOptimizeError,
      setStepIndex,
      generationStarted,
    });
  }, [
    optimizeUrl,
    optimizeKeyword,
    optimizeSecondary,
    optimizePaste,
    projectId,
    onCreated,
    handleClose,
    setGenerating,
    setOptimizeError,
    setStepIndex,
    generationStarted,
  ]);

  useEffect(() => {
    if (!open || currentStep !== "generating" || generationStarted.current) return;
    generationStarted.current = true;
    void runGeneration();
  }, [open, currentStep, runGeneration, generationStarted]);

  useEffect(() => {
    if (!open || currentStep !== "repurpose-generating" || generationStarted.current) return;
    generationStarted.current = true;
    void runRepurpose();
  }, [open, currentStep, runRepurpose, generationStarted]);

  useEffect(() => {
    if (!open || currentStep !== "optimize-importing" || generationStarted.current) return;
    generationStarted.current = true;
    void runOptimizeImport();
  }, [open, currentStep, runOptimizeImport, generationStarted]);

  return { runGeneration, runRepurpose, runOptimizeImport };
}
