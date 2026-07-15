import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Shuffle,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { cn } from "../cn";
import { ContentPieceFeaturedImage } from "./content-featured-image";
import { ArticleQualityPanel } from "./content-quality-panel";
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
  contentPieceSupportsStockImages,
  contentStudioBackHref,
  formatContentFormatType,
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

function PieceLink({
  renderLink,
  ...props
}: ContentPieceLinkProps & {
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    published: "bg-primary text-primary-foreground",
    draft: "bg-muted text-muted-foreground",
    generating: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? "bg-muted text-muted-foreground",
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
  stockImagesConfigured = false,
  onRegenerateImages,
  regeneratingImages = false,
  staleGenerating = false,
  onResetGeneration,
  fetchDualScore,
}: {
  piece: ContentPieceDetail;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  fetchDualScore?: (
    contentPieceId: number,
  ) => Promise<import("./content-quality-panel").DualContentScore | null>;
  onGenerate?: () => void;
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
  stockImagesConfigured?: boolean;
  onRegenerateImages?: () => void | Promise<void>;
  regeneratingImages?: boolean;
  staleGenerating?: boolean;
  onResetGeneration?: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [titleDraft, setTitleDraft] = useState(piece.title);
  const [bodyDraft, setBodyDraft] = useState(piece.bodyMarkdown ?? "");
  const [plannedDateDraft, setPlannedDateDraft] = useState(piece.plannedDate ?? "");
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) {
      setTitleDraft(piece.title);
      setBodyDraft(piece.bodyMarkdown ?? "");
      setPlannedDateDraft(piece.plannedDate ?? "");
    }
  }, [piece.title, piece.bodyMarkdown, piece.plannedDate, editing]);

  const formatLabel = formatContentFormatType(piece.formatType);
  const displayBody = editing ? bodyDraft : (piece.bodyMarkdown ?? "");
  const body = displayBody.trim();
  const showGenerate =
    !body && contentPieceCanGenerate(piece.status) && Boolean(onGenerate);
  const showPublish = contentPieceCanPublish(piece.status) && onPublish;
  const showEdit = contentPieceCanEdit(piece.status) && onSave;
  const showHumanize =
    contentPieceCanHumanize(piece.formatType) &&
    Boolean(body) &&
    contentPieceCanEdit(piece.status) &&
    onHumanize;
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
  const featuredImage =
    piece.pieceMetadata?.images?.find((image) => image.role === "featured") ?? null;
  const supportsStockImages = contentPieceSupportsStockImages(piece.formatType);
  const showMarkReady =
    contentPieceCanMarkReady(piece.status, piece.bodyMarkdown) && onMarkReady;
  const showDelete = contentPieceCanDelete(piece.status) && onDelete;
  const toolbarBtn =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50";
  const toolbarBtnPrimary =
    "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
  const toolbarBtnGhost =
    "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50";
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
    regeneratingImages;
  const humanizationAudit = piece.pieceMetadata?.humanizationAudit;

  async function handleSave() {
    if (!onSave) return;
    await onSave({
      title: titleDraft.trim(),
      bodyMarkdown: bodyDraft,
      plannedDate: plannedDateDraft.trim() || null,
    });
    setEditing(false);
    setPreviewMode(false);
  }

  function cancelEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown ?? "");
    setPlannedDateDraft(piece.plannedDate ?? "");
    setEditing(false);
    setPreviewMode(false);
  }

  async function handleCopy() {
    if (onCopy) {
      await onCopy();
    } else if (body) {
      await navigator.clipboard.writeText(body);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const wordCount = (editing ? bodyDraft : (piece.bodyMarkdown ?? ""))
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
              onChange={(event) => setTitleDraft(event.target.value)}
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
            {piece.pieceMetadata?.humanized ? (
              <MetaBadge>Humanized</MetaBadge>
            ) : null}
            {piece.plannedDate && !editing ? (
              <span className="text-xs text-muted-foreground">Planned {piece.plannedDate}</span>
            ) : null}
            {humanizationAudit && !humanizationAudit.rejected ? (
              <span className="text-xs text-muted-foreground">
                AI tells {humanizationAudit.slopScoreBefore ?? "?"} →{" "}
                {humanizationAudit.slopScoreAfter ?? "?"}
              </span>
            ) : humanizationAudit?.rejected ? (
              <span className="text-xs text-muted-foreground">Humanization skipped</span>
            ) : null}
          </div>
        </div>
      </div>

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
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {showEdit ? (
                  editing ? (
                    <>
                      <button
                        type="button"
                        className={toolbarBtn}
                        onClick={() => setPreviewMode((value) => !value)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        {previewMode ? "Edit" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={busy || !titleDraft.trim()}
                        className={toolbarBtnPrimary}
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Save className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        className={toolbarBtn}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      disabled={busy}
                      className={toolbarBtn}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                  )
                ) : null}
                {showRepurpose ? (
                  <button
                    type="button"
                    onClick={onRepurpose}
                    disabled={busy || editing}
                    className={toolbarBtn}
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden />
                    Repurpose
                  </button>
                ) : null}
                {body ? (
                  <button
                    type="button"
                    disabled={busy}
                    className={toolbarBtn}
                    onClick={() => void handleCopy()}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                ) : null}
                {showRegenerate ? (
                  <button
                    type="button"
                    onClick={() => void onRegenerate?.()}
                    disabled={busy || editing || enhancing}
                    className={toolbarBtn}
                  >
                    {regenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {regenerating ? "Regenerating…" : "Regenerate"}
                  </button>
                ) : null}
                {showEnhance ? (
                  <button
                    type="button"
                    onClick={() => void onEnhance?.()}
                    disabled={busy || editing || regenerating || humanizing}
                    className={toolbarBtn}
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
                {showHumanize ? (
                  <button
                    type="button"
                    onClick={onHumanize}
                    disabled={busy || editing || regenerating || enhancing}
                    className={toolbarBtn}
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
                {showMarkReady ? (
                  <button
                    type="button"
                    onClick={() => void onMarkReady?.()}
                    disabled={busy || editing}
                    className={toolbarBtn}
                  >
                    {markingReady ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Mark ready
                  </button>
                ) : null}
                {showGenerate ? (
                  <button
                    type="button"
                    onClick={onGenerate}
                    disabled={busy || editing}
                    className={toolbarBtn}
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {generating ? "Generating…" : "Generate"}
                  </button>
                ) : null}
                {showDelete ? (
                  <button
                    type="button"
                    disabled={busy || editing}
                    className={toolbarBtnGhost}
                    onClick={() => {
                      if (window.confirm(`Delete "${piece.title}"? This cannot be undone.`)) {
                        void onDelete?.();
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

            {showEdit && editing ? (
              <div className="min-h-[420px]">
                {!previewMode ? (
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Markdown source</p>
                      <MarkdownToolbar
                        textareaRef={bodyTextareaRef}
                        value={bodyDraft}
                        onChange={setBodyDraft}
                      />
                    </div>
                    <textarea
                      ref={bodyTextareaRef}
                      value={bodyDraft}
                      onChange={(event) => setBodyDraft(event.target.value)}
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
            ) : (
              <div className="px-6 py-8 lg:px-10 lg:py-10">
                {body ? (
                  <ContentMarkdown>{displayBody}</ContentMarkdown>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No content yet. Generate or edit to add copy.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          {editing ? (
            <div className="paper-card space-y-3 rounded-xl p-4">
              <label className="block space-y-1 text-xs">
                <span className="font-medium text-muted-foreground">Planned date</span>
                <input
                  type="date"
                  value={plannedDateDraft}
                  onChange={(event) => setPlannedDateDraft(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm"
                />
              </label>
            </div>
          ) : piece.plannedDate ? (
            <div className="paper-card rounded-xl p-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Scheduled
              </p>
              <p className="mt-1 font-medium">{piece.plannedDate}</p>
            </div>
          ) : null}

          {body ? (
            <ArticleQualityPanel
              bodyMarkdown={displayBody}
              wordCount={piece.wordCount}
              metadata={piece.pieceMetadata}
              contentPieceId={piece.id}
              fetchDualScore={fetchDualScore}
              canEnhance={Boolean(showEnhance)}
              onEnhance={onEnhance ? () => void onEnhance() : undefined}
              enhancing={enhancing}
            />
          ) : null}

          {showPublish ? (
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
            </div>
          ) : null}
        </aside>
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
