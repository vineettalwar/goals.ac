import { useEffect, useState } from "react";
import { STUDIO_FORMAT_OPTIONS } from "./types";

export type CreateContentDraftInput = {
  title: string;
  targetKeyword: string;
  formatType: string;
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

  useEffect(() => {
    if (!open) {
      setTitle("");
      setTargetKeyword("");
      setFormatType("blog_post");
      return;
    }

    const nextFormat =
      initialValues?.formatType && VALID_FORMATS.has(initialValues.formatType as never)
        ? initialValues.formatType
        : "blog_post";
    setTitle(initialValues?.title?.trim() ?? "");
    setTargetKeyword(initialValues?.targetKeyword?.trim() ?? "");
    setFormatType(nextFormat);
  }, [open, initialValues]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ title: title.trim(), targetKeyword: targetKeyword.trim(), formatType });
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
        className="paper-card relative z-10 w-full max-w-md p-6 shadow-lg"
      >
        <h2 id="create-content-title" className="text-lg font-semibold">
          Create content
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a draft piece. You can generate and edit the body after creation.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Title</span>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. How to improve SEO for SaaS"
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
            />
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
              disabled={submitting || !title.trim() || !targetKeyword.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
