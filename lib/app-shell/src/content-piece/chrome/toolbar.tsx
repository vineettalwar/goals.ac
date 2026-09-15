import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileCode2,
  ImageIcon,
  Loader2,
  Pencil,
  PenLine,
  RefreshCw,
  Save,
  Share2,
  Shuffle,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { TOOLBAR_BTN, TOOLBAR_BTN_GHOST, TOOLBAR_BTN_PRIMARY } from "./badges";

export function ContentPieceToolbar({
  pieceTitle,
  editing,
  previewMode,
  copied,
  busy,
  titleDraft,
  saving,
  regenerating,
  enhancing,
  humanizing,
  generating,
  deleting,
  markingReady,
  body,
  onTogglePreview,
  onSave,
  onCancel,
  onStartEdit,
  onRepurpose,
  onQueueSocial,
  queueingSocial = false,
  onCopy,
  onRegenerate,
  onEnhance,
  onHumanize,
  humanizePrimary = false,
  onMarkReady,
  onGenerate,
  onDelete,
  onInsertInlineImage,
}: {
  pieceTitle: string;
  editing: boolean;
  previewMode: boolean;
  copied: boolean;
  busy: boolean;
  titleDraft: string;
  saving: boolean;
  regenerating: boolean;
  enhancing: boolean;
  humanizing: boolean;
  generating: boolean;
  deleting: boolean;
  markingReady: boolean;
  body: string;
  onTogglePreview?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onStartEdit?: () => void;
  onRepurpose?: () => void;
  onQueueSocial?: () => void;
  queueingSocial?: boolean;
  onCopy: () => void;
  onRegenerate?: () => void | Promise<void>;
  onEnhance?: (missingTerms?: string[]) => void | Promise<void>;
  onHumanize?: () => void;
  humanizePrimary?: boolean;
  onMarkReady?: () => void | Promise<void>;
  onGenerate?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onInsertInlineImage?: () => void;
}) {
  const canEdit = Boolean(onStartEdit && onSave && onCancel && onTogglePreview);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {canEdit ? (
          editing ? (
            <>
              <button type="button" className={TOOLBAR_BTN} onClick={onTogglePreview}>
                <Eye className="h-3.5 w-3.5" aria-hidden />
                {previewMode ? "Edit" : "Preview"}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={busy || !titleDraft.trim()}
                className={TOOLBAR_BTN_PRIMARY}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-3.5 w-3.5" aria-hidden />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={onCancel} disabled={busy} className={TOOLBAR_BTN}>
                <X className="h-3.5 w-3.5" aria-hidden />
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={onStartEdit} disabled={busy} className={TOOLBAR_BTN}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </button>
          )
        ) : null}
        {onInsertInlineImage ? (
          <button
            type="button"
            onClick={onInsertInlineImage}
            disabled={busy}
            className={TOOLBAR_BTN}
            title="Insert stock image into body"
          >
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
            Insert image
          </button>
        ) : null}
        {onRepurpose ? (
          <button
            type="button"
            onClick={onRepurpose}
            disabled={busy || editing}
            className={TOOLBAR_BTN}
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden />
            Repurpose
          </button>
        ) : null}
        {onQueueSocial ? (
          <button
            type="button"
            onClick={onQueueSocial}
            disabled={busy || editing}
            className={TOOLBAR_BTN}
            title="Create LinkedIn and X variants and open Social Hub"
          >
            {queueingSocial ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {queueingSocial ? "Queuing…" : "Queue social"}
          </button>
        ) : null}
        {body ? (
          <button type="button" disabled={busy} className={TOOLBAR_BTN} onClick={onCopy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
        {onRegenerate ? (
          <button
            type="button"
            onClick={() => void onRegenerate()}
            disabled={busy || editing || enhancing}
            className={TOOLBAR_BTN}
          >
            {regenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
        ) : null}
        {onEnhance ? (
          <button
            type="button"
            onClick={() => void onEnhance()}
            disabled={busy || editing || regenerating || humanizing}
            className={TOOLBAR_BTN}
            title="Add FAQ, citations, and internal links without rewriting from scratch"
          >
            {enhancing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            )}
            {enhancing ? "Enhancing…" : "Enhance quality"}
          </button>
        ) : null}
        {onHumanize ? (
          <button
            type="button"
            onClick={onHumanize}
            disabled={busy || editing || regenerating || enhancing}
            className={humanizePrimary ? TOOLBAR_BTN_PRIMARY : TOOLBAR_BTN}
            title="Rewrite to strip AI tells — Enhance quality does not do this"
          >
            {humanizing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <PenLine className="h-3.5 w-3.5" aria-hidden />
            )}
            {humanizing ? "Humanizing…" : "Humanize"}
          </button>
        ) : null}
        {onMarkReady ? (
          <button
            type="button"
            onClick={() => void onMarkReady()}
            disabled={busy || editing}
            className={TOOLBAR_BTN}
          >
            {markingReady ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            )}
            Mark ready
          </button>
        ) : null}
        {onGenerate ? (
          <button
            type="button"
            onClick={() => void onGenerate()}
            disabled={busy || editing}
            className={TOOLBAR_BTN}
            title="Generate draft from the brief and keyword"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            {generating ? "Generating…" : "Generate"}
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            disabled={busy || editing}
            className={TOOLBAR_BTN_GHOST}
            onClick={() => {
              if (window.confirm(`Delete "${pieceTitle}"? This cannot be undone.`)) {
                void onDelete();
              }
            }}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            )}
            Delete
          </button>
        ) : null}
      </div>
      {editing ? (
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
          <FileCode2 className="h-3.5 w-3.5" aria-hidden />
          Markdown + live preview
        </span>
      ) : null}
    </div>
  );
}
