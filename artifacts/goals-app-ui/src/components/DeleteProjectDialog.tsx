import { useState } from "react";
import type { ProjectListItem } from "@workspace/app-shell";
import { apiFetch } from "@/lib/api";

type DeleteProjectDialogProps = {
  project: ProjectListItem | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteProjectDialog({ project, onClose, onDeleted }: DeleteProjectDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!project) return null;

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/website-projects/${project!.id}`, { method: "DELETE" });
      onClose();
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={() => !deleting && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        className="paper-card relative z-10 w-full max-w-sm p-6 shadow-lg"
      >
        <h2 id="delete-project-title" className="text-lg font-semibold">
          Delete project?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This will permanently delete{" "}
          <span className="font-medium text-foreground">{project.name}</span> and all associated
          content, roadmaps, and settings. This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}
