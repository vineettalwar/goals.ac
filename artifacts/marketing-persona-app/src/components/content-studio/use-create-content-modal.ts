"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useCompetitorContext } from "@/lib/queries";
import type { AiProviderId } from "@workspace/ai-providers/config";
import type { ContentFormatType } from "./content-studio-format-data";
import type { LinkedInArchetypeId, LinkedInHookId } from "@workspace/app-shell/studio";
import {
  resolveSuggestedDestination,
  type CmsConnectionSnapshot,
  type PublishDestinationId,
} from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-utils";
import type { Flow, WizardStepId } from "./create-content-modal-types";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor/competitor-url";
import {
  STEPS_WITH_ENTER_CONTINUE,
  buildStepSequence,
  extractSections,
  EMPTY_CMS_CONNECTIONS,
  parseSourceUrls,
} from "./create-content-modal-logic";
import {
  runGeneration as runGenerationFn,
  runRepurpose as runRepurseFn,
  runOptimizeImport as runOptimizeImportFn,
} from "./create-content-modal-runners";
export type { BriefContentDraft } from "./create-content-modal-types";
import type { BriefContentDraft } from "./create-content-modal-types";

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
const [flow, setFlow] = useState<Flow>("create");
const [stepIndex, setStepIndex] = useState(0);
const [selectedFormat, setSelectedFormat] = useState<ContentFormatType | null>(null);
const [keyword, setKeyword] = useState("");
const [angleHint, setAngleHint] = useState("");
const [contentSection, setContentSection] = useState("");
const [editorNotes, setEditorNotes] = useState("");
const [sourceUrlsInput, setSourceUrlsInput] = useState("");
const [plannedDate, setPlannedDate] = useState("");
const [briefId, setBriefId] = useState<number | null>(null);
const [linkedinArchetype, setLinkedinArchetype] = useState<LinkedInArchetypeId | "">("");
const [linkedinHook, setLinkedinHook] = useState<LinkedInHookId | "">("");
const [bypassCache, setBypassCache] = useState(false);
const [generating, setGenerating] = useState(false);
const [detectedSections, setDetectedSections] = useState<string[]>([]);
const generationStarted = useRef(false);

const [repurposeFormat, setRepurposeFormat] = useState<ContentFormatType>("linkedin_post");
const [repurposeKeyword, setRepurposeKeyword] = useState("");
const [repurposeContent, setRepurposeContent] = useState("");
const [sourcePieceId, setSourcePieceId] = useState("");
const [loadingSourcePiece, setLoadingSourcePiece] = useState(false);
const [intendedDestination, setIntendedDestination] = useState<PublishDestinationId | "">("");
const [optimizeUrl, setOptimizeUrl] = useState("");
const [optimizeKeyword, setOptimizeKeyword] = useState("");
const [optimizeSecondary, setOptimizeSecondary] = useState("");
const [optimizePaste, setOptimizePaste] = useState("");
const [optimizeError, setOptimizeError] = useState<string | null>(null);

const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);
const savedCompetitorUrlsRef = useRef<string[]>([]);
const [competitorAnalyses, setCompetitorAnalyses] = useState<Array<{
  competitorUrl: string; competitorName: string; contentGaps: string[]; quickWins: string[];
  threatLevel: "low" | "medium" | "high";
}>>([]);
const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");
const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
const [projectIndustry, setProjectIndustry] = useState("");

const skipPathAndFormat = Boolean(initialDraft);
const steps = useMemo(
  () => buildStepSequence(flow, selectedFormat, cmsConnections, skipPathAndFormat),
  [flow, selectedFormat, cmsConnections, skipPathAndFormat],
);
const currentStep = steps[stepIndex] ?? steps[0];
const progress = steps.length > 1 ? ((stepIndex + 1) / steps.length) * 100 : 100;
const isGeneratingStep =
  currentStep === "generating" ||
  currentStep === "repurpose-generating" ||
  currentStep === "optimize-importing";

async function loadSourcePiece(id: string) {
  setSourcePieceId(id);
  const summary = existingPieces.find((p) => String(p.id) === id);
  if (summary) setRepurposeKeyword(summary.targetKeyword);
  if (!id) { setRepurposeContent(""); return; }
  setLoadingSourcePiece(true);
  try {
    const res = await fetch(`/api/content-pieces/${id}`);
    if (res.ok) {
      const full = (await res.json()) as {
        bodyMarkdown?: string; title?: string; targetKeyword?: string;
      };
      setRepurposeContent(full.bodyMarkdown ?? "");
      if (full.targetKeyword) setRepurposeKeyword(full.targetKeyword);
    } else {
      toast.error("Failed to load content piece");
    }
  } catch {
    toast.error("Failed to load content piece");
  } finally {
    setLoadingSourcePiece(false);
  }
}

function reset() {
  setFlow("create");
  setStepIndex(0);
  setSelectedFormat(null);
  setKeyword("");
  setAngleHint("");
  setContentSection("");
  setEditorNotes("");
  setSourceUrlsInput("");
  setPlannedDate("");
  setLinkedinArchetype("");
  setLinkedinHook("");
  setBypassCache(false);
  setDetectedSections([]);
  setRepurposeFormat("linkedin_post");
  setRepurposeKeyword("");
  setRepurposeContent("");
  setSourcePieceId("");
  setBriefId(null);
  setIntendedDestination("");
  setCompetitorUrls([]);
  savedCompetitorUrlsRef.current = [];
  setCompetitorAnalyses([]);
  setCompetitorFocusUrl("");
  setNewCompetitorUrl("");
  setProjectIndustry("");
  setOptimizeUrl("");
  setOptimizeKeyword("");
  setOptimizeSecondary("");
  setOptimizePaste("");
  setOptimizeError(null);
  setGenerating(false);
  generationStarted.current = false;
}

const handleClose = useCallback(() => {
  if (generating) return;
  reset();
  onClose();
}, [generating, onClose]);

const { data: competitorContext, isLoading: loadingCompetitors } = useCompetitorContext(
  projectId,
  open,
);

const [competitorContextApplied, setCompetitorContextApplied] = useState<string | null>(null);

if (open && competitorContext && competitorContextApplied !== projectId) {
  const urls = normalizeCompetitorUrlList(competitorContext.competitorUrls ?? []);
  setCompetitorContextApplied(projectId);
  setCompetitorUrls(urls);
  setProjectIndustry(competitorContext.industry ?? "");
  setCompetitorAnalyses((competitorContext.analyses ?? []) as typeof competitorAnalyses);
  setCompetitorFocusUrl((prev) => {
    if (!prev) return "";
    const normalized = normalizeCompetitorUrl(prev);
    if (!normalized) return "";
    return urls.includes(normalized) ? normalized : "";
  });
}
if (!open && competitorContextApplied) {
  setCompetitorContextApplied(null);
}

useLayoutEffect(() => {
  if (competitorContextApplied === projectId) {
    savedCompetitorUrlsRef.current = competitorUrls;
  }
}, [competitorContextApplied, projectId, competitorUrls]);

useEffect(() => {
  if (!selectedFormat) return;
  const suggested = resolveSuggestedDestination(selectedFormat, cmsConnections, primaryBlogDestination);
  setIntendedDestination(suggested ?? "");
}, [selectedFormat, cmsConnections, primaryBlogDestination]);

useEffect(() => {
  if (!open) { setSaveBedrockModel(false); return; }
  setBedrockModel(orgBedrockModel ?? "");
}, [open, orgBedrockModel]);

const [appliedDraftKey, setAppliedDraftKey] = useState<string | null>(null);
const draftKey =
  open && initialDraft
    ? `${initialDraft.briefId ?? "none"}:${initialDraft.keyword}:${initialDraft.formatType}`
    : null;

if (draftKey && draftKey !== appliedDraftKey) {
  setAppliedDraftKey(draftKey);
  setFlow("create");
  setSelectedFormat(initialDraft!.formatType);
  setKeyword(initialDraft!.keyword);
  setAngleHint(initialDraft!.angleHint ?? "");
  setBriefId(initialDraft!.briefId ?? null);
  setStepIndex(0);
}
if (!open && appliedDraftKey) setAppliedDraftKey(null);

const [appliedOptimizeKey, setAppliedOptimizeKey] = useState<string | null>(null);
const optimizeKey =
  open && initialOptimize ? `${initialOptimize.url}|${initialOptimize.keyword}` : null;

if (optimizeKey && optimizeKey !== appliedOptimizeKey) {
  setAppliedOptimizeKey(optimizeKey);
  setFlow("optimize");
  setOptimizeUrl(initialOptimize!.url);
  setOptimizeKeyword(initialOptimize!.keyword);
  setOptimizePaste("");
  setOptimizeError(null);
  setStepIndex(0);
}
if (!open && appliedOptimizeKey) setAppliedOptimizeKey(null);

const goNextStable = useCallback(() => {
  setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
}, [steps.length]);

function goBack() {
  if (generating || isGeneratingStep) return;
  if (stepIndex > 0) setStepIndex((i) => i - 1);
}

const buildAngleHint = useCallback((format: ContentFormatType): string | undefined => {
  const parts: string[] = [];
  const section = contentSection.trim();
  const notes = editorNotes.trim() || angleHint.trim();
  const sourceUrls = parseSourceUrls(sourceUrlsInput);
  if (section) parts.push(`section:${section}`);
  if (notes) parts.push(notes);
  if (sourceUrls.length > 0) parts.push(`sources: ${sourceUrls.join(", ")}`);
  if (format === "linkedin_post") {
    parts.unshift(`archetype:${linkedinArchetype || ""}`, `hook:${linkedinHook || ""}`);
  }
  return parts.join("|").trim() || undefined;
}, [linkedinArchetype, linkedinHook, contentSection, editorNotes, sourceUrlsInput, angleHint]);

const competitorGenerateFields = useCallback(() => {
  const focus = competitorFocusUrl
    ? normalizeCompetitorUrl(competitorFocusUrl) ?? undefined
    : undefined;
  const urls = normalizeCompetitorUrlList(competitorUrls);
  const resolvedUrls = urls.length > 0 ? urls : undefined;
  return {
    ...(focus ? { competitorFocusUrl: focus } : resolvedUrls?.[0] ? { competitorFocusUrl: resolvedUrls[0] } : {}),
    ...(resolvedUrls ? { competitorUrls: resolvedUrls } : {}),
  };
}, [competitorFocusUrl, competitorUrls]);

const sharedGenerateParams = useCallback(() => ({
  selectedFormat,
  keyword,
  bypassCache,
  plannedDate,
  briefId,
  intendedDestination,
  projectId,
  contentSection,
  showBedrockModelPicker,
  bedrockModel,
  canManageBedrockModel,
  saveBedrockModel,
  buildAngleHint,
  competitorGenerateFields,
  onVoiceRequired,
}), [
  selectedFormat, keyword, bypassCache, plannedDate, briefId, intendedDestination,
  projectId, contentSection, showBedrockModelPicker, bedrockModel, canManageBedrockModel,
  saveBedrockModel, buildAngleHint, competitorGenerateFields, onVoiceRequired,
]);

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
}, [sharedGenerateParams, onCreated, handleClose]);

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
}, [repurposeFormat, repurposeKeyword, repurposeContent, projectId, onCreated, handleClose]);

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
}, [optimizeUrl, optimizeKeyword, optimizeSecondary, optimizePaste, projectId, onCreated, handleClose]);

useEffect(() => {
  if (!open || currentStep !== "generating" || generationStarted.current) return;
  generationStarted.current = true;
  void runGeneration();
}, [open, currentStep, runGeneration]);

useEffect(() => {
  if (!open || currentStep !== "repurpose-generating" || generationStarted.current) return;
  generationStarted.current = true;
  void runRepurpose();
}, [open, currentStep, runRepurpose]);

useEffect(() => {
  if (!open || currentStep !== "optimize-importing" || generationStarted.current) return;
  generationStarted.current = true;
  void runOptimizeImport();
}, [open, currentStep, runOptimizeImport]);

function addCompetitorUrl() {
  const normalized = normalizeCompetitorUrl(newCompetitorUrl);
  if (!normalized) { toast.error("Enter a valid competitor URL"); return; }
  if (competitorUrls.some((u) => hostFromUrl(u) === hostFromUrl(normalized))) {
    toast.error("That competitor is already listed");
    return;
  }
  if (competitorUrls.length >= 5) { toast.error("Maximum 5 competitors"); return; }
  setCompetitorUrls((prev) => [...prev, normalized]);
  setNewCompetitorUrl("");
}

const saveCompetitorsAndContinue = useCallback(async () => {
  const normalized = normalizeCompetitorUrlList(competitorUrls);
  if (normalized.length !== competitorUrls.length) {
    toast.error("Remove or fix invalid competitor URLs");
    return;
  }
  const dirty =
    JSON.stringify([...normalized].sort()) !==
    JSON.stringify([...savedCompetitorUrlsRef.current].sort());
  if (dirty) {
    try {
      const res = await fetch(`/api/website-projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorUrls: normalized }),
      });
      if (!res.ok) throw new Error("Save failed");
      savedCompetitorUrlsRef.current = normalized;
      setCompetitorUrls(normalized);
    } catch {
      toast.error("Failed to save competitors");
      return;
    }
  }
  goNextStable();
}, [competitorUrls, projectId, goNextStable]);

const handleContinue = useCallback(() => {
  if (currentStep === "competitors") { void saveCompetitorsAndContinue(); return; }
  if (currentStep === "keyword" && !keyword.trim()) { toast.error("Enter a target keyword"); return; }
  if (currentStep === "repurpose-keyword" && !repurposeKeyword.trim()) { toast.error("Enter a target keyword"); return; }
  if (currentStep === "repurpose-source") {
    if (repurposeContent.trim().length < 50) { toast.error("Paste at least 50 characters of source content"); return; }
    generationStarted.current = false;
    goNextStable();
    return;
  }
  if (currentStep === "optimize-url") {
    if (!optimizeUrl.trim() || !optimizeKeyword.trim()) { toast.error("Enter a page URL and primary keyword"); return; }
    setOptimizeError(null);
    generationStarted.current = false;
    goNextStable();
    return;
  }
  if (currentStep === "review") {
    if (!selectedFormat || !keyword.trim()) { toast.error("Enter a target keyword"); return; }
    if (contentSection.trim().toLowerCase() === "news" && parseSourceUrls(sourceUrlsInput).length === 0) {
      toast.error("Add at least one source URL for News");
      return;
    }
    generationStarted.current = false;
    goNextStable();
    return;
  }
  goNextStable();
}, [
  currentStep, keyword, repurposeKeyword, repurposeContent, optimizeUrl, optimizeKeyword,
  selectedFormat, saveCompetitorsAndContinue, goNextStable, contentSection, sourceUrlsInput,
]);

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
    if (STEPS_WITH_ENTER_CONTINUE.includes(currentStep as WizardStepId)) {
      e.preventDefault();
      handleContinue();
    }
  }
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [open, generating, isGeneratingStep, handleClose, handleContinue, currentStep, keyword, repurposeKeyword, repurposeContent, selectedFormat]);

function selectFormat(type: ContentFormatType) {
  setSelectedFormat(type);
  const idx = steps.indexOf("format");
  if (idx >= 0 && idx < steps.length - 1) setStepIndex(idx + 1);
}

function selectPath(nextFlow: Flow) {
  setFlow(nextFlow);
  if (nextFlow === "repurpose" || nextFlow === "optimize") { setStepIndex(0); return; }
  setStepIndex(1);
}

const wizardProps = {
  selectPath,
  selectFormat,
  loadingCompetitors,
  competitorUrls,
  competitorAnalyses,
  addCompetitorUrl,
  newCompetitorUrl,
  setNewCompetitorUrl,
  projectId,
  projectIndustry,
  keyword,
  setKeyword,
  selectedFormat,
  intendedDestination,
  setIntendedDestination,
  cmsConnections,
  linkedinArchetype,
  setLinkedinArchetype,
  linkedinHook,
  setLinkedinHook,
  angleHint,
  setAngleHint,
  contentSection,
  setContentSection,
  editorNotes,
  setEditorNotes,
  sourceUrlsInput,
  setSourceUrlsInput,
  suggestedSections,
  plannedDate,
  setPlannedDate,
  generating,
  detectedSections,
  repurposeFormat,
  setRepurposeFormat,
  repurposeKeyword,
  setRepurposeKeyword,
  repurposeContent,
  setRepurposeContent,
  sourcePieceId,
  setSourcePieceId,
  loadSourcePiece,
  existingPieces,
  loadingSourcePiece,
  goNextStable,
  handleContinue,
  bypassCache,
  setBypassCache,
  competitorFocusUrl,
  setCompetitorFocusUrl,
  runGeneration,
  initialDraft,
  goNext: goNextStable,
  showBedrockModelPicker,
  bedrockModel,
  setBedrockModel,
  saveBedrockModel,
  setSaveBedrockModel,
  canManageBedrockModel,
  optimizeUrl,
  setOptimizeUrl,
  optimizeKeyword,
  setOptimizeKeyword,
  optimizeSecondary,
  setOptimizeSecondary,
  optimizePaste,
  setOptimizePaste,
  optimizeError,
};

  return {
    open,
    handleClose,
    generating,
    stepIndex,
    steps,
    currentStep,
    progress,
    isGeneratingStep,
    goBack,
    wizardProps,
  };
}
