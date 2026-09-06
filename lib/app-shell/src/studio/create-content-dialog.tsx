// Re-export public types so studio/index.ts import path is unchanged.
export type {
  BriefDraftSource,
  CreateCompetitorOption,
  CreateContentDraftInput,
  CreateContentInitialValues,
  CreateGeneratingPhase,
  CreateSourcePieceOption,
  RepurposeContentInput,
} from "./create-content-types";
export { briefToCreateContentInitialValues } from "./create-content-types";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
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
  parseLinkedInArchetypeFromAngleHint,
  parseLinkedInHookFromAngleHint,
  stripLinkedInAngleMeta,
  type LinkedInArchetypeId,
  type LinkedInHookId,
} from "./linkedin-archetypes";
import { formatTypeLabel, studioFormatOptionsForSurface } from "./types";
import {
  asContentFormat,
  buildSteps,
  competitorUrlsFromInitial,
  isSeoLongform,
  optionByHost,
  phaseToLabelIndex,
  VALID_FORMATS,
  MIN_REPURPOSE_CHARS,
  type CreateContentDraftInput,
  type CreateContentInitialValues,
  type CreateCompetitorOption,
  type CreateFlow,
  type CreateGeneratingPhase,
  type CreateSourcePieceOption,
  type RepurposeContentInput,
} from "./create-content-types";
import { CompetitorsStep } from "./create-content-competitors-step";
import { ReviewStep } from "./create-content-review";
import {
  DestinationStep,
  FormatStep,
  GeneratingView,
  KeywordStep,
  PathStep,
  SourceStep,
} from "./create-content-steps";

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
  surface = "blog_wordpress",
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
  /** Which format set to offer. Defaults to the blog surface. */
  surface?: "blog_wordpress" | "full";
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

  const formatOptions = useMemo(() => studioFormatOptionsForSurface(surface), [surface]);
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
      nextFormat === "linkedin_post" ? stripLinkedInAngleMeta(initialAngle) : initialAngle,
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
      const merged = normalizeCompetitorUrlList([
        ...competitorUrlsFromInitial(initialValues),
        ...fromProject,
      ]);
      return merged.some((url) => hostFromUrl(url) === hostFromUrl(normalized)) ? normalized : "";
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
  const focusCompetitorUrl = competitorFocusUrl || sessionCompetitorUrls[0] || "";
  const selectedDestinationLabel = intendedPublishPlatform
    ? (destinations.find((d) => d.id === intendedPublishPlatform)?.label ?? intendedPublishPlatform)
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

  function handleFormatSelect(value: string) {
    setFormatType(value);
    if (value !== "linkedin_post") {
      setLinkedinArchetype("");
      setLinkedinHook("");
    }
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
            style={{ transform: `scaleX(${showGenerating ? 1 : progress / 100})` }}
          />
        </div>

        <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <div className="min-w-18 items-center flex">
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
            {showGenerating ? "Generating" : `Step ${stepIndex + 1} of ${steps.length}`}
          </p>
          <div className="min-w-18" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <h2 id="create-content-title" className="text-lg font-semibold">
            {stepTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{stepSubtitle}</p>

          {showGenerating ? (
            <GeneratingView
              generatingLabelIndex={generatingLabelIndex}
              generatingHeadings={generatingHeadings}
            />
          ) : null}

          {!showGenerating && currentStep === "path" ? (
            <PathStep
              flow={flow}
              onSelectCreate={() => { setFlow("create"); setStepIndex(1); }}
              onSelectRepurpose={() => {
                setFlow("repurpose");
                setFormatType("linkedin_post");
                setStepIndex(1);
              }}
            />
          ) : null}

          {!showGenerating && currentStep === "format" ? (
            <FormatStep
              formatType={formatType}
              formatOptions={formatOptions}
              onSelect={handleFormatSelect}
            />
          ) : null}

          {!showGenerating && currentStep === "keyword" ? (
            <KeywordStep
              flow={flow}
              isLinkedIn={isLinkedIn}
              targetKeyword={targetKeyword}
              onChangeKeyword={setTargetKeyword}
              onEnterNext={goNext}
              angleHint={angleHint}
              onChangeAngleHint={setAngleHint}
              title={title}
              onChangeTitle={setTitle}
              linkedinArchetype={linkedinArchetype}
              onChangeArchetype={setLinkedinArchetype}
              linkedinHook={linkedinHook}
              onChangeHook={setLinkedinHook}
            />
          ) : null}

          {!showGenerating && currentStep === "source" ? (
            <SourceStep
              existingPieces={existingPieces}
              sourcePieceId={sourcePieceId}
              onSelectPiece={(id) => void selectSourcePiece(id)}
              loadingSourcePiece={loadingSourcePiece}
              sourceContent={sourceContent}
              onChangeSourceContent={setSourceContent}
            />
          ) : null}

          {!showGenerating && currentStep === "competitors" ? (
            <CompetitorsStep
              competitorsLoading={competitorsLoading}
              sessionCompetitorUrls={sessionCompetitorUrls}
              focusCompetitorUrl={focusCompetitorUrl}
              competitorMeta={competitorMeta}
              onToggleFocus={(url) =>
                setCompetitorFocusUrl(
                  hostFromUrl(focusCompetitorUrl ?? "") === hostFromUrl(url) ? "" : url,
                )
              }
              newCompetitorUrl={newCompetitorUrl}
              onChangeNewUrl={setNewCompetitorUrl}
              onAddCompetitor={addQuickCompetitor}
            />
          ) : null}

          {!showGenerating && currentStep === "destination" ? (
            <DestinationStep
              destinations={destinations}
              intendedPublishPlatform={intendedPublishPlatform}
              onSelect={setIntendedPublishPlatform}
            />
          ) : null}

          {!showGenerating && currentStep === "review" ? (
            <ReviewStep
              flow={flow}
              formatType={formatType}
              targetKeyword={targetKeyword}
              title={title}
              isLinkedIn={isLinkedIn}
              linkedinArchetype={linkedinArchetype}
              linkedinHook={linkedinHook}
              angleHint={angleHint}
              sourceContent={sourceContent}
              sessionCompetitorUrls={sessionCompetitorUrls}
              focusCompetitorUrl={focusCompetitorUrl}
              selectedDestinationLabel={selectedDestinationLabel}
              plannedDate={plannedDate}
              onChangePlannedDate={setPlannedDate}
            />
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
              onClick={() => setStepIndex(1)}
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
                (currentStep === "source" && sourceContent.trim().length < MIN_REPURPOSE_CHARS)
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
