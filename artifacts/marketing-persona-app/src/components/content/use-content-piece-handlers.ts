"use client";

/**
 * @deprecated Content-piece actions now wire through ContentPieceView in
 * content-piece-client.tsx (shared copy helpers live in app-shell content-piece-actions).
 */
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toast } from "sonner";
import type { PublishDestinationId } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRecord } from "@/lib/server/loaders";

type HandlerState = {
  pieceId: string;
  piece: ContentPieceRecord;
  setPiece: React.Dispatch<React.SetStateAction<ContentPieceRecord>>;
  titleDraft: string;
  bodyDraft: string;
  statusDraft: string;
  plannedDateDraft: string;
  publishPlatform: PublishDestinationId;
  displayBody: string;
  setSaving: (v: boolean) => void;
  setEditing: (v: boolean) => void;
  setEditingPreview: (v: boolean) => void;
  setTitleDraft: (v: string) => void;
  setBodyDraft: (v: string) => void;
  setStatusDraft: (v: string) => void;
  setPlannedDateDraft: (v: string) => void;
  setRegenerating: (v: boolean) => void;
  setEnhancing: (v: boolean) => void;
  setHumanizing: (v: boolean) => void;
  setRegeneratingImages: (v: boolean) => void;
  setPreviewLoading: (v: boolean) => void;
  setPreviewHtml: (v: string | null) => void;
  setPreviewJson: (v: unknown) => void;
  setPreviewWarnings: (v: { code: string; message: string }[]) => void;
  setPreviewKind: (v: string | null) => void;
  setPublishing: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  setCopied: (v: boolean) => void;
  router: AppRouterInstance;
};

export function useContentPieceHandlers(state: HandlerState) {
  const {
    pieceId,
    piece,
    setPiece,
    titleDraft,
    bodyDraft,
    statusDraft,
    plannedDateDraft,
    publishPlatform,
    displayBody,
    setSaving,
    setEditing,
    setEditingPreview,
    setTitleDraft,
    setBodyDraft,
    setStatusDraft,
    setPlannedDateDraft,
    setRegenerating,
    setEnhancing,
    setHumanizing,
    setRegeneratingImages,
    setPreviewLoading,
    setPreviewHtml,
    setPreviewJson,
    setPreviewWarnings,
    setPreviewKind,
    setPublishing,
    setDeleting,
    setCopied,
    router,
  } = state;

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: titleDraft,
      bodyMarkdown: bodyDraft,
      plannedDate: plannedDateDraft || null,
    };
    if (piece.status !== "published") {
      payload.status = statusDraft;
    }
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setStatusDraft(updated.status);
    setPlannedDateDraft(updated.plannedDate ?? "");
    setEditing(false);
    setEditingPreview(false);
    toast.success("Saved");
  }

  function cancelEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown);
    setStatusDraft(piece.status);
    setPlannedDateDraft(piece.plannedDate ?? "");
    setEditing(false);
    setEditingPreview(false);
  }

  function startEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown);
    setStatusDraft(piece.status);
    setPlannedDateDraft(piece.plannedDate ?? "");
    setEditingPreview(false);
    setEditing(true);
  }

  async function handleRegenerate() {
    if (!confirm("Regenerate this content? The current draft will be replaced.")) return;
    setRegenerating(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/regenerate`, { method: "POST" });
    setRegenerating(false);
    if (!res.ok) {
      toast.error("Regeneration failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setBodyDraft(updated.bodyMarkdown);
    setTitleDraft(updated.title);
    setStatusDraft(updated.status);
    setPlannedDateDraft(updated.plannedDate ?? "");
    setEditing(false);
    setEditingPreview(false);
    toast.success("Regenerated");
  }

  async function handleEnhance() {
    setEnhancing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/enhance`, { method: "POST" });
    setEnhancing(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Enhancement failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setBodyDraft(updated.bodyMarkdown);
    setTitleDraft(updated.title);
    setEditing(false);
    setEditingPreview(false);
    toast.success("Quality enhanced — FAQ, citations, and links added");
  }

  async function handleHumanize() {
    setHumanizing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/humanize`, { method: "POST" });
    setHumanizing(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Humanization failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setBodyDraft(updated.bodyMarkdown);
    setEditing(false);
    setEditingPreview(false);
    const audit = updated.pieceMetadata?.humanizationAudit;
    if (audit?.rejected) {
      toast.message("Humanization skipped — structure preserved");
      return;
    }
    if (updated.humanized) {
      toast.success(
        audit
          ? `Humanized — AI tells ${audit.slopScoreBefore} → ${audit.slopScoreAfter}`
          : "Humanized",
      );
      return;
    }
    toast.message("No changes needed — draft already reads naturally");
  }

  async function regenerateImages() {
    setRegeneratingImages(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/images/regenerate`, { method: "POST" });
    setRegeneratingImages(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Failed to regenerate images");
      return;
    }
    const data = (await res.json()) as { piece: ContentPieceRecord };
    setPiece(data.piece);
    toast.success("Images updated from keyword search");
  }

  async function handlePublishPreview() {
    setPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewJson(null);
    setPreviewWarnings([]);
    setPreviewKind(null);
    const res = await fetch(`/api/content-pieces/${pieceId}/render-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: publishPlatform,
        outputMode: piece.pieceMetadata?.intendedOutputMode ?? piece.pieceMetadata?.intendedEditorMode,
      }),
    });
    setPreviewLoading(false);
    if (!res.ok) {
      toast.error("Failed to load publish preview");
      return;
    }
    const data = (await res.json()) as {
      payloadKind?: string;
      previewHtml?: string;
      previewJson?: unknown;
      warnings?: { code: string; message: string }[];
    };
    setPreviewKind(data.payloadKind ?? null);
    setPreviewHtml(data.previewHtml ?? null);
    setPreviewJson(data.previewJson ?? null);
    setPreviewWarnings(data.warnings ?? []);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: publishPlatform, async: true }),
    });
    setPublishing(false);
    if (!res.ok) {
      toast.error("Failed to publish");
      return;
    }
    const updated = await res.json();
    if (updated.queued) {
      toast.success(`Publishing to ${publishPlatform} — running in the background`);
      return;
    }
    setPiece((prev) => (prev ? { ...prev, status: "published", ...(updated.piece ?? updated) } : prev));
    toast.success(`Published to ${publishPlatform}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this content piece?")) return;
    setDeleting(true);
    const res = await fetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    router.push(`/projects/${piece.websiteProjectId}/content-studio`);
  }

  async function handleMarkReady() {
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    const updated = await res.json();
    setPiece(updated.piece ?? updated);
    toast.success("Marked as ready");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(displayBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return {
    handleSave,
    cancelEdit,
    startEdit,
    handleRegenerate,
    handleEnhance,
    handleHumanize,
    regenerateImages,
    handlePublishPreview,
    handlePublish,
    handleDelete,
    handleMarkReady,
    handleCopy,
  };
}

