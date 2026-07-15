import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, Loader2 } from "lucide-react";
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
  /** Optional competitor URL to differentiate against (SEO longform). */
  competitorFocusUrl?: string;
};

export type CreateContentInitialValues = Partial<CreateContentDraftInput>;

/** Compact create flow: format → keyword → [competitors?] → review. */
type CreateStepId = "format" | "keyword" | "competitors" | "review";

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));

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

function buildSteps(formatType: string): CreateStepId[] {
  const steps: CreateStepId[] = ["format", "keyword"];
  if (isSeoLongform(formatType)) steps.push("competitors");
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
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateContentDraftInput) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
  initialValues?: CreateContentInitialValues | null;
  /**
   * Accepted for StudioPage callers that pass CMS state; compact wizard has no
   * destination step — platform still flows through via initialValues / onSubmit.
   */
  cmsConnections?: unknown;
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
  const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");
  const [generatingLabelIndex, setGeneratingLabelIndex] = useState(0);

  const steps = useMemo(() => buildSteps(formatType), [formatType]);

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
      setCompetitorFocusUrl("");
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
    setCompetitorFocusUrl(initialValues?.competitorFocusUrl?.trim() ?? "");
    setGeneratingLabelIndex(0);
  }, [open, initialValues]);

  // Clamp step when format change shrinks the sequence (e.g. leave SEO longform).
  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

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

  function goBack() {
    if (submitting || stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }

  function goNext() {
    if (submitting) return;
    if (currentStep === "format") {
      setStepIndex(1);
      return;
    }
    if (currentStep === "keyword") {
      if (!targetKeyword.trim()) return;
      setStepIndex(2);
      return;
    }
    if (currentStep === "competitors") {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }
  }

  async function handleGenerate() {
    const keyword = targetKeyword.trim();
    if (!keyword || submitting) return;

    const resolvedAngle =
      formatType === "linkedin_post"
        ? buildLinkedInAngleHint(linkedinArchetype, linkedinHook, angleHint)
        : angleHint.trim() || undefined;

    await onSubmit({
      title: title.trim(),
      targetKeyword: keyword,
      formatType,
      angleHint: resolvedAngle,
      plannedDate: plannedDate.trim() || null,
      intendedPublishPlatform: intendedPublishPlatform || undefined,
      competitorFocusUrl:
        isSeoLongform(formatType) && competitorFocusUrl.trim()
          ? competitorFocusUrl.trim()
          : undefined,
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
          ? "Optional — paste a competitor URL to differentiate against for this piece."
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
                  Competitor focus URL{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <input
                  type="url"
                  autoFocus
                  value={competitorFocusUrl}
                  onChange={(event) => setCompetitorFocusUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      goNext();
                    }
                  }}
                  placeholder="https://competitor.example.com"
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Skip if you want generic differentiation from project competitors.
              </p>
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
                {competitorFocusUrl.trim() ? (
                  <ReviewRow label="Competitor" value={competitorFocusUrl.trim()} />
                ) : null}
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
              {currentStep === "competitors" ? "Continue" : "Next"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
