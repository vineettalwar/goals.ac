import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import {
  getConnectedDestinationsForFormat,
  type CmsConnectionSnapshot,
  type ContentFormatType,
  type PublishDestinationId,
} from "../content-piece/publish-destinations";
import { STUDIO_FORMAT_OPTIONS, formatTypeLabel } from "./types";

export type CreateContentDraftInput = {
  title: string;
  targetKeyword: string;
  formatType: string;
  angleHint?: string;
  plannedDate?: string | null;
  /** Optional pre-selected publish destination (shapes generation when supported). */
  intendedPublishPlatform?: string;
};

export type CreateContentInitialValues = Partial<CreateContentDraftInput>;

type CreateStepId = "format" | "details" | "destination" | "review";

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));

const CONTENT_FORMAT_SET = new Set<string>([
  "blog_post",
  "news_article",
  "tutorial",
  "guide",
  "whitepaper",
  "pillar_page",
  "location_page",
  "infographic_outline",
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "email_sequence",
  "ad_copy",
  "landing_page_copy",
  "product_description",
  "press_release",
  "faq_article",
]);

function asContentFormat(formatType: string): ContentFormatType | null {
  return CONTENT_FORMAT_SET.has(formatType) ? (formatType as ContentFormatType) : null;
}

function buildSteps(
  formatType: string,
  cmsConnections: CmsConnectionSnapshot,
): CreateStepId[] {
  const steps: CreateStepId[] = ["format", "details"];
  const format = asContentFormat(formatType);
  if (format) {
    const destinations = getConnectedDestinationsForFormat(format, cmsConnections);
    if (destinations.length > 0) steps.push("destination");
  }
  steps.push("review");
  return steps;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
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
  cmsConnections = {},
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateContentDraftInput) => void | Promise<void>;
  submitting?: boolean;
  error?: string | null;
  initialValues?: CreateContentInitialValues | null;
  /** Connected CMS/social snapshot — destination step lists connected + export options. */
  cmsConnections?: CmsConnectionSnapshot;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [formatType, setFormatType] = useState("blog_post");
  const [angleHint, setAngleHint] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [intendedDestination, setIntendedDestination] = useState<PublishDestinationId | "">("");

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setTitle("");
      setTargetKeyword("");
      setFormatType("blog_post");
      setAngleHint("");
      setPlannedDate("");
      setIntendedDestination("");
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
    const platform = initialValues?.intendedPublishPlatform?.trim();
    setIntendedDestination(platform ? (platform as PublishDestinationId) : "");
  }, [open, initialValues]);

  const steps = useMemo(
    () => buildSteps(formatType, cmsConnections),
    [formatType, cmsConnections],
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? "format";
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const contentFormat = asContentFormat(formatType);
  const destinations = contentFormat
    ? getConnectedDestinationsForFormat(contentFormat, cmsConnections)
    : [];
  const destinationLabel =
    intendedDestination &&
    destinations.find((d) => d.id === intendedDestination)?.label;

  // If format change drops destination from sequence, clamp index and clear selection.
  useEffect(() => {
    if (!open) return;
    if (stepIndex >= steps.length) setStepIndex(steps.length - 1);
    if (!steps.includes("destination") && intendedDestination) {
      setIntendedDestination("");
    }
  }, [open, steps, stepIndex, intendedDestination]);

  if (!open) return null;

  function goBack() {
    if (submitting || stepIndex <= 0) return;
    setStepIndex((i) => i - 1);
  }

  function goNext() {
    if (submitting) return;
    if (currentStep === "format") {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      return;
    }
    if (currentStep === "details") {
      if (!targetKeyword.trim()) return;
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      return;
    }
    if (currentStep === "destination") {
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
      intendedPublishPlatform: intendedDestination || undefined,
    });
  }

  const stepTitle =
    currentStep === "format"
      ? "Choose a format"
      : currentStep === "details"
        ? "Keyword & angle"
        : currentStep === "destination"
          ? "Where will this be published?"
          : "Ready to generate?";

  const stepSubtitle =
    currentStep === "format"
      ? "Pick the content type — we tailor structure and length to match."
      : currentStep === "details"
        ? "Target keyword is required. Angle and title are optional."
        : currentStep === "destination"
          ? "Optional — shapes generation and pre-selects publish destination."
          : "Review your choices, then we'll write the draft.";

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
        className="paper-card relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden shadow-lg"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <h2 id="create-content-title" className="text-lg font-semibold">
            {stepTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{stepSubtitle}</p>

          {currentStep === "format" ? (
            <div className="mt-5 max-h-[min(50vh,360px)] space-y-2 overflow-y-auto pr-1">
              {STUDIO_FORMAT_OPTIONS.map((option) => {
                const selected = formatType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormatType(option.value);
                      if (intendedDestination) setIntendedDestination("");
                    }}
                    className={
                      selected
                        ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left text-sm"
                        : "flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
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

          {currentStep === "details" ? (
            <div className="mt-5 space-y-4">
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

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  Angle / hint{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <textarea
                  rows={3}
                  value={angleHint}
                  onChange={(event) => setAngleHint(event.target.value)}
                  placeholder="Tone, audience, or angle for the AI…"
                  className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">
                  Planned date{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </span>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(event) => setPlannedDate(event.target.value)}
                  className="h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm"
                />
              </label>
            </div>
          ) : null}

          {currentStep === "destination" ? (
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => setIntendedDestination("")}
                className={
                  !intendedDestination
                    ? "flex w-full items-center justify-between rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left text-sm"
                    : "flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
                }
              >
                <span className="font-medium">Decide later</span>
                {!intendedDestination ? (
                  <span className="text-xs text-primary">Selected</span>
                ) : null}
              </button>
              {destinations.map((dest) => {
                const selected = intendedDestination === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setIntendedDestination(dest.id)}
                    className={
                      selected
                        ? "flex w-full flex-col items-start gap-0.5 rounded-xl border border-primary bg-primary/5 px-4 py-3 text-left text-sm"
                        : "flex w-full flex-col items-start gap-0.5 rounded-xl border border-border px-4 py-3 text-left text-sm hover:border-primary/60 hover:bg-secondary/40"
                    }
                  >
                    <span className="font-medium">{dest.label}</span>
                    <span className="text-xs text-muted-foreground">{dest.description}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {currentStep === "review" ? (
            <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/30">
              <ReviewRow label="Format" value={formatTypeLabel(formatType)} />
              <ReviewRow label="Keyword" value={targetKeyword.trim() || "—"} />
              {title.trim() ? <ReviewRow label="Title" value={title.trim()} /> : null}
              {destinationLabel ? (
                <ReviewRow label="Destination" value={destinationLabel} />
              ) : (
                <ReviewRow label="Destination" value="Decide later" />
              )}
              {angleHint.trim() ? (
                <ReviewRow label="Angle" value={angleHint.trim()} />
              ) : null}
              {plannedDate.trim() ? (
                <ReviewRow label="Planned date" value={plannedDate.trim()} />
              ) : null}
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
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
                submitting ||
                (currentStep === "details" && !targetKeyword.trim())
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Continue
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
