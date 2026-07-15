import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileCode2,
  Loader2,
  Pencil,
  PenLine,
  RefreshCw,
  Save,
  Share2,
  Shuffle,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { cn } from "../cn";
import { ContentBriefPanel, type ContentBriefSummary } from "./content-brief-panel";
import { ContentPieceFeaturedImage } from "./content-featured-image";
import { ArticleQualityPanel, type DualContentScore } from "./content-quality-panel";
import { ContentMarkdown } from "./content-markdown";
import { MarkdownToolbar } from "./markdown-toolbar";
import {
  contentPieceCanDelete,
  contentPieceCanEdit,
  contentPieceCanEnhance,
  contentPieceCanGenerate,
  contentPieceCanHumanize,
  contentPieceCanMarkReady,
  contentPieceCanPublish,
  contentPieceCanQueueSocial,
  contentPieceSupportsStockImages,
  contentStudioBackHref,
  formatContentFormatType,
  formatHumanizationAuditLine,
  type ContentPieceDetail,
  type ContentPieceGeneratingState,
  type ContentPiecePublishingState,
} from "./types";

export type ContentPieceLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type ContentPieceSavePayload = {
  title: string;
  bodyMarkdown: string;
  status?: "draft" | "ready";
  plannedDate?: string | null;
};

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

function pieceDraftKey(piece: ContentPieceDetail): string {
  return `${piece.id}:${piece.title}:${piece.bodyMarkdown ?? ""}:${piece.status}:${piece.plannedDate ?? ""}`;
}

/** Edit-time status options only — never published (published pieces are not editable). */
function editableStatusDraft(status: string): "draft" | "ready" {
  return status === "ready" ? "ready" : "draft";
}

type EditorState = {
  editing: boolean;
  previewMode: boolean;
  copied: boolean;
  titleDraft: string;
  bodyDraft: string;
  statusDraft: "draft" | "ready";
  plannedDateDraft: string;
  draftKey: string;
};

type EditorAction =
  | { type: "sync"; piece: ContentPieceDetail }
  | { type: "start_edit" }
  | { type: "toggle_preview" }
  | { type: "set_title"; value: string }
  | { type: "set_body"; value: string }
  | { type: "set_status"; value: "draft" | "ready" }
  | { type: "set_planned_date"; value: string }
  | { type: "cancel"; piece: ContentPieceDetail }
  | { type: "saved"; piece: ContentPieceDetail }
  | { type: "copied" }
  | { type: "clear_copied" };

function createEditorState(piece: ContentPieceDetail): EditorState {
  return {
    editing: false,
    previewMode: false,
    copied: false,
    titleDraft: piece.title,
    bodyDraft: piece.bodyMarkdown ?? "",
    statusDraft: editableStatusDraft(piece.status),
    plannedDateDraft: piece.plannedDate ?? "",
    draftKey: pieceDraftKey(piece),
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "sync": {
      const nextKey = pieceDraftKey(action.piece);
      if (state.editing || state.draftKey === nextKey) return state;
      return {
        ...state,
        titleDraft: action.piece.title,
        bodyDraft: action.piece.bodyMarkdown ?? "",
        statusDraft: editableStatusDraft(action.piece.status),
        plannedDateDraft: action.piece.plannedDate ?? "",
        draftKey: nextKey,
      };
    }
    case "start_edit":
      return { ...state, editing: true, previewMode: false };
    case "toggle_preview":
      return { ...state, previewMode: !state.previewMode };
    case "set_title":
      return { ...state, titleDraft: action.value };
    case "set_body":
      return { ...state, bodyDraft: action.value };
    case "set_status":
      return { ...state, statusDraft: action.value };
    case "set_planned_date":
      return { ...state, plannedDateDraft: action.value };
    case "cancel":
      return createEditorState(action.piece);
    case "saved":
      return {
        ...state,
        editing: false,
        previewMode: false,
        draftKey: pieceDraftKey({
          ...action.piece,
          title: state.titleDraft.trim() || action.piece.title,
          bodyMarkdown: state.bodyDraft,
          status: state.statusDraft,
          plannedDate: state.plannedDateDraft.trim() || null,
        }),
      };
    case "copied":
      return { ...state, copied: true };
    case "clear_copied":
      return { ...state, copied: false };
    default:
      return state;
  }
}

function PieceLink({
  renderLink,
  ...props
}: ContentPieceLinkProps & {
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

function StatusBadge({ status }: { status: string }) {
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

function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {children}
    </span>
  );
}

function ContentPieceHeader({
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

function ContentPieceStatusBanners({
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

function ContentPieceToolbar({
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
  onEnhance?: () => void | Promise<void>;
  onHumanize?: () => void;
  onMarkReady?: () => void | Promise<void>;
  onGenerate?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
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

function ContentPieceBodyEditor({
  editing,
  previewMode,
  canEdit,
  bodyDraft,
  displayBody,
  body,
  onBodyChange,
}: {
  editing: boolean;
  previewMode: boolean;
  canEdit: boolean;
  bodyDraft: string;
  displayBody: string;
  body: string;
  onBodyChange: (value: string) => void;
}) {
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  if (canEdit && editing) {
    return (
      <div className="min-h-[420px]">
        {!previewMode ? (
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Markdown source</p>
              <MarkdownToolbar
                textareaRef={bodyTextareaRef}
                value={bodyDraft}
                onChange={onBodyChange}
              />
            </div>
            <textarea
              ref={bodyTextareaRef}
              value={bodyDraft}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={24}
              className="min-h-[420px] w-full resize-y border-0 bg-transparent p-0 font-mono text-sm leading-relaxed text-foreground shadow-none outline-none"
              aria-label="Body markdown"
            />
          </div>
        ) : (
          <div className="px-6 py-8 lg:px-10 lg:py-10">
            <ContentMarkdown>{bodyDraft || "_Nothing to preview yet._"}</ContentMarkdown>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10 lg:py-10">
      {body ? (
        <ContentMarkdown>{displayBody}</ContentMarkdown>
      ) : (
        <p className="text-sm text-muted-foreground">
          No content yet. Generate or edit to add copy.
        </p>
      )}
    </div>
  );
}

function ContentPieceAside({
  editing,
  statusDraft,
  plannedDateDraft,
  piece,
  displayBody,
  wordCount,
  canEnhance,
  enhancing,
  canPublish,
  busy,
  fetchDualScore,
  fetchBrief,
  renderLink,
  onStatusChange,
  onPlannedDateChange,
  onEnhance,
  onPublish,
  onQueueSocial,
  queueingSocial = false,
  asideExtra,
}: {
  editing: boolean;
  statusDraft: "draft" | "ready";
  plannedDateDraft: string;
  piece: ContentPieceDetail;
  displayBody: string;
  wordCount: number;
  canEnhance: boolean;
  enhancing: boolean;
  canPublish: boolean;
  busy: boolean;
  fetchDualScore?: (contentPieceId: number) => Promise<DualContentScore | null>;
  fetchBrief?: (briefId: number) => Promise<ContentBriefSummary | null>;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  onStatusChange: (value: "draft" | "ready") => void;
  onPlannedDateChange: (value: string) => void;
  onEnhance?: () => void | Promise<void>;
  onPublish?: () => void;
  onQueueSocial?: () => void;
  queueingSocial?: boolean;
  asideExtra?: ReactNode;
}) {
  const body = displayBody.trim();
  const [dual, setDual] = useState<DualContentScore | null>(null);

  useEffect(() => {
    if (!piece.id || !fetchDualScore) {
      setDual(null);
      return;
    }
    let cancelled = false;
    void fetchDualScore(piece.id)
      .then((data) => {
        if (!cancelled) setDual(data);
      })
      .catch(() => {
        if (!cancelled) setDual(null);
      });
    return () => {
      cancelled = true;
    };
  }, [piece.id, fetchDualScore]);

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      {asideExtra}
      {editing ? (
        <div className="paper-card space-y-3 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Status</span>
              <select
                value={statusDraft}
                onChange={(event) =>
                  onStatusChange(event.target.value === "ready" ? "ready" : "draft")
                }
                className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm capitalize"
                aria-label="Status"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Planned date</span>
              <input
                type="date"
                value={plannedDateDraft}
                onChange={(event) => onPlannedDateChange(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm"
              />
            </label>
          </div>
        </div>
      ) : piece.plannedDate ? (
        <div className="paper-card rounded-xl p-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Scheduled
          </p>
          <p className="mt-1 font-medium">{piece.plannedDate}</p>
        </div>
      ) : null}

      <ContentBriefPanel
        briefId={piece.briefId}
        projectId={piece.websiteProjectId}
        pieceTargetKeyword={piece.targetKeyword}
        secondaryKeywords={piece.pieceMetadata?.secondaryKeywords}
        fetchBrief={fetchBrief}
        serpGaps={dual?.serp.gaps}
        competitorTopics={dual?.competitorDiff}
        renderLink={renderLink}
      />

      {body ? (
        <ArticleQualityPanel
          bodyMarkdown={displayBody}
          wordCount={wordCount}
          metadata={piece.pieceMetadata}
          contentPieceId={piece.id}
          fetchDualScore={fetchDualScore}
          dualScore={dual}
          savedBodyMarkdown={piece.bodyMarkdown ?? ""}
          showScoreDelta={editing}
          canEnhance={canEnhance}
          onEnhance={onEnhance ? () => void onEnhance() : undefined}
          enhancing={enhancing}
        />
      ) : null}

      {canPublish ? (
        <div className="paper-card space-y-3 rounded-xl p-4">
          <p className="text-sm font-medium">Ready to publish</p>
          <p className="text-xs text-muted-foreground">
            Content is marked ready. Choose a destination when you publish.
          </p>
          <button
            type="button"
            disabled={busy || editing}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={onPublish}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Publish
          </button>
          {onQueueSocial ? (
            <button
              type="button"
              disabled={busy || editing}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground disabled:opacity-50"
              onClick={onQueueSocial}
              title="Create LinkedIn and X variants and open Social Hub"
            >
              {queueingSocial ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden />
              )}
              {queueingSocial ? "Queuing…" : "Queue social"}
            </button>
          ) : null}
        </div>
      ) : onQueueSocial ? (
        <div className="paper-card space-y-3 rounded-xl p-4">
          <p className="text-sm font-medium">Social distribution</p>
          <p className="text-xs text-muted-foreground">
            Create LinkedIn and X variants from this article.
          </p>
          <button
            type="button"
            disabled={busy || editing}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground disabled:opacity-50"
            onClick={onQueueSocial}
            title="Create LinkedIn and X variants and open Social Hub"
          >
            {queueingSocial ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Share2 className="h-4 w-4" aria-hidden />
            )}
            {queueingSocial ? "Queuing…" : "Queue social"}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export function ContentPieceView({
  piece,
  renderLink,
  onGenerate,
  generating = false,
  generatingState = null,
  generateMessage = null,
  onPublish,
  publishing = false,
  publishingState = null,
  publishMessage = null,
  onSave,
  saving = false,
  saveMessage = null,
  onHumanize,
  humanizing = false,
  humanizeMessage = null,
  onDelete,
  deleting = false,
  onMarkReady,
  markingReady = false,
  onCopy,
  onRegenerate,
  regenerating = false,
  regenerateMessage = null,
  onEnhance,
  enhancing = false,
  enhanceMessage = null,
  onRepurpose,
  onQueueSocial,
  queueingSocial = false,
  stockImagesConfigured = false,
  onRegenerateImages,
  regeneratingImages = false,
  staleGenerating = false,
  onResetGeneration,
  fetchDualScore,
  fetchBrief,
  headerExtra,
  asideExtra,
}: {
  piece: ContentPieceDetail;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  fetchDualScore?: (
    contentPieceId: number,
  ) => Promise<DualContentScore | null>;
  fetchBrief?: (briefId: number) => Promise<ContentBriefSummary | null>;
  onGenerate?: () => void | Promise<void>;
  generating?: boolean;
  generatingState?: ContentPieceGeneratingState | null;
  generateMessage?: string | null;
  onPublish?: () => void;
  publishing?: boolean;
  publishingState?: ContentPiecePublishingState | null;
  publishMessage?: string | null;
  onSave?: (payload: ContentPieceSavePayload) => void | Promise<void>;
  saving?: boolean;
  saveMessage?: string | null;
  onHumanize?: () => void;
  humanizing?: boolean;
  humanizeMessage?: string | null;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onMarkReady?: () => void | Promise<void>;
  markingReady?: boolean;
  onCopy?: () => void | Promise<void>;
  onRegenerate?: () => void | Promise<void>;
  regenerating?: boolean;
  regenerateMessage?: string | null;
  onEnhance?: () => void | Promise<void>;
  enhancing?: boolean;
  enhanceMessage?: string | null;
  onRepurpose?: () => void;
  onQueueSocial?: () => void;
  queueingSocial?: boolean;
  stockImagesConfigured?: boolean;
  onRegenerateImages?: () => void | Promise<void>;
  regeneratingImages?: boolean;
  staleGenerating?: boolean;
  onResetGeneration?: () => void | Promise<void>;
  /** Host-specific header extras (e.g. performance badge). */
  headerExtra?: ReactNode;
  /** Host-specific aside extras (e.g. visual summary card). */
  asideExtra?: ReactNode;
}) {
  const [editor, dispatch] = useReducer(editorReducer, piece, createEditorState);
  const nextDraftKey = pieceDraftKey(piece);
  if (!editor.editing && editor.draftKey !== nextDraftKey) {
    dispatch({ type: "sync", piece });
  }

  const formatLabel = formatContentFormatType(piece.formatType);
  const displayBody = editor.editing ? editor.bodyDraft : (piece.bodyMarkdown ?? "");
  const body = displayBody.trim();
  // Empty draft → Generate; body present → Regenerate (never both).
  const showGenerate =
    !body && contentPieceCanGenerate(piece.status) && Boolean(onGenerate);
  const showPublish = Boolean(contentPieceCanPublish(piece.status) && onPublish);
  const showEdit = Boolean(contentPieceCanEdit(piece.status) && onSave);
  const showHumanize =
    contentPieceCanHumanize(piece.formatType) &&
    Boolean(body) &&
    contentPieceCanEdit(piece.status) &&
    Boolean(onHumanize);
  const showRegenerate = Boolean(
    body && contentPieceCanEdit(piece.status) && onRegenerate,
  );
  const showEnhance = Boolean(
    body &&
      contentPieceCanEnhance(piece.formatType) &&
      contentPieceCanEdit(piece.status) &&
      onEnhance,
  );
  const showRepurpose = Boolean(body && onRepurpose);
  const showQueueSocial = Boolean(
    onQueueSocial &&
      contentPieceCanQueueSocial(piece.formatType, piece.status, piece.bodyMarkdown ?? body),
  );
  const featuredImage =
    piece.pieceMetadata?.images?.find((image) => image.role === "featured") ?? null;
  const supportsStockImages = contentPieceSupportsStockImages(piece.formatType);
  const showMarkReady = Boolean(
    contentPieceCanMarkReady(piece.status, piece.bodyMarkdown) && onMarkReady,
  );
  const showDelete = Boolean(contentPieceCanDelete(piece.status) && onDelete);
  const actionMessage =
    generateMessage ??
    publishMessage ??
    saveMessage ??
    humanizeMessage ??
    regenerateMessage ??
    enhanceMessage;
  const generateError =
    generateMessage != null &&
    !generating &&
    !generatingState &&
    (piece.status === "failed" || staleGenerating);
  const busy =
    generating ||
    publishing ||
    saving ||
    humanizing ||
    deleting ||
    markingReady ||
    regenerating ||
    enhancing ||
    regeneratingImages ||
    queueingSocial;
  const wordCount = (editor.editing ? editor.bodyDraft : (piece.bodyMarkdown ?? ""))
    .split(/\s+/)
    .filter(Boolean).length;

  async function handleSave() {
    if (!onSave) return;
    // Published pieces cannot enter edit mode; status is draft|ready only.
    await onSave({
      title: editor.titleDraft.trim(),
      bodyMarkdown: editor.bodyDraft,
      status: editor.statusDraft,
      plannedDate: editor.plannedDateDraft.trim() || null,
    });
    dispatch({ type: "saved", piece });
  }

  async function handleCopy() {
    if (onCopy) {
      await onCopy();
    } else if (body) {
      await navigator.clipboard.writeText(body);
    }
    dispatch({ type: "copied" });
    window.setTimeout(() => dispatch({ type: "clear_copied" }), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ContentPieceHeader
        piece={piece}
        editing={editor.editing}
        titleDraft={editor.titleDraft}
        formatLabel={formatLabel}
        wordCount={wordCount}
        onTitleChange={(value) => dispatch({ type: "set_title", value })}
        renderLink={renderLink}
        headerExtra={headerExtra}
      />

      <ContentPieceStatusBanners
        actionMessage={actionMessage}
        generateError={generateError}
        generateMessage={generateMessage}
        piece={piece}
        generating={generating}
        generatingState={generatingState}
        staleGenerating={staleGenerating}
        onResetGeneration={onResetGeneration}
        publishingState={publishingState}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <ContentPieceFeaturedImage
            featuredImage={featuredImage}
            supportsStockImages={supportsStockImages}
            stockImagesConfigured={stockImagesConfigured}
            regenerating={regeneratingImages}
            onRegenerateImages={onRegenerateImages}
          />
          <div className="paper-card overflow-hidden rounded-xl">
            <ContentPieceToolbar
              pieceTitle={piece.title}
              editing={editor.editing}
              previewMode={editor.previewMode}
              copied={editor.copied}
              busy={busy}
              titleDraft={editor.titleDraft}
              saving={saving}
              regenerating={regenerating}
              enhancing={enhancing}
              humanizing={humanizing}
              generating={generating}
              deleting={deleting}
              markingReady={markingReady}
              body={body}
              onTogglePreview={showEdit ? () => dispatch({ type: "toggle_preview" }) : undefined}
              onSave={showEdit ? () => void handleSave() : undefined}
              onCancel={showEdit ? () => dispatch({ type: "cancel", piece }) : undefined}
              onStartEdit={showEdit ? () => dispatch({ type: "start_edit" }) : undefined}
              onRepurpose={showRepurpose ? onRepurpose : undefined}
              onQueueSocial={showQueueSocial ? onQueueSocial : undefined}
              queueingSocial={queueingSocial}
              onCopy={() => void handleCopy()}
              onRegenerate={showRegenerate ? onRegenerate : undefined}
              onEnhance={showEnhance ? onEnhance : undefined}
              onHumanize={showHumanize ? onHumanize : undefined}
              onMarkReady={showMarkReady ? onMarkReady : undefined}
              onGenerate={showGenerate ? onGenerate : undefined}
              onDelete={showDelete ? onDelete : undefined}
            />
            <ContentPieceBodyEditor
              editing={editor.editing}
              previewMode={editor.previewMode}
              canEdit={showEdit}
              bodyDraft={editor.bodyDraft}
              displayBody={displayBody}
              body={body}
              onBodyChange={(value) => dispatch({ type: "set_body", value })}
            />
          </div>
        </div>

        <ContentPieceAside
          editing={editor.editing}
          statusDraft={editor.statusDraft}
          plannedDateDraft={editor.plannedDateDraft}
          piece={piece}
          displayBody={displayBody}
          wordCount={wordCount}
          canEnhance={showEnhance}
          enhancing={enhancing}
          canPublish={showPublish}
          busy={busy}
          fetchDualScore={fetchDualScore}
          fetchBrief={fetchBrief}
          renderLink={renderLink}
          onStatusChange={(value) => dispatch({ type: "set_status", value })}
          onPlannedDateChange={(value) => dispatch({ type: "set_planned_date", value })}
          onEnhance={onEnhance}
          onPublish={onPublish}
          onQueueSocial={showQueueSocial ? onQueueSocial : undefined}
          queueingSocial={queueingSocial}
          asideExtra={asideExtra}
        />
      </div>
    </div>
  );
}

export function ContentPieceNotFound({
  renderLink,
}: {
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <h2 className="mb-2 text-xl font-semibold">Content piece not found</h2>
      <p className="mb-6 text-muted-foreground">
        This piece doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <PieceLink
        renderLink={renderLink}
        href="/projects"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to Content studio
      </PieceLink>
    </div>
  );
}
