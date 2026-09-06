import type { ReactNode } from "react";
import {
  ArrowLeft,
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
  RotateCcw,
  Save,
  Share2,
  Shuffle,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { cn } from "../cn";
import {
  contentStudioBackHref,
  formatHumanizationAuditLine,
  type ContentPieceDetail,
  type ContentPieceGeneratingState,
  type ContentPiecePublishingState,
} from "./types";

// ---------------------------------------------------------------------------
// Public prop type — re-exported via content-piece-ui → index
// ---------------------------------------------------------------------------

export type ContentPieceLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

// ---------------------------------------------------------------------------
// Internal style constants (not exported)
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  published: "bg-primary text-primary-foreground",
  draft: "bg-muted text-muted-foreground",
  generating: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const TOOLBAR_BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50";
const TOOLBAR_BTN_PRIMARY =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
const TOOLBAR_BTN_GHOST =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50";

// ---------------------------------------------------------------------------
// PieceLink
// ---------------------------------------------------------------------------

export function PieceLink({
  renderLink,
  ...props
}: ContentPieceLinkProps & {
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        STATUS_BADGE_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function ContentPieceHeader({
  piece,
  editing,
  titleDraft,
  formatLabel,
  wordCount,
  onTitleChange,
  renderLink,
  headerExtra,
}: {
  piece: ContentPieceDetail;
  editing: boolean;
  titleDraft: string;
  formatLabel: string;
  wordCount: number;
  onTitleChange: (value: string) => void;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  headerExtra?: ReactNode;
}) {
  const humanizationAudit = piece.pieceMetadata?.humanizationAudit;
  return (
    <div className="mb-2 flex items-start gap-3">
      <PieceLink
        renderLink={renderLink}
        href={contentStudioBackHref(piece.websiteProjectId)}
        className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <span className="sr-only">Content studio</span>
      </PieceLink>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            value={titleDraft}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full border-b border-border bg-transparent pb-2 text-2xl font-bold leading-tight tracking-tight focus:outline-hidden lg:text-3xl"
            aria-label="Content title"
          />
        ) : (
          <h1 className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
            {piece.title}
          </h1>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MetaBadge>{formatLabel}</MetaBadge>
          {piece.targetKeyword ? <MetaBadge>{piece.targetKeyword}</MetaBadge> : null}
          <span className="text-xs text-muted-foreground">
            {wordCount.toLocaleString()} words
          </span>
          <StatusBadge status={piece.status} />
          {piece.pieceMetadata?.humanized ? <MetaBadge>Humanized</MetaBadge> : null}
          {piece.pieceMetadata?.source === "refresh" ? (
            <MetaBadge>Refresh</MetaBadge>
          ) : null}
          {piece.plannedDate && !editing ? (
            <span className="text-xs text-muted-foreground">Planned {piece.plannedDate}</span>
          ) : null}
          {humanizationAudit ? (
            <span className="text-xs text-muted-foreground">
              {formatHumanizationAuditLine(humanizationAudit)}
            </span>
          ) : null}
          {headerExtra}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status banners
// ---------------------------------------------------------------------------

export function ContentPieceStatusBanners({
  actionMessage,
  generateError,
  generateMessage,
  piece,
  generating,
  generatingState,
  staleGenerating,
  onResetGeneration,
  publishingState,
}: {
  actionMessage: string | null;
  generateError: boolean;
  generateMessage: string | null;
  piece: ContentPieceDetail;
  generating: boolean;
  generatingState: ContentPieceGeneratingState | null;
  staleGenerating: boolean;
  onResetGeneration?: () => void | Promise<void>;
  publishingState: ContentPiecePublishingState | null;
}) {
  return (
    <>
      {actionMessage && !generateError ? (
        <p className="text-sm text-muted-foreground" role="status">
          {actionMessage}
        </p>
      ) : null}

      {generateError ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          {generateMessage}
        </div>
      ) : null}

      {piece.status === "generating" && (generating || generatingState) && !staleGenerating ? (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            {generatingState?.message ?? "Generating content…"}
          </div>
          {generatingState?.jobStatus ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Job status: {generatingState.jobStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      {staleGenerating ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          <p className="font-medium">Generation did not complete.</p>
          <p className="mt-1 text-sm">
            AI may not be configured. Add your API key in Integrations → AI, then try again.
          </p>
          {onResetGeneration ? (
            <button
              type="button"
              onClick={() => void onResetGeneration()}
              className="mt-3 inline-flex h-9 items-center rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-secondary"
            >
              Reset to draft
            </button>
          ) : null}
        </div>
      ) : null}

      {piece.pieceMetadata?.source === "refresh" ? (
        <div
          className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium">Refresh piece — Diagnose → Fix → Stay</p>
          <p className="mt-1 text-muted-foreground">
            {piece.pieceMetadata.intendedPublishPlatform === "wordpress"
              ? "Imported from a live page. Score it, Fix gaps / Humanize, then publish an update to WordPress (confirm the post target first)."
              : "Imported from a live page. Score it, Fix gaps / Humanize, then copy or export the markdown — in-place CMS update is WordPress-only for now."}
          </p>
          {piece.pieceMetadata.sourceUrl ? (
            <a
              href={piece.pieceMetadata.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-primary hover:underline break-all"
            >
              {piece.pieceMetadata.sourceUrl}
            </a>
          ) : null}
          {piece.pieceMetadata.extractTruncated ? (
            <p className="mt-2 text-amber-800 dark:text-amber-200">
              Body was truncated on import. Long sections may need a paste refresh.
            </p>
          ) : null}
        </div>
      ) : null}

      {publishingState ? (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            {publishingState.message}
          </div>
          {publishingState.jobStatus ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Job status: {publishingState.jobStatus}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

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
            className={TOOLBAR_BTN}
            title="Rewrite for natural human rhythm without full regeneration"
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

// ---------------------------------------------------------------------------
// Humanize snapshot bar
// ---------------------------------------------------------------------------

export function HumanizeSnapshotBar({
  view,
  onViewChange,
  onRevert,
  reverting,
  disabled,
}: {
  view: "after" | "before";
  onViewChange: (view: "after" | "before") => void;
  onRevert: () => void;
  reverting: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2">
      <div className="inline-flex rounded-lg border border-input bg-card p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => onViewChange("before")}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            view === "before"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Before humanize
        </button>
        <button
          type="button"
          onClick={() => onViewChange("after")}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            view === "after"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          After humanize
        </button>
      </div>
      <button
        type="button"
        onClick={onRevert}
        disabled={disabled}
        className={TOOLBAR_BTN}
        title="Restore the body from just before the last humanize pass"
      >
        {reverting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        )}
        {reverting ? "Reverting…" : "Revert to before"}
      </button>
    </div>
  );
}
