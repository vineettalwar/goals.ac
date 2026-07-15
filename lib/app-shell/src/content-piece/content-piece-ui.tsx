import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Pencil, Save, Sparkles, Upload, X } from "lucide-react";
import { cn } from "../cn";
import {
  contentPieceCanEdit,
  contentPieceCanGenerate,
  contentPieceCanHumanize,
  contentPieceCanPublish,
  contentStudioBackHref,
  formatContentFormatType,
  formatContentPieceUpdatedAt,
  type ContentPieceDetail,
  type ContentPieceGeneratingState,
  type ContentPiecePublishingState,
} from "./types";

export type ContentPieceLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
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
    ready: "bg-emerald-100 text-emerald-800",
    published: "bg-primary text-primary-foreground",
    draft: "bg-muted text-muted-foreground",
    generating: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
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
  staleGenerating = false,
  onResetGeneration,
}: {
  piece: ContentPieceDetail;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  onGenerate?: () => void;
  generating?: boolean;
  generatingState?: ContentPieceGeneratingState | null;
  generateMessage?: string | null;
  onPublish?: () => void;
  publishing?: boolean;
  publishingState?: ContentPiecePublishingState | null;
  publishMessage?: string | null;
  onSave?: (payload: { title: string; bodyMarkdown: string }) => void | Promise<void>;
  saving?: boolean;
  saveMessage?: string | null;
  onHumanize?: () => void;
  humanizing?: boolean;
  humanizeMessage?: string | null;
  staleGenerating?: boolean;
  onResetGeneration?: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(piece.title);
  const [bodyDraft, setBodyDraft] = useState(piece.bodyMarkdown ?? "");

  useEffect(() => {
    if (!editing) {
      setTitleDraft(piece.title);
      setBodyDraft(piece.bodyMarkdown ?? "");
    }
  }, [piece.title, piece.bodyMarkdown, editing]);

  const formatLabel = formatContentFormatType(piece.formatType);
  const body = piece.bodyMarkdown?.trim();
  const showGenerate = contentPieceCanGenerate(piece.status) && onGenerate;
  const showPublish = contentPieceCanPublish(piece.status) && onPublish;
  const showEdit = contentPieceCanEdit(piece.status) && onSave;
  const showHumanize =
    contentPieceCanHumanize(piece.formatType) &&
    Boolean(body) &&
    contentPieceCanEdit(piece.status) &&
    onHumanize;
  const actionMessage =
    generateMessage ?? publishMessage ?? saveMessage ?? humanizeMessage;
  const generateError =
    generateMessage != null &&
    !generating &&
    !generatingState &&
    (piece.status === "failed" || staleGenerating);
  const busy = generating || publishing || saving || humanizing;

  async function handleSave() {
    if (!onSave) return;
    await onSave({ title: titleDraft.trim(), bodyMarkdown: bodyDraft });
    setEditing(false);
  }

  function cancelEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown ?? "");
    setEditing(false);
  }

  return (
    <div className="max-w-4xl space-y-6 px-8 py-8">
      <PieceLink
        renderLink={renderLink}
        href={contentStudioBackHref(piece.websiteProjectId)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Content studio
      </PieceLink>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-2xl font-bold leading-tight tracking-tight lg:text-3xl"
              aria-label="Content title"
            />
          ) : (
            <h1 className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
              {piece.title}
            </h1>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MetaBadge>{formatLabel}</MetaBadge>
            {piece.targetKeyword ? <MetaBadge>{piece.targetKeyword}</MetaBadge> : null}
            <span className="text-xs text-muted-foreground">
              {piece.wordCount.toLocaleString()} words
            </span>
            <StatusBadge status={piece.status} />
            <span className="text-xs text-muted-foreground">
              Updated {formatContentPieceUpdatedAt(piece.updatedAt)}
            </span>
          </div>
        </div>

        {showGenerate || showPublish || showEdit || showHumanize ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {showEdit ? (
              editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={busy || !titleDraft.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden />
                    )}
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={busy}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </button>
              )
            ) : null}
            {showHumanize ? (
              <button
                type="button"
                onClick={onHumanize}
                disabled={busy || editing}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {humanizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                {humanizing ? "Humanizing…" : "Humanize"}
              </button>
            ) : null}
            {showGenerate ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={busy || editing}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                {generating ? "Generating…" : "Generate"}
              </button>
            ) : null}
            {showPublish ? (
              <button
                type="button"
                onClick={onPublish}
                disabled={busy || editing}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                {publishing ? "Publishing…" : "Publish"}
              </button>
            ) : null}
          </div>
        ) : null}
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
            AI may not be configured. Add your API key in Settings → AI Providers, then try again.
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

      <article className="paper-card overflow-hidden p-6">
        {editing ? (
          <textarea
            value={bodyDraft}
            onChange={(event) => setBodyDraft(event.target.value)}
            rows={24}
            className="min-h-[420px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-sans text-sm leading-relaxed text-foreground"
            aria-label="Body markdown"
          />
        ) : body ? (
          <pre className="max-w-none whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {body}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No body content stored for this piece.</p>
        )}
      </article>
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
        href="/studio"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to Content studio
      </PieceLink>
    </div>
  );
}
