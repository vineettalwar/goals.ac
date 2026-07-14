"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { toast } from "sonner";
import { useCompetitorContext } from "@/lib/queries";
import type { ContentFormatType, LinkedInArchetypeId, LinkedInHookId } from "./content-studio-format-data";
import {
  resolveSuggestedDestination,
  type CmsConnectionSnapshot,
  type PublishDestinationId,
} from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-client";
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
} from "./create-content-modal-logic";

export type BriefContentDraft = {
  briefId?: number;
  keyword: string;
  angleHint?: string;
  formatType: ContentFormatType;
  workingTitle?: string;
};

type CompetitorAnalysisRow = {
  competitorUrl: string;
  competitorName: string;
  contentGaps: string[];
  quickWins: string[];
  threatLevel: "low" | "medium" | "high";
};

export function useCreateContentModal({
  open,
  onClose,
  projectId,
  existingPieces,
  onCreated,
  initialDraft,
  cmsConnections = EMPTY_CMS_CONNECTIONS,
  primaryBlogDestination = null,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingPieces: ContentPieceRow[];
  onCreated: (piece: ContentPieceRow) => void;
  initialDraft?: BriefContentDraft | null;
  cmsConnections?: CmsConnectionSnapshot;
  primaryBlogDestination?: string | null;
}) {
const [flow, setFlow] = useState<Flow>("create");
const [stepIndex, setStepIndex] = useState(0);
const [selectedFormat, setSelectedFormat] = useState<ContentFormatType | null>(null);
const [keyword, setKeyword] = useState("");
const [angleHint, setAngleHint] = useState("");
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

const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);
const savedCompetitorUrlsRef = useRef<string[]>([]);
const [competitorAnalyses, setCompetitorAnalyses] = useState<CompetitorAnalysisRow[]>([]);
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
  currentStep === "generating" || currentStep === "repurpose-generating";

async function loadSourcePiece(id: string) {
  setSourcePieceId(id);
  const summary = existingPieces.find((p) => String(p.id) === id);
  if (summary) {
    setRepurposeKeyword(summary.targetKeyword);
  }
  if (!id) {
    setRepurposeContent("");
    return;
  }
  setLoadingSourcePiece(true);
  try {
    const res = await fetch(`/api/content-pieces/${id}`);
    if (res.ok) {
      const full = (await res.json()) as {
        bodyMarkdown?: string;
        title?: string;
        targetKeyword?: string;
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
  setCompetitorAnalyses((competitorContext.analyses ?? []) as CompetitorAnalysisRow[]);
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
  const suggested = resolveSuggestedDestination(
    selectedFormat,
    cmsConnections,
    primaryBlogDestination,
  );
  setIntendedDestination(suggested ?? "");
}, [selectedFormat, cmsConnections, primaryBlogDestination]);

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
if (!open && appliedDraftKey) {
  setAppliedDraftKey(null);
}

const goNextStable = useCallback(() => {
  setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
}, [steps.length]);

function goBack() {
  if (generating || isGeneratingStep) return;
  if (stepIndex > 0) setStepIndex((i) => i - 1);
}

const buildAngleHint = useCallback((format: ContentFormatType): string | undefined => {
  if (format === "linkedin_post") {
    return `archetype:${linkedinArchetype || ""}|hook:${linkedinHook || ""}|${angleHint.trim() || ""}`;
  }
  return angleHint.trim() || undefined;
}, [linkedinArchetype, linkedinHook, angleHint]);

const resolvedCompetitorFocusUrl = useCallback((): string | undefined => {
  if (!competitorFocusUrl) return undefined;
  return normalizeCompetitorUrl(competitorFocusUrl) ?? undefined;
}, [competitorFocusUrl]);

const handleGenerateFallback = useCallback(async (): Promise<ContentPieceRow> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bypassCache) headers["x-bypass-cache"] = "true";

  const res = await fetch(`/api/website-projects/${projectId}/content-pieces`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      formatType: selectedFormat,
      targetKeyword: keyword.trim(),
      angleHint: buildAngleHint(selectedFormat!),
      plannedDate: plannedDate || undefined,
      briefId: briefId ?? undefined,
      ...(intendedDestination ? { intendedPublishPlatform: intendedDestination } : {}),
      ...(resolvedCompetitorFocusUrl() ? { competitorFocusUrl: resolvedCompetitorFocusUrl() } : {}),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Generation failed");
  }

  return (await res.json()) as ContentPieceRow;
}, [
  bypassCache,
  briefId,
  intendedDestination,
  keyword,
  plannedDate,
  projectId,
  resolvedCompetitorFocusUrl,
  selectedFormat,
  buildAngleHint,
]);

const runGeneration = useCallback(async () => {
  if (!selectedFormat || !keyword.trim()) return;
  setGenerating(true);
  setDetectedSections([]);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bypassCache) headers["x-bypass-cache"] = "true";

  const payload = {
    formatType: selectedFormat,
    targetKeyword: keyword.trim(),
    angleHint: buildAngleHint(selectedFormat),
    plannedDate: plannedDate || undefined,
    briefId: briefId ?? undefined,
    ...(intendedDestination ? { intendedPublishPlatform: intendedDestination } : {}),
    ...(resolvedCompetitorFocusUrl() ? { competitorFocusUrl: resolvedCompetitorFocusUrl() } : {}),
  };

  try {
    let res: Response;
    try {
      res = await fetch(`/api/website-projects/${projectId}/content-pieces/generate/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      const piece = await handleGenerateFallback();
      onCreated(piece);
      toast.success("Content generated");
      handleClose();
      return;
    }

    if (!res.ok || !res.body) {
      const piece = await handleGenerateFallback();
      onCreated(piece);
      toast.success("Content generated");
      handleClose();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let jsonAccumulated = "";
    let finalPiece: ContentPieceRow | null = null;
    let fromCache = false;
    let pendingEvent: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          pendingEvent = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith("data: ")) continue;

        const eventPayload = line.slice(6);
        if (pendingEvent === "cached") {
          fromCache = true;
          try {
            const cached = JSON.parse(eventPayload) as ContentPieceRow;
            if ("id" in cached) finalPiece = cached;
          } catch {
            // ignore malformed cached payload
          }
          pendingEvent = null;
          continue;
        }
        if (pendingEvent === "error") {
          let message = "Generation failed";
          try {
            const errData = JSON.parse(eventPayload) as { error?: string };
            if (errData.error) message = errData.error;
          } catch {
            // keep default
          }
          throw new Error(message);
        }
        pendingEvent = null;

        try {
          const parsed = JSON.parse(eventPayload) as { text?: string } | ContentPieceRow;
          if ("text" in parsed && parsed.text) {
            jsonAccumulated += parsed.text;
            const sections = extractSections(jsonAccumulated);
            if (sections.length > 0) {
              setDetectedSections(sections);
            } else if (jsonAccumulated.length > 30) {
              setDetectedSections(["Crafting title\u2026"]);
            }
          } else if ("id" in parsed) {
            finalPiece = parsed as ContentPieceRow;
          }
        } catch {
          // partial JSON during streaming
        }
      }
    }

    if (finalPiece) {
      onCreated(finalPiece);
      toast.success(fromCache ? "Loaded cached content" : "Content generated");
      handleClose();
      return;
    }

    throw new Error("Generation completed without a result");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Generation failed");
    setStepIndex((i) => Math.max(0, i - 1));
    generationStarted.current = false;
  } finally {
    setGenerating(false);
  }
}, [
  selectedFormat,
  keyword,
  bypassCache,
  plannedDate,
  briefId,
  intendedDestination,
  projectId,
  onCreated,
  handleClose,
  handleGenerateFallback,
  resolvedCompetitorFocusUrl,
  buildAngleHint,
]);

const runRepurpose = useCallback(async () => {
  if (!repurposeKeyword.trim() || repurposeContent.trim().length < 50) return;
  setGenerating(true);
  try {
    const res = await fetch(`/api/website-projects/${projectId}/content-pieces/repurpose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetFormat: repurposeFormat,
        targetKeyword: repurposeKeyword.trim(),
        existingContent: repurposeContent.trim(),
      }),
    });
    if (!res.ok) throw new Error("Repurpose failed");
    const piece = await res.json();
    onCreated(piece);
    toast.success("Repurposed content created");
    handleClose();
  } catch {
    toast.error("Repurpose failed");
    setStepIndex((i) => Math.max(0, i - 1));
    generationStarted.current = false;
  } finally {
    setGenerating(false);
  }
}, [
  repurposeFormat,
  repurposeKeyword,
  repurposeContent,
  projectId,
  onCreated,
  handleClose,
]);

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

function addCompetitorUrl() {
  const normalized = normalizeCompetitorUrl(newCompetitorUrl);
  if (!normalized) {
    toast.error("Enter a valid competitor URL");
    return;
  }
  if (competitorUrls.some((u) => hostFromUrl(u) === hostFromUrl(normalized))) {
    toast.error("That competitor is already listed");
    return;
  }
  if (competitorUrls.length >= 5) {
    toast.error("Maximum 5 competitors");
    return;
  }
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
  if (currentStep === "competitors") {
    void saveCompetitorsAndContinue();
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
  if (currentStep === "review") {
    if (!selectedFormat || !keyword.trim()) {
      toast.error("Enter a target keyword");
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
  selectedFormat,
  saveCompetitorsAndContinue,
  goNextStable,
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

function selectFormat(type: ContentFormatType) {
  setSelectedFormat(type);
  const idx = steps.indexOf("format");
  if (idx >= 0 && idx < steps.length - 1) {
    setStepIndex(idx + 1);
  }
}

function selectPath(nextFlow: Flow) {
  setFlow(nextFlow);
  if (nextFlow === "repurpose") {
    setStepIndex(0);
    return;
  }
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
