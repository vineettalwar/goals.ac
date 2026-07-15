import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, Plus, Users } from "lucide-react";
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
};

export type CreateContentInitialValues = Partial<CreateContentDraftInput>;

/** Project-level competitor row for the create-wizard picker. */
export type CreateCompetitorOption = {
  url: string;
  name?: string;
  summary?: string;
  threatLevel?: "low" | "medium" | "high";
  contentGaps?: string[];
};

/** Compact create flow: format → keyword → [competitors?] → [destination?] → review. */
type CreateStepId = "format" | "keyword" | "competitors" | "destination" | "review";

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));
const MAX_COMPETITOR_URLS = 5;

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

/** Fake progress labels while the one-shot generate API runs. */
const GENERATING_LABELS = ["Analyzing", "Drafting", "Finishing"] as const;

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
  formatType: string,
  destinations: { id: PublishDestinationId }[],
): CreateStepId[] {
  const steps: CreateStepId[] = ["format", "keyword"];
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

export function CreateContentDialog({
  open,
  onClose,
  onSubmit,
  submitting = false,
  error = null,
  initialValues = null,
  cmsConnections = null,
  projectCompetitors = null,
  competitorsLoading = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateContentDraftInput) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
  initialValues?: CreateContentInitialValues | null;
  /** When present, optional destination step lists connected/export targets for the format. */
  cmsConnections?: CmsConnectionSnapshot | null;
  /** Project brand + analysis competitors for the optional picker step. */
  projectCompetitors?: CreateCompetitorOption[] | null;
  competitorsLoading?: boolean;
}) {
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
  const [generatingLabelIndex, setGeneratingLabelIndex] = useState(0);

  const contentFormat = asContentFormat(formatType);
  const destinations = useMemo(() => {
    if (!contentFormat) return [];
    return getConnectedDestinationsForFormat(contentFormat, cmsConnections ?? {});
  }, [contentFormat, cmsConnections]);

  const competitorMeta = useMemo(
    () => optionByHost(projectCompetitors ?? []),
    [projectCompetitors],
  );

  const steps = useMemo(
    () => buildSteps(formatType, destinations),
    [formatType, destinations],
  );

  useEffect(() => {
    if (!open) {
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
      setGeneratingLabelIndex(0);
      return;
    }

    const nextFormat =
      initialValues?.formatType && VALID_FORMATS.has(initialValues.formatType as never)
        ? initialValues.formatType
        : "blog_post";
    const initialAngle = initialValues?.angleHint?.trim() ?? "";
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
    setGeneratingLabelIndex(0);
  }, [open, initialValues]);

  // Merge project competitors once they arrive (async host fetch).
  useEffect(() => {
    if (!open || competitorsLoading) return;
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
  }, [open, competitorsLoading, projectCompetitors, initialValues]);

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

  // Timed progress labels during one-shot generate (cleared when submit ends).
  useEffect(() => {
    if (!submitting) {
      setGeneratingLabelIndex(0);
      return;
    }
    setGeneratingLabelIndex(0);
    const t1 = window.setTimeout(() => setGeneratingLabelIndex(1), 900);
    const t2 = window.setTimeout(() => setGeneratingLabelIndex(2), 2200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [submitting]);

  if (!open) return null;

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? "format";
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isLinkedIn = formatType === "linkedin_post";
  const showGenerating = submitting && currentStep === "review";
  const parsedCompetitorUrls = isSeoLongform(formatType)
    ? parseCompetitorUrlInput(competitorUrlsText)
    : [];
  const competitorFocusUrl = parsedCompetitorUrls[0];
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
    if (currentStep === "review") return;
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  async function handleGenerate() {
    const keyword = targetKeyword.trim();
    if (!keyword || submitting) return;

    const resolvedAngle =
      formatType === "linkedin_post"
        ? buildLinkedInAngleHint(linkedinArchetype, linkedinHook, angleHint)
        : angleHint.trim() || undefined;

    const competitorUrls = isSeoLongform(formatType)
      ? parseCompetitorUrlInput(competitorUrlsText)
      : [];

    await onSubmit({
      title: title.trim(),
      targetKeyword: keyword,
      formatType,
      angleHint: resolvedAngle,
      plannedDate: plannedDate.trim() || null,
      intendedPublishPlatform: intendedPublishPlatform || undefined,
      competitorFocusUrl: competitorUrls[0],
      competitorUrls: competitorUrls.length > 0 ? competitorUrls : undefined,
    });
  }

  const stepTitle = showGenerating
    ? `Writing your ${formatTypeLabel(formatType)}…`
    : currentStep === "format"
      ? "Choose a format"
      : currentStep === "keyword"
        ? isLinkedIn
          ? "Keyword & archetype"
          : "Keyword & angle"
        : currentStep === "competitors"
          ? "Competitor focus"
          : currentStep === "destination"
            ? "Where will this be published?"
            : "Schedule & review";

  const stepSubtitle = showGenerating
    ? `Target: ${targetKeyword.trim() || "—"}`
    : currentStep === "format"
      ? "Pick the content type — we tailor structure and length to match."
      : currentStep === "keyword"
        ? isLinkedIn
          ? "Target keyword is required. Archetype and hook chips are optional."
          : "Target keyword is required. Angle and title are optional."
        : currentStep === "competitors"
          ? "Optional — paste competitor URLs (comma or newline). First URL is the generate focus."
          : currentStep === "destination"
            ? "Optional — shapes generation and pre-selects your publish destination."
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
            </div>
          ) : null}

          {!showGenerating && currentStep === "competitors" ? (
            <div className="mt-4 space-y-3.5">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  Competitor URLs{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <textarea
                  autoFocus
                  rows={4}
                  value={competitorUrlsText}
                  onChange={(event) => setCompetitorUrlsText(event.target.value)}
                  placeholder={"https://competitor.example.com\nhttps://rival.example.com"}
                  className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_COMPETITOR_URLS} URLs. First is primary (competitorFocusUrl); all are
                sent as competitorUrls. Skip for project-level competitors only.
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

              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/30">
                <ReviewRow label="Format" value={formatTypeLabel(formatType)} />
                <ReviewRow label="Keyword" value={targetKeyword.trim() || "—"} />
                {title.trim() ? <ReviewRow label="Title" value={title.trim()} /> : null}
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
                {angleHint.trim() ? (
                  <ReviewRow
                    label={isLinkedIn ? "Notes" : "Angle"}
                    value={angleHint.trim()}
                  />
                ) : null}
                {competitorFocusUrl ? (
                  <ReviewRow
                    label="Competitors"
                    value={
                      parsedCompetitorUrls.length > 1
                        ? `${competitorFocusUrl} (primary) · ${parsedCompetitorUrls.length} total`
                        : competitorFocusUrl
                    }
                  />
                ) : null}
                <ReviewRow
                  label="Destination"
                  value={selectedDestinationLabel ?? "Decide later"}
                />
                {plannedDate.trim() ? (
                  <ReviewRow label="Planned date" value={plannedDate.trim()} />
                ) : (
                  <ReviewRow label="Planned date" value="Not scheduled" />
                )}
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
              disabled={submitting || !targetKeyword.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {`Generate ${formatTypeLabel(formatType)}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={
                submitting || (currentStep === "keyword" && !targetKeyword.trim())
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {currentStep === "competitors" || currentStep === "destination"
                ? "Continue"
                : "Next"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
