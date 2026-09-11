"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import type { AiProviderId } from "@workspace/ai-providers/config";
import type { ContentFormatType } from "./content-studio-format-data";
import {
  resolveSuggestedDestination,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-utils";
import type { CreatePace, Flow } from "./create-content-modal-types";
import { buildStepSequence, EMPTY_CMS_CONNECTIONS } from "./create-content-modal-logic";
export type { BriefContentDraft } from "./create-content-modal-types";
import type { BriefContentDraft } from "./create-content-modal-types";
import { useCreateContentCompetitors } from "./create-content-modal-competitors";
import { useCreateContentFormState } from "./create-content-modal-form-state";
import {
  buildAngleHintFromFields,
  useCreateContentGeneration,
} from "./create-content-modal-generation";
import {
  useCreateContentContinue,
  useCreateContentKeyboard,
} from "./create-content-modal-navigation";
import { useAgentTeamState } from "@/components/content/agents";
import { isSeoLongformFormat } from "@workspace/content-engine/content/seo-longform-formats";

export function useCreateContentModal({
  open,
  onClose,
  projectId,
  existingPieces,
  onCreated,
  initialDraft,
  initialOptimize = null,
  cmsConnections = EMPTY_CMS_CONNECTIONS,
  primaryBlogDestination = null,
  activeProvider = "gemini",
  orgBedrockModel = null,
  onVoiceRequired,
  suggestedSections = [],
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingPieces: ContentPieceRow[];
  onCreated: (piece: ContentPieceRow) => void;
  initialDraft?: BriefContentDraft | null;
  initialOptimize?: { url: string; keyword: string } | null;
  cmsConnections?: CmsConnectionSnapshot;
  primaryBlogDestination?: string | null;
  activeProvider?: AiProviderId;
  orgBedrockModel?: string | null;
  onVoiceRequired?: () => void;
  suggestedSections?: string[];
}) {
  const { data: session } = useSession();
  const canManageBedrockModel =
    session?.user?.orgRole === "site_admin" ||
    session?.user?.orgRole === "owner" ||
    session?.user?.role === "super_admin" ||
    session?.user?.role === "admin";
  const showBedrockModelPicker = activeProvider === "bedrock";
  const [bedrockModel, setBedrockModel] = useState(orgBedrockModel ?? "");
  const [saveBedrockModel, setSaveBedrockModel] = useState(false);
  const generationStarted = useRef(false);
  const form = useCreateContentFormState();
  const competitors = useCreateContentCompetitors(projectId, open);

  const skipPathAndFormat = Boolean(initialDraft);
  const steps = useMemo(
    () =>
      buildStepSequence(
        form.flow,
        form.selectedFormat,
        cmsConnections,
        skipPathAndFormat,
        form.createPace,
      ),
    [form.flow, form.selectedFormat, cmsConnections, skipPathAndFormat, form.createPace],
  );
  const currentStep = steps[form.stepIndex] ?? steps[0];
  const progress = steps.length > 1 ? ((form.stepIndex + 1) / steps.length) * 100 : 100;
  const isGeneratingStep =
    currentStep === "generating" ||
    currentStep === "repurpose-generating" ||
    currentStep === "optimize-importing";

  const agentTeam = useAgentTeamState();
  const { reset: resetAgentTeam, handleEvent: onAgentEvent } = agentTeam;

  const handleClose = useCallback(() => {
    if (form.generating) return;
    form.resetFormFields();
    competitors.resetCompetitors();
    resetAgentTeam();
    generationStarted.current = false;
    onClose();
  }, [form.generating, form.resetFormFields, competitors.resetCompetitors, resetAgentTeam, onClose]);

  useEffect(() => {
    if (!form.selectedFormat) return;
    const suggested = resolveSuggestedDestination(
      form.selectedFormat,
      cmsConnections,
      primaryBlogDestination,
    );
    form.setIntendedDestination(suggested ?? "");
  }, [form.selectedFormat, cmsConnections, primaryBlogDestination]);

  useEffect(() => {
    if (!open) {
      setSaveBedrockModel(false);
      return;
    }
    setBedrockModel(orgBedrockModel ?? "");
  }, [open, orgBedrockModel]);

  const [appliedDraftKey, setAppliedDraftKey] = useState<string | null>(null);
  const draftKey =
    open && initialDraft
      ? `${initialDraft.briefId ?? "none"}:${initialDraft.keyword}:${initialDraft.formatType}`
      : null;

  if (draftKey && draftKey !== appliedDraftKey) {
    setAppliedDraftKey(draftKey);
    form.setFlow("create");
    form.setSelectedFormat(initialDraft!.formatType);
    form.setUseAgentTeam(isSeoLongformFormat(initialDraft!.formatType));
    form.setAgentFastMode(false);
    form.setKeyword(initialDraft!.keyword);
    form.setAngleHint(initialDraft!.angleHint ?? "");
    form.setBriefId(initialDraft!.briefId ?? null);
    form.setStepIndex(0);
  }
  if (!open && appliedDraftKey) setAppliedDraftKey(null);

  const [appliedOptimizeKey, setAppliedOptimizeKey] = useState<string | null>(null);
  const optimizeKey =
    open && initialOptimize ? `${initialOptimize.url}|${initialOptimize.keyword}` : null;

  if (optimizeKey && optimizeKey !== appliedOptimizeKey) {
    setAppliedOptimizeKey(optimizeKey);
    form.setFlow("optimize");
    form.setOptimizeUrl(initialOptimize!.url);
    form.setOptimizeKeyword(initialOptimize!.keyword);
    form.setOptimizePaste("");
    form.setOptimizeError(null);
    form.setStepIndex(0);
  }
  if (!open && appliedOptimizeKey) setAppliedOptimizeKey(null);

  const goNextStable = useCallback(() => {
    form.setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
  }, [steps.length, form.setStepIndex]);

  function goBack() {
    if (form.generating || isGeneratingStep) return;
    if (form.stepIndex > 0) form.setStepIndex((i) => i - 1);
  }

  const buildAngleHint = useCallback(
    (format: ContentFormatType): string | undefined =>
      buildAngleHintFromFields({
        format,
        contentSection: form.contentSection,
        editorNotes: form.editorNotes,
        angleHint: form.angleHint,
        sourceUrlsInput: form.sourceUrlsInput,
        linkedinArchetype: form.linkedinArchetype,
        linkedinHook: form.linkedinHook,
      }),
    [
      form.linkedinArchetype,
      form.linkedinHook,
      form.contentSection,
      form.editorNotes,
      form.sourceUrlsInput,
      form.angleHint,
    ],
  );

  const sharedGenerateParams = useCallback(
    () => ({
      selectedFormat: form.selectedFormat,
      keyword: form.keyword,
      bypassCache: form.bypassCache,
      plannedDate: form.plannedDate,
      briefId: form.briefId,
      intendedDestination: form.intendedDestination,
      projectId,
      contentSection: form.contentSection,
      showBedrockModelPicker,
      bedrockModel,
      canManageBedrockModel,
      saveBedrockModel,
      useAgentTeam: form.useAgentTeam,
      agentFastMode: form.agentFastMode,
      buildAngleHint,
      competitorGenerateFields: competitors.competitorGenerateFields,
      onVoiceRequired,
      onAgentEvent,
    }),
    [
      form.selectedFormat,
      form.keyword,
      form.bypassCache,
      form.plannedDate,
      form.briefId,
      form.intendedDestination,
      projectId,
      form.contentSection,
      showBedrockModelPicker,
      bedrockModel,
      canManageBedrockModel,
      saveBedrockModel,
      form.useAgentTeam,
      form.agentFastMode,
      buildAngleHint,
      competitors.competitorGenerateFields,
      onVoiceRequired,
      onAgentEvent,
    ],
  );

  const { runGeneration } = useCreateContentGeneration({
    open,
    currentStep,
    generationStarted,
    sharedGenerateParams,
    onCreated,
    handleClose,
    setGenerating: form.setGenerating,
    setDetectedSections: form.setDetectedSections,
    setStepIndex: form.setStepIndex,
    setOptimizeError: form.setOptimizeError,
    repurposeFormat: form.repurposeFormat,
    repurposeKeyword: form.repurposeKeyword,
    repurposeContent: form.repurposeContent,
    projectId,
    optimizeUrl: form.optimizeUrl,
    optimizeKeyword: form.optimizeKeyword,
    optimizeSecondary: form.optimizeSecondary,
    optimizePaste: form.optimizePaste,
  });

  const handleContinue = useCreateContentContinue({
    currentStep,
    keyword: form.keyword,
    repurposeKeyword: form.repurposeKeyword,
    repurposeContent: form.repurposeContent,
    optimizeUrl: form.optimizeUrl,
    optimizeKeyword: form.optimizeKeyword,
    selectedFormat: form.selectedFormat,
    contentSection: form.contentSection,
    sourceUrlsInput: form.sourceUrlsInput,
    saveCompetitorsAndContinue: competitors.saveCompetitorsAndContinue,
    goNextStable,
    generationStarted,
    setOptimizeError: form.setOptimizeError,
  });

  useCreateContentKeyboard({
    open,
    generating: form.generating,
    isGeneratingStep,
    handleClose,
    handleContinue,
    currentStep,
    keyword: form.keyword,
    repurposeKeyword: form.repurposeKeyword,
    repurposeContent: form.repurposeContent,
    selectedFormat: form.selectedFormat,
  });

  function selectFormat(type: ContentFormatType) {
    form.setSelectedFormat(type);
    // Default agent team on for SEO longform; social/short stays single-pass
    form.setUseAgentTeam(isSeoLongformFormat(type));
    form.setAgentFastMode(false);
    const idx = steps.indexOf("format");
    if (idx >= 0 && idx < steps.length - 1) form.setStepIndex(idx + 1);
  }

  function selectCreatePace(pace: CreatePace) {
    form.setFlow("create");
    form.setCreatePace(pace);
    form.setStepIndex(1);
  }

  function selectPath(nextFlow: Flow) {
    if (nextFlow === "create") {
      selectCreatePace("express");
      return;
    }
    form.setFlow(nextFlow);
    form.setStepIndex(0);
  }

  const wizardProps = {
    selectPath,
    selectCreatePace,
    selectFormat,
    loadingCompetitors: competitors.loadingCompetitors,
    competitorUrls: competitors.competitorUrls,
    competitorAnalyses: competitors.competitorAnalyses,
    addCompetitorUrl: competitors.addCompetitorUrl,
    newCompetitorUrl: competitors.newCompetitorUrl,
    setNewCompetitorUrl: competitors.setNewCompetitorUrl,
    projectId,
    projectIndustry: competitors.projectIndustry,
    keyword: form.keyword,
    setKeyword: form.setKeyword,
    selectedFormat: form.selectedFormat,
    intendedDestination: form.intendedDestination,
    setIntendedDestination: form.setIntendedDestination,
    cmsConnections,
    linkedinArchetype: form.linkedinArchetype,
    setLinkedinArchetype: form.setLinkedinArchetype,
    linkedinHook: form.linkedinHook,
    setLinkedinHook: form.setLinkedinHook,
    angleHint: form.angleHint,
    setAngleHint: form.setAngleHint,
    contentSection: form.contentSection,
    setContentSection: form.setContentSection,
    editorNotes: form.editorNotes,
    setEditorNotes: form.setEditorNotes,
    sourceUrlsInput: form.sourceUrlsInput,
    setSourceUrlsInput: form.setSourceUrlsInput,
    suggestedSections,
    plannedDate: form.plannedDate,
    setPlannedDate: form.setPlannedDate,
    generating: form.generating,
    detectedSections: form.detectedSections,
    useAgentTeam: form.useAgentTeam,
    setUseAgentTeam: form.setUseAgentTeam,
    agentFastMode: form.agentFastMode,
    setAgentFastMode: form.setAgentFastMode,
    agentTeamState: agentTeam.state,
    agentTeamRunning: agentTeam.isRunning,
    agentTeamElapsedMs: agentTeam.totalElapsedMs,
    repurposeFormat: form.repurposeFormat,
    setRepurposeFormat: form.setRepurposeFormat,
    repurposeKeyword: form.repurposeKeyword,
    setRepurposeKeyword: form.setRepurposeKeyword,
    repurposeContent: form.repurposeContent,
    setRepurposeContent: form.setRepurposeContent,
    sourcePieceId: form.sourcePieceId,
    setSourcePieceId: form.setSourcePieceId,
    loadSourcePiece: (id: string) => void form.loadSourcePiece(id, existingPieces),
    existingPieces,
    loadingSourcePiece: form.loadingSourcePiece,
    goNextStable,
    handleContinue,
    bypassCache: form.bypassCache,
    setBypassCache: form.setBypassCache,
    competitorFocusUrl: competitors.competitorFocusUrl,
    setCompetitorFocusUrl: competitors.setCompetitorFocusUrl,
    runGeneration,
    initialDraft,
    goNext: goNextStable,
    showBedrockModelPicker,
    bedrockModel,
    setBedrockModel,
    saveBedrockModel,
    setSaveBedrockModel,
    canManageBedrockModel,
    optimizeUrl: form.optimizeUrl,
    setOptimizeUrl: form.setOptimizeUrl,
    optimizeKeyword: form.optimizeKeyword,
    setOptimizeKeyword: form.setOptimizeKeyword,
    optimizeSecondary: form.optimizeSecondary,
    setOptimizeSecondary: form.setOptimizeSecondary,
    optimizePaste: form.optimizePaste,
    setOptimizePaste: form.setOptimizePaste,
    optimizeError: form.optimizeError,
  };

  return {
    open,
    handleClose,
    generating: form.generating,
    stepIndex: form.stepIndex,
    steps,
    currentStep,
    progress,
    isGeneratingStep,
    goBack,
    wizardProps,
  };
}
