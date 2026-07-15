import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
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
  const [plannedDate, setPlannedDate] = useState("");
  const [intendedPublishPlatform, setIntendedPublishPlatform] = useState<string | undefined>();
  const [competitorFocusUrl, setCompetitorFocusUrl] = useState("");

  const steps = useMemo(() => buildSteps(formatType), [formatType]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setTitle("");
      setTargetKeyword("");
      setFormatType("blog_post");
      setAngleHint("");
      setPlannedDate("");
      setIntendedPublishPlatform(undefined);
      setCompetitorFocusUrl("");
      return;
    }

    const nextFormat =
      initialValues?.formatType && VALID_FORMATS.has(initialValues.formatType as never)
        ? initialValues.formatType
        : "blog_post";
    setStepIndex(0);
    setTitle(initialValues?.title?.trim() ?? "");
    setTargetKeyword(initialValues?.targetKeyword?.trim() ?? "");
    setFormatType(nextFormat);
    setAngleHint(initialValues?.angleHint?.trim() ?? "");
    setPlannedDate(initialValues?.plannedDate?.trim() || "");
    setIntendedPublishPlatform(initialValues?.intendedPublishPlatform?.trim() || undefined);
    setCompetitorFocusUrl(initialValues?.competitorFocusUrl?.trim() ?? "");
  }, [open, initialValues]);

  // Clamp step when format change shrinks the sequence (e.g. leave SEO longform).
  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

  if (!open) return null;

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? "format";
  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isLinkedIn = formatType === "linkedin_post";

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

    await onSubmit({
      title: title.trim(),
      targetKeyword: keyword,
      formatType,
      angleHint: angleHint.trim() || undefined,
      plannedDate: plannedDate.trim() || null,
      intendedPublishPlatform: intendedPublishPlatform || undefined,
      competitorFocusUrl:
        isSeoLongform(formatType) && competitorFocusUrl.trim()
          ? competitorFocusUrl.trim()
          : undefined,
    });
  }

  const stepTitle =
    currentStep === "format"
      ? "Choose a format"
      : currentStep === "keyword"
        ? isLinkedIn
          ? "Keyword & hook"
          : "Keyword & angle"
        : currentStep === "competitors"
          ? "Competitor focus"
          : "Schedule & review";

  const stepSubtitle =
    currentStep === "format"
      ? "Pick the content type — we tailor structure and length to match."
      : currentStep === "keyword"
        ? isLinkedIn
          ? "Target keyword is required. Hook or archetype is optional."
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
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
          <div className="flex min-w-[72px] items-center">
            {stepIndex > 0 ? (
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
            Step {stepIndex + 1} of {steps.length}
          </p>
          <div className="min-w-[72px]" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <h2 id="create-content-title" className="text-lg font-semibold">
            {stepTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{stepSubtitle}</p>

          {currentStep === "format" ? (
            <div className="mt-4 max-h-[min(42vh,300px)] space-y-2 overflow-y-auto pr-1">
              {STUDIO_FORMAT_OPTIONS.map((option) => {
                const selected = formatType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormatType(option.value)}
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

          {currentStep === "keyword" ? (
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

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  {isLinkedIn ? "Hook / archetype" : "Angle / hint"}{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <textarea
                  rows={2}
                  value={angleHint}
                  onChange={(event) => setAngleHint(event.target.value)}
                  placeholder={
                    isLinkedIn
                      ? "e.g. hot take · bold question opener · founder story…"
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

          {currentStep === "competitors" ? (
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

          {currentStep === "review" ? (
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
                {angleHint.trim() ? (
                  <ReviewRow
                    label={isLinkedIn ? "Hook" : "Angle"}
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

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
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
          {currentStep === "review" ? (
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={submitting || !targetKeyword.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {submitting ? "Generating…" : `Generate ${formatTypeLabel(formatType)}`}
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
