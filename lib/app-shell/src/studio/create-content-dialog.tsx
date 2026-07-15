import { useEffect, useState } from "react";
import { STUDIO_FORMAT_OPTIONS } from "./types";

export type CreateContentDraftInput = {
  title: string;
  targetKeyword: string;
  formatType: string;
  angleHint?: string;
  plannedDate?: string | null;
};

export type CreateContentInitialValues = Partial<CreateContentDraftInput>;

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));

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
}) {
  const [title, setTitle] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [formatType, setFormatType] = useState("blog_post");
  const [angleHint, setAngleHint] = useState("");
  const [plannedDate, setPlannedDate] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setTargetKeyword("");
      setFormatType("blog_post");
      setAngleHint("");
      setPlannedDate("");
      return;
    }

    const nextFormat =
      initialValues?.formatType && VALID_FORMATS.has(initialValues.formatType as never)
        ? initialValues.formatType
        : "blog_post";
    setTitle(initialValues?.title?.trim() ?? "");
    setTargetKeyword(initialValues?.targetKeyword?.trim() ?? "");
    setFormatType(nextFormat);
    setAngleHint(initialValues?.angleHint?.trim() ?? "");
    setPlannedDate(initialValues?.plannedDate?.trim() || "");
  }, [open, initialValues]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const keyword = targetKeyword.trim();
    if (!keyword) return;

    await onSubmit({
      title: title.trim(),
      targetKeyword: keyword,
      formatType,
      angleHint: angleHint.trim() || undefined,
      plannedDate: plannedDate.trim() || null,
    });
  }

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
        className="paper-card relative z-10 w-full max-w-lg p-6 shadow-lg"
      >
        <h2 id="create-content-title" className="text-lg font-semibold">
          Create content
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a format and keyword — we generate the draft, then open the editor.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              Title <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. How to improve SEO for SaaS"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Format</span>
            <select
              value={formatType}
              onChange={(event) => setFormatType(event.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
            >
              {STUDIO_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Target keyword</span>
            <input
              type="text"
              required
              value={targetKeyword}
              onChange={(event) => setTargetKeyword(event.target.value)}
              placeholder="e.g. saas seo strategy"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              Angle / hint <span className="font-normal text-muted-foreground">(optional)</span>
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
              Planned date <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input
              type="date"
              value={plannedDate}
              onChange={(event) => setPlannedDate(event.target.value)}
              className="h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm"
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !targetKeyword.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Generating…" : "Generate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
