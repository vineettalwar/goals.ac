import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type NewProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: { id: number }) => void;
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function NewProjectButton({
  onCreated,
}: {
  onCreated: (project: { id: number }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" aria-hidden />
        New project
      </button>
      <NewProjectDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
    </>
  );
}

function NewProjectDialog({ open, onOpenChange, onCreated }: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function resetForm() {
    setName("");
    setUrl("");
    setNameError(null);
    setUrlError(null);
    setSubmitError(null);
  }

  function close() {
    if (loading) return;
    resetForm();
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    let valid = true;

    if (!trimmedName) {
      setNameError("Project name is required");
      valid = false;
    } else {
      setNameError(null);
    }

    if (!trimmedUrl) {
      setUrlError("Website URL is required");
      valid = false;
    } else if (!isValidUrl(trimmedUrl)) {
      setUrlError("Enter a valid URL");
      valid = false;
    } else {
      setUrlError(null);
    }

    if (!valid) return;

    setLoading(true);
    setSubmitError(null);
    try {
      const project = await apiFetch<{ id: number }>("/api/website-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, url: trimmedUrl }),
      });
      if (!project?.id) {
        setSubmitError("Failed to create project");
        return;
      }
      resetForm();
      onOpenChange(false);
      onCreated(project);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="paper-card relative z-10 w-full max-w-md p-6 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="new-project-title" className="text-lg font-semibold">
            New project
          </h2>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
            onClick={close}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-project-name" className="text-sm font-medium">
              Project name
            </label>
            <input
              id="new-project-name"
              autoComplete="organization"
              placeholder="My Company Blog"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            {nameError ? <p className="text-xs text-red-700">{nameError}</p> : null}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-project-url" className="text-sm font-medium">
              Website URL
            </label>
            <input
              id="new-project-url"
              type="url"
              autoComplete="url"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            {urlError ? <p className="text-xs text-red-700">{urlError}</p> : null}
            <p className="text-xs text-muted-foreground">
              We&apos;ll analyze this URL to extract your brand profile automatically.
            </p>
          </div>
          {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={close}
              disabled={loading}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
