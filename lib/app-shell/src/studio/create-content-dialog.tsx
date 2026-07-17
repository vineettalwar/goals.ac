import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, Plus, RefreshCw, Users } from "lucide-react";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor/competitor-url";
import {
  getConnectedDestinationsForFormat,
  type CmsConnectionSnapshot,
  type ContentFormatType,
  type PublishDestinationId,
} from "../content-piece/publish-destinations";
import {
  buildLinkedInAngleHint,
  LINKEDIN_ARCHETYPES,
  LINKEDIN_HOOK_TYPES,
  parseLinkedInArchetypeFromAngleHint,
  parseLinkedInHookFromAngleHint,
  stripLinkedInAngleMeta,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./linkedin-archetypes";
import { STUDIO_FORMAT_OPTIONS, formatTypeLabel } from "./types";

export type CreateContentDraftInput = {
  title: string;
  targetKeyword: string;
  formatType: string;
  angleHint?: string;
  plannedDate?: string | null;
  /** Optional pre-selected publish destination (shapes generation when supported). */
  intendedPublishPlatform?: string;
  /** Primary competitor URL sent to generate as competitorFocusUrl. */
  competitorFocusUrl?: string;
  /** All selected competitor URLs (max 5; focus first when set). Sent as competitorUrls. */
  competitorUrls?: string[];
  /** Source brief this piece was created from (deep-linked via ?briefId=). */
  briefId?: number;
};

export type CreateContentInitialValues = Partial<CreateContentDraftInput>;

/** Minimal brief shape needed to seed the create dialog — matches the briefs API row. */
export type BriefDraftSource = {
  id: number;
  workingTitle: string;
  targetKeywordCluster?: string | null;
  angle?: string | null;
  format?: string | null;
};

/** Mirrors Next `briefToDraft` (content-studio-utils.ts) for the shell create dialog. */
export function briefToCreateContentInitialValues(
  brief: BriefDraftSource,
): CreateContentInitialValues {
  const parts = [`Title: ${brief.workingTitle}`];
  if (brief.targetKeywordCluster) parts.push(`Keywords: ${brief.targetKeywordCluster}`);
  if (brief.angle) parts.push(brief.angle);

  return {
    briefId: brief.id,
    title: brief.workingTitle,
    targetKeyword: brief.targetKeywordCluster?.trim() || brief.workingTitle,
    formatType:
      brief.format && VALID_FORMATS.has(brief.format as never) ? brief.format : "blog_post",
    angleHint: parts.join("\n"),
  };
}

/** Project-level competitor row for the create-wizard picker. */
export type CreateCompetitorOption = {
  url: string;
  name?: string;
  summary?: string;
  threatLevel?: "low" | "medium" | "high";
  contentGaps?: string[];
};

export type RepurposeContentInput = {
  targetFormat: string;
  targetKeyword: string;
  existingContent: string;
};

export type CreateSourcePieceOption = {
  id: number;
  title: string;
  targetKeyword?: string | null;
  formatType?: string;
};

/** Compact create flow: [path?] → format → keyword → … → review. */
type CreateFlow = "create" | "repurpose";
type CreateStepId =
  | "path"
  | "format"
  | "keyword"
  | "competitors"
  | "destination"
  | "source"
  | "review";

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));
const MAX_COMPETITOR_URLS = 5;
const MIN_REPURPOSE_CHARS = 50;

/** Mirrors `SEO_LONGFORM_FORMATS` in content-engine — no db type dependency here. */
const SEO_LONGFORM_FORMATS = new Set([
  "blog_post",
  "guide",
  "tutorial",
  "pillar_page",
  "whitepaper",
  "faq_article",
  "news_article",
  "location_page",
]);

/** Progress labels — index driven by SSE stream phase when the host feeds generatingPhase. */
const GENERATING_LABELS = ["Analyzing", "Drafting", "Finishing"] as const;

export type CreateGeneratingPhase = "analyzing" | "drafting" | "finishing";

function phaseToLabelIndex(phase: CreateGeneratingPhase | null | undefined): number {
  if (phase === "finishing") return 2;
  if (phase === "drafting") return 1;
  return 0;
}

function isSeoLongform(formatType: string): boolean {
  return SEO_LONGFORM_FORMATS.has(formatType);
}

function asContentFormat(formatType: string): ContentFormatType | null {
  return VALID_FORMATS.has(formatType as never) ? (formatType as ContentFormatType) : null;
}

function competitorUrlsFromInitial(
  initial: CreateContentInitialValues | null | undefined,
): string[] {
  const fromList = initial?.competitorUrls?.filter((u) => u.trim()) ?? [];
  if (fromList.length > 0) return normalizeCompetitorUrlList(fromList);
  const focus = initial?.competitorFocusUrl?.trim();
  return focus ? normalizeCompetitorUrlList([focus]) : [];
}

function optionByHost(options: CreateCompetitorOption[]): Map<string, CreateCompetitorOption> {
  const map = new Map<string, CreateCompetitorOption>();
  for (const option of options) {
    const url = normalizeCompetitorUrl(option.url);
    if (!url) continue;
    map.set(hostFromUrl(url), { ...option, url });
  }
  return map;
}

function buildSteps(
  flow: CreateFlow,
  formatType: string,
  destinations: { id: PublishDestinationId }[],
  enableRepurpose: boolean,
): CreateStepId[] {
  if (flow === "repurpose") {
    const steps: CreateStepId[] = enableRepurpose ? ["path"] : [];
    steps.push("format", "keyword", "source", "review");
    return steps;
  }
  const steps: CreateStepId[] = enableRepurpose ? ["path", "format", "keyword"] : ["format", "keyword"];
  if (isSeoLongform(formatType)) steps.push("competitors");
  if (destinations.length > 0) steps.push("destination");
  steps.push("review");
  return steps;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground break-words">{value}</span>
    </div>
  );
}

/**
 * Compact create/repurpose wizard shared by Vite Studio.
 *
 * Wave 5.B.1: Next.js `CreateContentModal` is the rich SSOT for the canonical
 * product. This dialog stays format-list-aligned with `STUDIO_FORMAT_OPTIONS`
 * (includes Bluesky/Mastodon) so Vite parity does not diverge on formats.
 */
export function CreateContentDialog({
  open,
  onClose,
  onSubmit,
  onRepurpose,
  submitting = false,
  error = null,
  initialValues = null,
  cmsConnections = null,
  projectCompetitors = null,
  competitorsLoading = false,
  generatingPhase = null,
  generatingHeadings = null,
  existingPieces = null,
  onLoadSourcePiece,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateContentDraftInput) => void | Promise<void>;
  /** When set with existingPieces, enables Create vs Repurpose path. */
  onRepurpose?: (input: RepurposeContentInput) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
  initialValues?: CreateContentInitialValues | null;
  cmsConnections?: CmsConnectionSnapshot | null;
  projectCompetitors?: CreateCompetitorOption[] | null;
  competitorsLoading?: boolean;
  /** SSE generate stream lifecycle (analyzing → drafting → finishing). */
  generatingPhase?: CreateGeneratingPhase | null;
  /** Headings parsed from stream chunks while drafting. */
  generatingHeadings?: string[] | null;
  existingPieces?: CreateSourcePieceOption[] | null;
  onLoadSourcePiece?: (
    pieceId: number,
  ) => Promise<{ bodyMarkdown: string; targetKeyword?: string | null } | null>;
}) {
  const enableRepurpose = Boolean(onRepurpose);
  const [flow, setFlow] = useState<CreateFlow>("create");
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [formatType, setFormatType] = useState("blog_post");
  const [angleHint, setAngleHint] = useState("");
  const [linkedinArchetype, setLinkedinArchetype] = useState<LinkedInArchetypeId | "">("");
  const [linkedinHook, setLinkedinHook] = useState<LinkedInHookId | "">("");
  const [plannedDate, setPlannedDate] = useState("");
  const [intendedPublishPlatform, setIntendedPublishPlatform] = useState<string | undefined>();
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);
  const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");
  const [newCompetitorUrl, setNewCompetitorUrl] = useState("");
  const [sourcePieceId, setSourcePieceId] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [loadingSourcePiece, setLoadingSourcePiece] = useState(false);
  const [briefId, setBriefId] = useState<number | undefined>(undefined);

  const contentFormat = asContentFormat(formatType);
  const destinations = useMemo(() => {
    if (flow === "repurpose" || !contentFormat) return [];
    return getConnectedDestinationsForFormat(contentFormat, cmsConnections ?? {});
  }, [contentFormat, cmsConnections, flow]);

  const competitorMeta = useMemo(
    () => optionByHost(projectCompetitors ?? []),
    [projectCompetitors],
  );

  const steps = useMemo(
    () => buildSteps(flow, formatType, destinations, enableRepurpose),
    [flow, formatType, destinations, enableRepurpose],
  );

  useEffect(() => {
    if (!open) {
      setFlow("create");
      setStepIndex(0);
      setTitle("");
      setTargetKeyword("");
      setFormatType("blog_post");
      setAngleHint("");
      setLinkedinArchetype("");
      setLinkedinHook("");
      setPlannedDate("");
      setIntendedPublishPlatform(undefined);
      setCompetitorUrls([]);
      setCompetitorFocusUrl("");
      setNewCompetitorUrl("");
      setSourcePieceId("");
      setSourceContent("");
      setLoadingSourcePiece(false);
      setBriefId(undefined);
      return;
    }

    const nextFormat =
      initialValues?.formatType && VALID_FORMATS.has(initialValues.formatType as never)
        ? initialValues.formatType
        : "blog_post";
    const initialAngle = initialValues?.angleHint?.trim() ?? "";
    setFlow("create");
    setStepIndex(0);
    setTitle(initialValues?.title?.trim() ?? "");
    setTargetKeyword(initialValues?.targetKeyword?.trim() ?? "");
    setFormatType(nextFormat);
    setLinkedinArchetype(parseLinkedInArchetypeFromAngleHint(initialAngle));
    setLinkedinHook(parseLinkedInHookFromAngleHint(initialAngle));
    setAngleHint(
      nextFormat === "linkedin_post"
        ? stripLinkedInAngleMeta(initialAngle)
        : initialAngle,
    );
    setPlannedDate(initialValues?.plannedDate?.trim() || "");
    setIntendedPublishPlatform(initialValues?.intendedPublishPlatform?.trim() || undefined);
    setCompetitorUrls(competitorUrlsFromInitial(initialValues));
    setCompetitorFocusUrl(
      normalizeCompetitorUrl(initialValues?.competitorFocusUrl ?? "") ?? "",
    );
    setNewCompetitorUrl("");
    setSourcePieceId("");
    setSourceContent("");
    setLoadingSourcePiece(false);
    setBriefId(initialValues?.briefId);
  }, [open, initialValues]);

  // Merge project competitors once they arrive (async host fetch).
  useEffect(() => {
    if (!open || competitorsLoading || flow === "repurpose") return;
    const fromProject = normalizeCompetitorUrlList(
      (projectCompetitors ?? []).map((option) => option.url),
    );
    if (fromProject.length === 0) return;
    setCompetitorUrls((prev) => normalizeCompetitorUrlList([...prev, ...fromProject]));
    setCompetitorFocusUrl((prev) => {
      if (!prev) return "";
      const normalized = normalizeCompetitorUrl(prev);
      if (!normalized) return "";
      const merged = normalizeCompetitorUrlList([...competitorUrlsFromInitial(initialValues), ...fromProject]);
      return merged.some((url) => hostFromUrl(url) === hostFromUrl(normalized))
        ? normalized
        : "";
    });
  }, [open, competitorsLoading, projectCompetitors, initialValues, flow]);

  // Clamp step when format/connections change the sequence length.
  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

  // Drop a stale destination when format no longer offers it.
  useEffect(() => {
    if (!intendedPublishPlatform) return;
    if (destinations.some((d) => d.id === intendedPublishPlatform)) return;
    setIntendedPublishPlatform(undefined);
  }, [destinations, intendedPublishPlatform]);

  if (!open) return null;

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? "format";
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isLinkedIn = formatType === "linkedin_post" && flow === "create";
  const showGenerating = submitting && currentStep === "review";
  const generatingLabelIndex = phaseToLabelIndex(
    submitting ? (generatingPhase ?? "analyzing") : null,
  );
  const sessionCompetitorUrls = isSeoLongform(formatType) ? competitorUrls : [];
  const focusCompetitorUrl = competitorFocusUrl || sessionCompetitorUrls[0];
  const selectedDestinationLabel = intendedPublishPlatform
    ? destinations.find((d) => d.id === intendedPublishPlatform)?.label ??
      intendedPublishPlatform
    : null;

  function goBack() {
    if (submitting || stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }

  function goNext() {
    if (submitting) return;
    if (currentStep === "keyword" && !targetKeyword.trim()) return;
    if (currentStep === "source" && sourceContent.trim().length < MIN_REPURPOSE_CHARS) return;
    if (currentStep === "review") return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function addQuickCompetitor() {
    const normalized = normalizeCompetitorUrl(newCompetitorUrl);
    if (!normalized) return;
    setCompetitorUrls((prev) => normalizeCompetitorUrlList([...prev, normalized]));
    setNewCompetitorUrl("");
  }

  async function selectSourcePiece(pieceId: string) {
    setSourcePieceId(pieceId);
    if (!pieceId || !onLoadSourcePiece) return;
    const id = Number(pieceId);
    if (!Number.isFinite(id)) return;
    setLoadingSourcePiece(true);
    try {
      const loaded = await onLoadSourcePiece(id);
      if (loaded?.bodyMarkdown) {
        setSourceContent(loaded.bodyMarkdown);
        if (loaded.targetKeyword?.trim() && !targetKeyword.trim()) {
          setTargetKeyword(loaded.targetKeyword.trim());
        }
      }
    } finally {
      setLoadingSourcePiece(false);
    }
  }

  async function handleGenerate() {
    const keyword = targetKeyword.trim();
    if (!keyword || submitting) return;

    if (flow === "repurpose") {
      if (!onRepurpose || sourceContent.trim().length < MIN_REPURPOSE_CHARS) return;
      await onRepurpose({
        targetFormat: formatType,
        targetKeyword: keyword,
        existingContent: sourceContent.trim(),
      });
      return;
    }

    const resolvedAngle =
      formatType === "linkedin_post"
        ? buildLinkedInAngleHint(linkedinArchetype, linkedinHook, angleHint)
        : angleHint.trim() || undefined;

    const urls = isSeoLongform(formatType) ? competitorUrls : [];
    const focus = competitorFocusUrl || urls[0];

    await onSubmit({
      title: title.trim(),
      targetKeyword: keyword,
      formatType,
      angleHint: resolvedAngle,
      plannedDate: plannedDate.trim() || null,
      intendedPublishPlatform: intendedPublishPlatform || undefined,
      competitorFocusUrl: focus || undefined,
      competitorUrls: urls.length > 0 ? urls : undefined,
      briefId,
    });
  }

  const stepTitle = showGenerating
    ? flow === "repurpose"
      ? `Repurposing into ${formatTypeLabel(formatType)}…`
      : `Writing your ${formatTypeLabel(formatType)}…`
    : currentStep === "path"
      ? "How do you want to start?"
      : currentStep === "format"
        ? "Choose a format"
        : currentStep === "keyword"
          ? flow === "repurpose"
            ? "Target keyword"
            : isLinkedIn
              ? "Keyword & archetype"
              : "Keyword & angle"
          : currentStep === "source"
            ? "Source content"
            : currentStep === "competitors"
              ? "Competitor landscape"
              : currentStep === "destination"
                ? "Where will this be published?"
                : flow === "repurpose"
                  ? "Confirm & repurpose"
                  : "Schedule & review";

  const stepSubtitle = showGenerating
    ? `Target: ${targetKeyword.trim() || "—"}`
    : currentStep === "path"
      ? "Create from a keyword, or adapt an existing piece."
      : currentStep === "format"
        ? flow === "repurpose"
          ? "We'll adapt your source content to this format."
          : "Pick the content type — we tailor structure and length to match."
        : currentStep === "keyword"
          ? flow === "repurpose"
            ? "Required — used for the new piece title focus."
            : isLinkedIn
              ? "Target keyword is required. Archetype and hook chips are optional."
              : "Target keyword is required. Angle and title are optional."
          : currentStep === "source"
            ? `Paste content or pick a studio piece (min ${MIN_REPURPOSE_CHARS} characters).`
            : currentStep === "competitors"
              ? "Optional — tap a project competitor as primary focus, or quick-add a URL."
              : currentStep === "destination"
                ? "Optional — shapes generation and pre-selects your publish destination."
                : flow === "repurpose"
                  ? "Confirm the adaptation, then generate."
                  : "Optional date for the calendar, then confirm and generate.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={() => !submitting && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-content-title"
        className="paper-card relative z-10 flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden shadow-lg"
      >
        <div className="h-1 w-full shrink-0 bg-muted">
          <div
            className="h-full origin-left bg-primary transition-transform duration-300 ease-out"
            style={{
              transform: `scaleX(${showGenerating ? 1 : progress / 100})`,
            }}
          />
        </div>

        <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <div className="min-w-[72px] items-center flex">
            {stepIndex > 0 && !showGenerating ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            {showGenerating
              ? "Generating"
              : `Step ${stepIndex + 1} of ${steps.length}`}
          </p>
          <div className="min-w-[72px]" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <h2 id="create-content-title" className="text-lg font-semibold">
            {stepTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{stepSubtitle}</p>

          {showGenerating ? (
            <div className="mt-8 space-y-3" aria-live="polite" aria-busy="true">
              {GENERATING_LABELS.map((label, index) => {
                const done = index < generatingLabelIndex;
                const active = index === generatingLabelIndex;
                return (
                  <div
                    key={label}
                    className={
                      active
                        ? "flex items-center gap-3 text-sm font-medium text-foreground"
                        : done
                          ? "flex items-center gap-3 text-sm text-muted-foreground"
                          : "flex items-center gap-3 text-sm text-muted-foreground/50"
                    }
                  >
                    {active ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                    )}
                    {label}
                  </div>
                );
              })}
              {generatingHeadings && generatingHeadings.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
                  {generatingHeadings.map((section, index) => {
                    const isLast = index === generatingHeadings.length - 1;
                    return (
                      <li
                        key={`${index}-${section}`}
                        className={
                          isLast
                            ? "flex items-center gap-3 text-sm font-medium text-foreground"
                            : "flex items-center gap-3 text-sm text-muted-foreground"
                        }
                      >
                        {isLast && generatingLabelIndex === 1 ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        )}
                        {section}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}

          {!showGenerating && currentStep === "path" ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setFlow("create");
                  setStepIndex(1);
                }}
                className={
                  flow === "create"
                    ? "flex w-full items-start gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left"
                    : "flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary/60 hover:bg-secondary/40"
                }
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium">Create new</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Generate from a keyword and optional competitor focus.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlow("repurpose");
                  setFormatType("linkedin_post");
                  setStepIndex(1);
                }}
                className={
                  flow === "repurpose"
                    ? "flex w-full items-start gap-3 rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left"
                    : "flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary/60 hover:bg-secondary/40"
                }
              >
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium">Repurpose existing</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Adapt a studio piece or pasted draft into another format.
                  </span>
                </span>
              </button>
            </div>
          ) : null}

          {!showGenerating && currentStep === "format" ? (
            <div className="mt-4 max-h-[min(42vh,300px)] space-y-2 overflow-y-auto pr-1">
              {STUDIO_FORMAT_OPTIONS.map((option) => {
                const selected = formatType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormatType(option.value);
                      if (option.value !== "linkedin_post") {
                        setLinkedinArchetype("");
                        setLinkedinHook("");
                      }
                    }}
                    className={
                      selected
                        ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-left text-sm"
                        : "flex w-full items-center justify-between rounded-xl border border-border px-4 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
                    }
                  >
                    <span className="font-medium">{option.label}</span>
                    {selected ? (
                      <span className="text-xs text-primary">Selected</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {!showGenerating && currentStep === "keyword" ? (
            <div className="mt-4 space-y-3.5">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Target keyword</span>
                <input
                  type="text"
                  autoFocus
                  required
                  value={targetKeyword}
                  onChange={(event) => setTargetKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      goNext();
                    }
                  }}
                  placeholder="e.g. saas seo strategy"
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                />
              </label>

              {isLinkedIn ? (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">
                    Archetype{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {LINKEDIN_ARCHETYPES.map((archetype) => {
                      const selected = linkedinArchetype === archetype.id;
                      return (
                        <button
                          key={archetype.id}
                          type="button"
                          title={archetype.description}
                          onClick={() =>
                            setLinkedinArchetype(selected ? "" : archetype.id)
                          }
                          className={
                            selected
                              ? "rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-left text-sm font-medium text-foreground"
                              : "rounded-lg border border-border px-3 py-1.5 text-left text-sm text-muted-foreground hover:border-primary/60 hover:bg-secondary/40 hover:text-foreground"
                          }
                        >
                          {archetype.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isLinkedIn ? (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">
                    Hook type{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {LINKEDIN_HOOK_TYPES.map((hook) => {
                      const selected = linkedinHook === hook.id;
                      return (
                        <button
                          key={hook.id}
                          type="button"
                          title={hook.template}
                          onClick={() => setLinkedinHook(selected ? "" : hook.id)}
                          className={
                            selected
                              ? "rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-left text-sm font-medium text-foreground"
                              : "rounded-lg border border-border px-3 py-1.5 text-left text-sm text-muted-foreground hover:border-primary/60 hover:bg-secondary/40 hover:text-foreground"
                          }
                        >
                          {hook.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {flow === "create" ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">
                      {isLinkedIn ? "Extra notes" : "Angle / hint"}{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </span>
                    <textarea
                      rows={2}
                      value={angleHint}
                      onChange={(event) => setAngleHint(event.target.value)}
                      placeholder={
                        isLinkedIn
                          ? "Optional context beyond archetype and hook…"
                          : "Tone, audience, or angle for the AI…"
                      }
                      className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">
                      Title <span className="font-normal text-muted-foreground">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. How to improve SEO for SaaS"
                      className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}

          {!showGenerating && currentStep === "source" ? (
            <div className="mt-4 space-y-3.5">
              {(existingPieces?.length ?? 0) > 0 ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Studio piece</span>
                  <select
                    value={sourcePieceId}
                    onChange={(event) => void selectSourcePiece(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    <option value="">Paste below instead…</option>
                    {existingPieces!.map((piece) => (
                      <option key={piece.id} value={String(piece.id)}>
                        {piece.title || `Piece #${piece.id}`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {loadingSourcePiece ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading piece…
                </div>
              ) : null}
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Source text</span>
                <textarea
                  autoFocus
                  rows={8}
                  value={sourceContent}
                  onChange={(event) => setSourceContent(event.target.value)}
                  placeholder="Paste the draft to adapt…"
                  className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {sourceContent.trim().length} / {MIN_REPURPOSE_CHARS} characters minimum
              </p>
            </div>
          ) : null}

          {!showGenerating && currentStep === "competitors" ? (
            <div className="mt-4 space-y-3.5">
              {competitorsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading competitor context…
                </div>
              ) : null}

              {!competitorsLoading && sessionCompetitorUrls.length === 0 ? (
                <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>
                    No competitors on file for this project yet. Quick-add one below, or manage them
                    in Brand settings / Research.
                  </p>
                </div>
              ) : null}

              <div className="max-h-[min(36vh,280px)] space-y-2 overflow-y-auto pr-1">
                {sessionCompetitorUrls.map((url) => {
                  const meta = competitorMeta.get(hostFromUrl(url));
                  const isFocus = hostFromUrl(focusCompetitorUrl ?? "") === hostFromUrl(url);
                  const gaps = meta?.contentGaps?.filter(Boolean).slice(0, 2) ?? [];
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() =>
                        setCompetitorFocusUrl(isFocus ? "" : url)
                      }
                      className={
                        isFocus
                          ? "flex w-full flex-col items-start rounded-xl border border-primary bg-primary/5 px-3.5 py-2.5 text-left"
                          : "flex w-full flex-col items-start rounded-xl border border-border px-3.5 py-2.5 text-left hover:border-primary/60 hover:bg-secondary/40"
                      }
                    >
                      <span className="flex w-full items-center gap-2">
                        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">
                          {meta?.name?.trim() || hostFromUrl(url)}
                        </span>
                        {meta?.threatLevel ? (
                          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {meta.threatLevel}
                          </span>
                        ) : (
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                            On file
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">
                        {url}
                      </span>
                      {isFocus ? (
                        <span className="mt-1.5 pl-5 text-xs text-primary">
                          Primary competitor for this piece
                        </span>
                      ) : null}
                      {gaps.length > 0 ? (
                        <ul className="mt-2 space-y-0.5 border-t border-border/60 pt-2 pl-5 text-xs text-muted-foreground">
                          {gaps.map((gap) => (
                            <li key={gap}>· {gap}</li>
                          ))}
                        </ul>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newCompetitorUrl}
                  onChange={(event) => setNewCompetitorUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addQuickCompetitor();
                    }
                  }}
                  placeholder="Quick-add competitor URL"
                  disabled={sessionCompetitorUrls.length >= MAX_COMPETITOR_URLS}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={addQuickCompetitor}
                  disabled={
                    sessionCompetitorUrls.length >= MAX_COMPETITOR_URLS ||
                    !newCompetitorUrl.trim()
                  }
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_COMPETITOR_URLS} URLs. Focus is optional — without a tap, the first URL is
                primary.
              </p>
            </div>
          ) : null}

          {!showGenerating && currentStep === "destination" ? (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setIntendedPublishPlatform(undefined)}
                className={
                  !intendedPublishPlatform
                    ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-left text-sm"
                    : "flex w-full items-center justify-between rounded-xl border border-border px-4 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
                }
              >
                <span className="font-medium">Decide later</span>
                {!intendedPublishPlatform ? (
                  <span className="text-xs text-primary">Selected</span>
                ) : null}
              </button>
              {destinations.map((destination) => {
                const selected = intendedPublishPlatform === destination.id;
                return (
                  <button
                    key={destination.id}
                    type="button"
                    onClick={() => setIntendedPublishPlatform(destination.id)}
                    className={
                      selected
                        ? "flex w-full flex-col items-start rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-left text-sm"
                        : "flex w-full flex-col items-start rounded-xl border border-border px-4 py-2.5 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
                    }
                  >
                    <span className="flex w-full items-center justify-between gap-2 font-medium">
                      {destination.label}
                      {selected ? (
                        <span className="text-xs text-primary">Selected</span>
                      ) : null}
                    </span>
                    {destination.description ? (
                      <span className="mt-0.5 text-xs text-muted-foreground">
                        {destination.description}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {!showGenerating && currentStep === "review" ? (
            <div className="mt-4 space-y-4">
              {flow === "create" ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">
                    Planned date{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <input
                    type="date"
                    autoFocus
                    value={plannedDate}
                    onChange={(event) => setPlannedDate(event.target.value)}
                    className="h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </label>
              ) : null}

              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/30">
                <ReviewRow
                  label="Mode"
                  value={flow === "repurpose" ? "Repurpose" : "Create"}
                />
                <ReviewRow label="Format" value={formatTypeLabel(formatType)} />
                <ReviewRow label="Keyword" value={targetKeyword.trim() || "—"} />
                {flow === "repurpose" ? (
                  <ReviewRow
                    label="Source"
                    value={`${sourceContent.trim().length} characters`}
                  />
                ) : null}
                {flow === "create" && title.trim() ? (
                  <ReviewRow label="Title" value={title.trim()} />
                ) : null}
                {isLinkedIn && linkedinArchetype ? (
                  <ReviewRow
                    label="Archetype"
                    value={
                      LINKEDIN_ARCHETYPES.find((a) => a.id === linkedinArchetype)
                        ?.label ?? linkedinArchetype
                    }
                  />
                ) : null}
                {isLinkedIn && linkedinHook ? (
                  <ReviewRow
                    label="Hook"
                    value={
                      LINKEDIN_HOOK_TYPES.find((h) => h.id === linkedinHook)?.label ??
                      linkedinHook
                    }
                  />
                ) : null}
                {flow === "create" && angleHint.trim() ? (
                  <ReviewRow
                    label={isLinkedIn ? "Notes" : "Angle"}
                    value={angleHint.trim()}
                  />
                ) : null}
                {flow === "create" && focusCompetitorUrl ? (
                  <ReviewRow
                    label="Competitors"
                    value={
                      sessionCompetitorUrls.length > 1
                        ? `${focusCompetitorUrl} (primary) · ${sessionCompetitorUrls.length} total`
                        : focusCompetitorUrl
                    }
                  />
                ) : null}
                {flow === "create" ? (
                  <ReviewRow
                    label="Destination"
                    value={selectedDestinationLabel ?? "Decide later"}
                  />
                ) : null}
                {flow === "create" ? (
                  plannedDate.trim() ? (
                    <ReviewRow label="Planned date" value={plannedDate.trim()} />
                  ) : (
                    <ReviewRow label="Planned date" value="Not scheduled" />
                  )
                ) : null}
              </div>
            </div>
          ) : null}

          {error && !submitting ? (
            <p className="mt-3 text-sm text-red-700">{error}</p>
          ) : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          {showGenerating ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </button>
          ) : currentStep === "review" ? (
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={
                submitting ||
                !targetKeyword.trim() ||
                (flow === "repurpose" && sourceContent.trim().length < MIN_REPURPOSE_CHARS)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {flow === "repurpose"
                ? `Repurpose → ${formatTypeLabel(formatType)}`
                : `Generate ${formatTypeLabel(formatType)}`}
            </button>
          ) : currentStep === "path" ? (
            <button
              type="button"
              onClick={() => {
                setStepIndex(1);
              }}
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={
                submitting ||
                (currentStep === "keyword" && !targetKeyword.trim()) ||
                (currentStep === "source" &&
                  sourceContent.trim().length < MIN_REPURPOSE_CHARS)
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {currentStep === "competitors" ||
              currentStep === "destination" ||
              currentStep === "source"
                ? "Continue"
                : "Next"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
