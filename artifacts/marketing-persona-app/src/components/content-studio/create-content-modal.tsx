"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  FileText,
  Plus,
  Users,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FORMAT_CATEGORIES,
  FORMAT_META,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  type ContentFormatType,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./content-studio-format-meta";
import {
  getConnectedDestinationsForFormat,
  resolveSuggestedDestination,
  type CmsConnectionSnapshot,
  type PublishDestinationId,
} from "@/lib/projects/publishing-destinations";
import type { ContentPieceRow } from "./content-studio-client";
import { cn } from "@/lib/utils";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor-url";

export type BriefContentDraft = {
  briefId?: number;
  keyword: string;
  angleHint?: string;
  formatType: ContentFormatType;
  workingTitle?: string;
};

type Flow = "create" | "repurpose";

type WizardStepId =
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
  | "repurpose-generating";

const STEPS_WITH_ENTER_CONTINUE: WizardStepId[] = [
  "competitors",
  "destination",
  "linkedin-archetype",
  "linkedin-hook",
  "angle",
  "planned-date",
  "review",
  "repurpose-source",
];

type CompetitorAnalysisRow = {
  competitorUrl: string;
  competitorName: string;
  contentGaps: string[];
  quickWins: string[];
  threatLevel: "low" | "medium" | "high";
};

function extractSections(jsonAccumulated: string): string[] {
  const bodyIdx = jsonAccumulated.indexOf('"body_markdown"');
  if (bodyIdx === -1) return [];
  const afterKey = jsonAccumulated.slice(bodyIdx + '"body_markdown"'.length);
  const valueMatch = afterKey.match(/:\s*"([\s\S]*)/);
  if (!valueMatch) return [];
  const rawValue = valueMatch[1];
  const lines = rawValue.split("\\n");
  return lines
    .map((l) => l.replace(/\\"/g, '"').trim())
    .filter((l) => /^#{1,3}\s/.test(l))
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
}

function buildStepSequence(
  flow: Flow,
  selectedFormat: ContentFormatType | null,
  cmsConnections: CmsConnectionSnapshot,
  skipPathAndFormat: boolean,
): WizardStepId[] {
  if (flow === "repurpose") {
    return ["repurpose-format", "repurpose-keyword", "repurpose-source", "repurpose-generating"];
  }

  const steps: WizardStepId[] = [];
  if (!skipPathAndFormat) steps.push("path", "format");
  steps.push("competitors", "keyword");

  if (selectedFormat) {
    const destinations = getConnectedDestinationsForFormat(selectedFormat, cmsConnections);
    if (destinations.length > 0) steps.push("destination");
    if (selectedFormat === "linkedin_post") {
      steps.push("linkedin-archetype", "linkedin-hook");
    }
  }

  steps.push("angle", "planned-date", "review", "generating");
  return steps;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingPieces: ContentPieceRow[];
  onCreated: (piece: ContentPieceRow) => void;
  initialDraft?: BriefContentDraft | null;
  cmsConnections?: CmsConnectionSnapshot;
  primaryBlogDestination?: string | null;
}

export function CreateContentModal({
  open,
  onClose,
  projectId,
  existingPieces,
  onCreated,
  initialDraft,
  cmsConnections = {},
  primaryBlogDestination = null,
}: Props) {
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
  const [savedCompetitorUrls, setSavedCompetitorUrls] = useState<string[]>([]);
  const [competitorAnalyses, setCompetitorAnalyses] = useState<CompetitorAnalysisRow[]>([]);
  const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [projectIndustry, setProjectIndustry] = useState("");

  const skipPathAndFormat = Boolean(initialDraft);
  const prefersReducedMotion = useReducedMotion();
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
    setSavedCompetitorUrls([]);
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadCompetitorContext() {
      setLoadingCompetitors(true);
      try {
        const res = await fetch(`/api/website-projects/${projectId}/competitors`);
        if (cancelled) return;
        if (!res.ok) throw new Error("Failed to load");

        const data = (await res.json()) as {
          competitorUrls?: string[];
          industry?: string;
          competitorPositioning?: string;
          analyses?: CompetitorAnalysisRow[];
        };

        const urls = normalizeCompetitorUrlList(data.competitorUrls ?? []);
        setCompetitorUrls(urls);
        setSavedCompetitorUrls(urls);
        setProjectIndustry(data.industry ?? "");
        setCompetitorAnalyses(data.analyses ?? []);
        setCompetitorFocusUrl((prev) => {
          if (!prev) return "";
          const normalized = normalizeCompetitorUrl(prev);
          if (!normalized) return "";
          return urls.includes(normalized) ? normalized : "";
        });
      } catch {
        if (!cancelled) toast.error("Failed to load competitor context");
      } finally {
        if (!cancelled) setLoadingCompetitors(false);
      }
    }

    void loadCompetitorContext();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  useEffect(() => {
    if (!selectedFormat) return;
    const suggested = resolveSuggestedDestination(
      selectedFormat,
      cmsConnections,
      primaryBlogDestination,
    );
    setIntendedDestination(suggested ?? "");
  }, [selectedFormat, cmsConnections, primaryBlogDestination]);

  useEffect(() => {
    if (!open || !initialDraft) return;
    setFlow("create");
    setSelectedFormat(initialDraft.formatType);
    setKeyword(initialDraft.keyword);
    setAngleHint(initialDraft.angleHint ?? "");
    setBriefId(initialDraft.briefId ?? null);
    setStepIndex(0);
  }, [open, initialDraft]);

  function goNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }

  function goBack() {
    if (generating || isGeneratingStep) return;
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function buildAngleHint(format: ContentFormatType): string | undefined {
    if (format === "linkedin_post") {
      return `archetype:${linkedinArchetype || ""}|hook:${linkedinHook || ""}|${angleHint.trim() || ""}`;
    }
    return angleHint.trim() || undefined;
  }

  function resolvedCompetitorFocusUrl(): string | undefined {
    if (!competitorFocusUrl) return undefined;
    return normalizeCompetitorUrl(competitorFocusUrl) ?? undefined;
  }

  async function handleGenerateFallback(): Promise<ContentPieceRow> {
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
  }

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
    linkedinArchetype,
    linkedinHook,
    angleHint,
    projectId,
    onCreated,
    handleClose,
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


  async function saveCompetitorsAndContinue() {
    const normalized = normalizeCompetitorUrlList(competitorUrls);

    if (normalized.length !== competitorUrls.length) {
      toast.error("Remove or fix invalid competitor URLs");
      return;
    }

    const dirty = JSON.stringify([...normalized].sort()) !== JSON.stringify([...savedCompetitorUrls].sort());
    if (dirty) {
      try {
        const res = await fetch(`/api/website-projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitorUrls: normalized }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSavedCompetitorUrls(normalized);
        setCompetitorUrls(normalized);
      } catch {
        toast.error("Failed to save competitors");
        return;
      }
    }

    goNext();
  }

  function handleContinue() {
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
      goNext();
      return;
    }
    if (currentStep === "review") {
      if (!selectedFormat || !keyword.trim()) {
        toast.error("Enter a target keyword");
        return;
      }
      generationStarted.current = false;
      goNext();
      return;
    }
    goNext();
  }

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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !generating) handleClose();
      }}
    >
      <DialogContent
        fullscreen
        hideClose
        onEscapeKeyDown={(e) => {
          if (generating) e.preventDefault();
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Create new content</DialogTitle>
        <DialogDescription className="sr-only">
          Step-by-step wizard to create or repurpose content
        </DialogDescription>

        <div className="flex flex-col h-full min-h-0">
          <div className="h-1 w-full bg-muted shrink-0">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
            />
          </div>

      <header className="flex items-center justify-between px-4 sm:px-8 py-4 shrink-0">
        <div className="flex items-center gap-3 min-w-[80px]">
          {stepIndex > 0 && !isGeneratingStep ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          {isGeneratingStep ? "Generating" : `Step ${stepIndex + 1} of ${steps.length}`}
        </p>

        <button
          type="button"
          onClick={handleClose}
          disabled={generating}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-center py-8 sm:py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
              className="w-full"
            >
              {currentStep === "path" && (
                <WizardStep
                  title="What would you like to create?"
                  subtitle="Start fresh or transform something you already have."
                >
                  <div className="grid sm:grid-cols-2 gap-4 mt-10">
                    <OptionCard
                      icon={<Sparkles className="w-6 h-6" />}
                      title="Create new content"
                      description="Pick a format and generate from a keyword or brief."
                      onClick={() => selectPath("create")}
                    />
                    <OptionCard
                      icon={<Shuffle className="w-6 h-6" />}
                      title="Repurpose existing"
                      description="Convert an article or post into a different format."
                      onClick={() => selectPath("repurpose")}
                    />
                  </div>
                </WizardStep>
              )}

              {currentStep === "format" && (
                <WizardStep
                  title="Choose a content format"
                  subtitle="Each format is tuned for length, structure, and channel."
                >
                  <div className="space-y-8 mt-8 max-h-[min(60vh,520px)] overflow-y-auto pr-1">
                    {FORMAT_CATEGORIES.map((cat) => (
                      <div key={cat.label}>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
                          {cat.label}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {cat.formats.map((type) => {
                            const meta = FORMAT_META[type];
                            const Icon = meta.icon;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => selectFormat(type)}
                                className="group text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/40 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <span className={cn("p-2 rounded-lg shrink-0", meta.color)}>
                                    <Icon className="w-4 h-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium">{meta.label}</span>
                                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {meta.wordRange}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {meta.description}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </WizardStep>
              )}

              {currentStep === "competitors" && (
                <WizardStep
                  title="Review your competitive landscape"
                  subtitle="Competitors are managed at the project level. Optionally pick who to differentiate against for this piece."
                >
                  {loadingCompetitors ? (
                    <div className="flex items-center gap-3 mt-10 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading competitor context…
                    </div>
                  ) : (
                    <div className="mt-8 space-y-6">
                      {competitorUrls.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            No competitors on file for this project yet. Add them in Brand settings or
                            quick-add one below before planning content.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Tap a competitor to set the primary focus for this piece (optional).
                        </p>
                      )}

                      <div className="space-y-3">
                        {competitorUrls.map((url) => {
                          const analysis = competitorAnalyses.find(
                            (a) => hostFromUrl(a.competitorUrl) === hostFromUrl(url),
                          );
                          const isFocus = competitorFocusUrl === url;
                          return (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setCompetitorFocusUrl(isFocus ? "" : url)}
                              className={cn(
                                "w-full text-left rounded-xl border p-4 transition-all",
                                isFocus ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">
                                  {analysis?.competitorName ?? hostFromUrl(url)}
                                </span>
                                {analysis ? (
                                  <span
                                    className={cn(
                                      "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                                      analysis.threatLevel === "high"
                                        ? "bg-destructive/10 text-destructive"
                                        : analysis.threatLevel === "medium"
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                                    )}
                                  >
                                    {analysis.threatLevel} threat
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Not analyzed</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">{url}</p>
                              {isFocus ? (
                                <p className="text-xs text-primary mt-2">Primary competitor for this piece</p>
                              ) : null}
                              {analysis && analysis.contentGaps.length > 0 ? (
                                <div className="mt-3 pt-3 border-t border-border/60">
                                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Content gaps</p>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {analysis.contentGaps.slice(0, 3).map((gap) => (
                                      <li key={gap} className="flex gap-2">
                                        <span className="text-primary shrink-0">·</span>
                                        <span>{gap}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Quick-add competitor URL"
                          value={newCompetitorUrl}
                          onChange={(e) => setNewCompetitorUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCompetitorUrl()}
                          disabled={competitorUrls.length >= 5}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCompetitorUrl}
                          disabled={competitorUrls.length >= 5 || !newCompetitorUrl.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <Link
                          href={`/projects/${projectId}?tab=brand`}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Manage competitors in Brand settings
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/research/competitors${projectIndustry ? `?industry=${encodeURIComponent(projectIndustry)}` : ""}`}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          target="_blank"
                        >
                          Run full competitor analysis
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <StepActions
                    onContinue={handleContinue}
                    onSkip={competitorUrls.length === 0 ? handleContinue : undefined}
                    skipLabel="Skip for now"
                    continueLabel="Continue"
                  />
                </WizardStep>
              )}

              {currentStep === "keyword" && selectedFormat && (
                <WizardStep
                  title="What's your target keyword?"
                  subtitle={
                    initialDraft?.workingTitle
                      ? `From brief: ${initialDraft.workingTitle}`
                      : `Generating a ${FORMAT_META[selectedFormat].label.toLowerCase()}.`
                  }
                >
                  <div className="mt-10">
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. local SEO for startups"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                      className="w-full bg-transparent border-0 border-b-2 border-border focus:border-primary text-2xl sm:text-3xl font-medium placeholder:text-muted-foreground/40 outline-none py-3 transition-colors"
                    />
                  </div>
                  <StepActions onContinue={handleContinue} continueDisabled={!keyword.trim()} />
                </WizardStep>
              )}

              {currentStep === "destination" && selectedFormat && (
                <WizardStep
                  title="Where will this be published?"
                  subtitle="Optional — shapes generation and pre-selects your publish destination."
                >
                  <div className="mt-10 space-y-4">
                    <Select
                      value={intendedDestination || "__none__"}
                      onValueChange={(v) =>
                        setIntendedDestination(v === "__none__" ? "" : (v as PublishDestinationId))
                      }
                    >
                      <SelectTrigger className="h-14 text-lg">
                        <SelectValue placeholder="Decide later" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Decide later</SelectItem>
                        {getConnectedDestinationsForFormat(selectedFormat, cmsConnections).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "linkedin-archetype" && (
                <WizardStep
                  title="Pick a content archetype"
                  subtitle="Optional — influences structure and tone for LinkedIn."
                >
                  <div className="grid sm:grid-cols-2 gap-3 mt-8">
                    {LINKEDIN_ARCHETYPES.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setLinkedinArchetype(a.id);
                          goNext();
                        }}
                        className={cn(
                          "text-left p-4 rounded-xl border transition-all",
                          linkedinArchetype === a.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/60 hover:bg-accent/30",
                        )}
                      >
                        <p className="font-medium">{a.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                      </button>
                    ))}
                  </div>
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "linkedin-hook" && (
                <WizardStep
                  title="Choose a hook style"
                  subtitle="Optional — sets the opening line pattern."
                >
                  <div className="grid sm:grid-cols-2 gap-3 mt-8">
                    {LINKEDIN_HOOK_TYPES.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setLinkedinHook(h.id);
                          goNext();
                        }}
                        className={cn(
                          "text-left p-4 rounded-xl border transition-all",
                          linkedinHook === h.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/60 hover:bg-accent/30",
                        )}
                      >
                        <p className="font-medium">{h.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {h.template}
                        </p>
                      </button>
                    ))}
                  </div>
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "angle" && (
                <WizardStep
                  title="Any angle or special instructions?"
                  subtitle="Optional — tone notes, audience, or context for the AI."
                >
                  <Textarea
                    autoFocus
                    rows={4}
                    placeholder="e.g. Focus on B2B SaaS founders, conversational tone…"
                    value={angleHint}
                    onChange={(e) => setAngleHint(e.target.value)}
                    className="mt-8 text-lg min-h-[140px] resize-none"
                  />
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "planned-date" && (
                <WizardStep
                  title="When do you plan to publish?"
                  subtitle="Optional — adds it to your content calendar."
                >
                  <Input
                    autoFocus
                    type="date"
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="mt-8 h-14 text-lg max-w-xs"
                  />
                  <StepActions onContinue={handleContinue} onSkip={handleContinue} />
                </WizardStep>
              )}

              {currentStep === "review" && selectedFormat && (
                <WizardStep
                  title="Ready to generate?"
                  subtitle="Review your choices, then we'll write your content."
                >
                  <div className="mt-8 rounded-2xl border border-border bg-muted/30 divide-y divide-border">
                    <ReviewRow label="Format" value={FORMAT_META[selectedFormat].label} />
                    <ReviewRow label="Keyword" value={keyword.trim()} />
                    {competitorUrls.length > 0 ? (
                      <ReviewRow
                        label="Competitors"
                        value={
                          competitorFocusUrl
                            ? `${hostFromUrl(competitorFocusUrl)} (primary) · ${competitorUrls.length} tracked`
                            : `${competitorUrls.length} tracked`
                        }
                      />
                    ) : null}
                    {intendedDestination ? (
                      <ReviewRow
                        label="Destination"
                        value={
                          getConnectedDestinationsForFormat(selectedFormat, cmsConnections).find(
                            (d) => d.id === intendedDestination,
                          )?.label ?? intendedDestination
                        }
                      />
                    ) : null}
                    {linkedinArchetype ? (
                      <ReviewRow
                        label="Archetype"
                        value={
                          LINKEDIN_ARCHETYPES.find((a) => a.id === linkedinArchetype)?.label ??
                          linkedinArchetype
                        }
                      />
                    ) : null}
                    {linkedinHook ? (
                      <ReviewRow
                        label="Hook"
                        value={
                          LINKEDIN_HOOK_TYPES.find((h) => h.id === linkedinHook)?.label ??
                          linkedinHook
                        }
                      />
                    ) : null}
                    {angleHint.trim() ? <ReviewRow label="Instructions" value={angleHint.trim()} /> : null}
                    {plannedDate ? <ReviewRow label="Planned date" value={plannedDate} /> : null}
                  </div>

                  <label className="flex items-center gap-3 mt-6 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassCache}
                      onChange={(e) => setBypassCache(e.target.checked)}
                      className="rounded"
                    />
                    Bypass cache (force fresh generation)
                  </label>

                  <div className="mt-8">
                    <Button size="lg" onClick={handleContinue} disabled={!keyword.trim()} className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate {FORMAT_META[selectedFormat].label}
                    </Button>
                  </div>
                </WizardStep>
              )}

              {currentStep === "generating" && selectedFormat && (
                <WizardStep
                  title={`Writing your ${FORMAT_META[selectedFormat].label}…`}
                  subtitle={`Target: ${keyword.trim()} · ${FORMAT_META[selectedFormat].wordRange}`}
                >
                  <div className="mt-10 space-y-3">
                    {detectedSections.length === 0 ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        <span className="text-lg">Starting generation…</span>
                      </div>
                    ) : (
                      detectedSections.map((sec, i) => {
                        const isLast = i === detectedSections.length - 1;
                        return (
                          <div
                            key={`${sec}-${i}`}
                            className={cn(
                              "flex items-center gap-3 text-lg",
                              isLast ? "text-foreground font-medium" : "text-muted-foreground",
                            )}
                          >
                            {isLast ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            )}
                            {sec}
                          </div>
                        );
                      })
                    )}
                  </div>
                </WizardStep>
              )}

              {currentStep === "repurpose-format" && (
                <WizardStep
                  title="What format do you want?"
                  subtitle="We'll adapt your source content to this format."
                >
                  <div className="grid sm:grid-cols-2 gap-3 mt-8 max-h-[min(55vh,480px)] overflow-y-auto pr-1">
                    {Object.entries(FORMAT_META).map(([value, meta]) => {
                      const Icon = meta.icon;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setRepurposeFormat(value as ContentFormatType);
                            goNext();
                          }}
                          className={cn(
                            "text-left p-4 rounded-xl border transition-all",
                            repurposeFormat === value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/60",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn("p-2 rounded-lg", meta.color)}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="font-medium">{meta.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </WizardStep>
              )}

              {currentStep === "repurpose-keyword" && (
                <WizardStep
                  title="What's the target keyword?"
                  subtitle={`Repurposing into a ${FORMAT_META[repurposeFormat].label.toLowerCase()}.`}
                >
                  <input
                    autoFocus
                    type="text"
                    value={repurposeKeyword}
                    onChange={(e) => setRepurposeKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    className="w-full mt-10 bg-transparent border-0 border-b-2 border-border focus:border-primary text-2xl sm:text-3xl font-medium outline-none py-3 transition-colors"
                  />
                  <StepActions onContinue={handleContinue} continueDisabled={!repurposeKeyword.trim()} />
                </WizardStep>
              )}

              {currentStep === "repurpose-source" && (
                <WizardStep
                  title="Paste your source content"
                  subtitle="At least 50 characters — or load from an existing piece."
                >
                  {existingPieces.length > 0 && (
                    <div className="mt-6">
                      <Select
                        value={sourcePieceId}
                        onValueChange={(id) => void loadSourcePiece(id)}
                        disabled={loadingSourcePiece}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Load from existing piece…" />
                        </SelectTrigger>
                        <SelectContent>
                          {existingPieces.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {loadingSourcePiece && (
                        <p className="text-sm text-muted-foreground mt-2">Loading content…</p>
                      )}
                    </div>
                  )}
                  <Textarea
                    rows={8}
                    placeholder="Paste existing content here…"
                    value={repurposeContent}
                    onChange={(e) => setRepurposeContent(e.target.value)}
                    className="mt-6 text-base min-h-[200px]"
                  />
                  <StepActions
                    onContinue={handleContinue}
                    continueLabel="Repurpose"
                    continueDisabled={repurposeContent.trim().length < 50}
                  />
                </WizardStep>
              )}

              {currentStep === "repurpose-generating" && (
                <WizardStep
                  title="Repurposing your content…"
                  subtitle={`Creating a ${FORMAT_META[repurposeFormat].label.toLowerCase()}.`}
                >
                  <div className="flex items-center gap-3 mt-10 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span className="text-lg">Transforming content…</span>
                  </div>
                </WizardStep>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WizardStep({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

function OptionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left p-6 sm:p-8 rounded-2xl border border-border hover:border-primary hover:bg-accent/30 transition-all"
    >
      <span className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-4">{icon}</span>
      <p className="text-xl font-semibold">{title}</p>
      <p className="text-muted-foreground mt-2 leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-1 mt-6 text-sm font-medium text-primary">
        Continue <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

function StepActions({
  onContinue,
  onSkip,
  continueLabel = "Continue",
  skipLabel = "Skip",
  continueDisabled = false,
}: {
  onContinue: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  skipLabel?: string;
  continueDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 mt-10">
      <Button size="lg" onClick={onContinue} disabled={continueDisabled} className="gap-2">
        {continueLabel}
        <ArrowRight className="w-4 h-4" />
      </Button>
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {skipLabel}
        </button>
      ) : null}
      <p className="text-xs text-muted-foreground/60 w-full sm:w-auto sm:ml-2">
        press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd>
      </p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-5 py-4">
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="font-medium flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
        {value}
      </span>
    </div>
  );
}
