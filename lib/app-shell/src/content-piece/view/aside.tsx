import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, PenLine, Share2, Upload } from "lucide-react";
import { countAiSlopSignals } from "@workspace/content-engine/ai-writing-rules";
import { cn } from "../../cn";
import { SOCIAL_FORMAT_TYPES } from "../../social/types";
import { ContentBriefPanel, type ContentBriefSummary } from "../brief/panel";
import { ArticleQualityPanel, type DualContentScore } from "../quality/panel";
import {
  buildPublishReadyChecklist,
  nextContentPiecePublishAction,
  publishReadyChecklistBlocks,
  type ContentPieceDetail,
} from "../types";
import type { ContentPieceLinkProps } from "../chrome";

export function ContentPieceAside({
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
  onHumanize,
  humanizing = false,
  onPublish,
  onMarkReady,
  markingReady = false,
  onQueueSocial,
  queueingSocial = false,
  onInsertOutline,
  asideExtra,
  destinationHealthOk = null,
  onSaveCmsRemoteId,
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
  onEnhance?: (missingTerms?: string[]) => void | Promise<void>;
  onHumanize?: () => void;
  humanizing?: boolean;
  onPublish?: () => void;
  onMarkReady?: () => void | Promise<void>;
  markingReady?: boolean;
  onQueueSocial?: () => void;
  queueingSocial?: boolean;
  onInsertOutline?: (markdown: string) => void;
  asideExtra?: ReactNode;
  /** null = unknown / not loaded; false soft-blocks publish. */
  destinationHealthOk?: boolean | null;
  onSaveCmsRemoteId?: (cmsRemoteId: string | null) => void | Promise<void>;
}) {
  const body = displayBody.trim();
  const [dual, setDual] = useState<DualContentScore | null>(null);
  const [cmsRemoteDraft, setCmsRemoteDraft] = useState(
    piece.pieceMetadata?.cmsRemoteId?.trim() ?? "",
  );
  const [savingRemote, setSavingRemote] = useState(false);

  useEffect(() => {
    setCmsRemoteDraft(piece.pieceMetadata?.cmsRemoteId?.trim() ?? "");
  }, [piece.pieceMetadata?.cmsRemoteId]);

  useEffect(() => {
    if (!piece.id || !fetchDualScore) {
      setDual(null);
      return;
    }
    // Social formats don't use SERP dual score.
    if (SOCIAL_FORMAT_TYPES.has(piece.formatType)) {
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
  }, [piece.id, piece.bodyMarkdown, piece.formatType, fetchDualScore]);

  const featuredUrl = piece.pieceMetadata?.featuredImageUrl?.trim() ?? "";
  const hasFeatured =
    Boolean(featuredUrl) ||
    Boolean(piece.pieceMetadata?.images?.some((img) => img.role === "featured"));
  const needsFeaturedImage = ["instagram_post"].includes(piece.formatType);
  const slopScore = body ? countAiSlopSignals(displayBody) : 0;
  const checklist = buildPublishReadyChecklist({
    humanized: piece.pieceMetadata?.humanized,
    humanizeSkippedReason: piece.pieceMetadata?.humanizeSkippedReason,
    humanizationRejected: piece.pieceMetadata?.humanizationAudit?.rejected,
    slopScore: body ? slopScore : undefined,
    editorialScore: dual?.editorial?.total ?? null,
    destinationHealthOk,
    needsFeaturedImage,
    hasFeaturedImage: hasFeatured,
  });
  const checklistBlocks = publishReadyChecklistBlocks(checklist);
  const humanizeOk = checklist.find((item) => item.id === "humanize")?.ok ?? false;
  const nextAction = body
    ? nextContentPiecePublishAction({ status: piece.status, humanizeOk })
    : null;
  const showPublishPath = Boolean(nextAction);

  return (
    <aside className="space-y-5 lg:sticky lg:top-6">
      {showPublishPath ? (
        <div className="space-y-3 rounded-xl p-4">
          <p className="text-sm font-medium">
            {nextAction === "publish" ? "Ready to publish" : "How to publish"}
          </p>
          {slopScore > 0 ? (
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              {slopScore} AI tell{slopScore === 1 ? "" : "s"} in this draft. Humanize rewrites
              them. Enhance quality adds FAQ and links — it does not strip slop.
            </p>
          ) : humanizeOk ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Mark ready if you want the studio queue to treat this as done. Publish goes to your CMS.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Humanize is recommended. You can still publish to a destination now.
            </p>
          )}
          <ul className="flex flex-wrap gap-1.5" aria-label="Publish readiness checklist">
            {checklist.map((item) => (
              <li key={item.id}>
                <span
                  title={item.hint}
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
                    item.ok
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                  )}
                >
                  {item.ok ? "✓" : "!"} {item.label}
                </span>
              </li>
            ))}
          </ul>
          {nextAction === "humanize" && onHumanize ? (
            <button
              type="button"
              disabled={busy || editing || humanizing}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={onHumanize}
              title="Rewrite to strip AI tells — Enhance quality does not do this"
            >
              {humanizing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <PenLine className="h-4 w-4" aria-hidden />
              )}
              {humanizing ? "Humanizing…" : "Humanize"}
            </button>
          ) : null}
          {nextAction === "mark_ready" && onMarkReady ? (
            <button
              type="button"
              disabled={busy || editing}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void onMarkReady()}
            >
              {markingReady ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              )}
              {markingReady ? "Marking…" : "Mark ready to publish"}
            </button>
          ) : null}
          {canPublish && onPublish ? (
            <>
              {checklistBlocks ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Soft block: fix amber checklist items before publishing.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choose a destination when you publish.
                </p>
              )}
              <button
                type="button"
                disabled={busy || editing}
                className={
                  nextAction === "publish"
                    ? "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    : "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground disabled:opacity-50"
                }
                onClick={onPublish}
              >
                <Upload className="h-4 w-4" aria-hidden />
                Publish
              </button>
            </>
          ) : null}
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
      ) : null}
      {asideExtra}
      {editing ? (
        <div className="space-y-3 rounded-xl p-4">
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
        <div className="rounded-xl p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Scheduled
          </p>
          <p className="mt-1 font-medium">{piece.plannedDate}</p>
        </div>
      ) : null}

      {piece.pieceMetadata?.source === "refresh" && onSaveCmsRemoteId ? (
        <div className="space-y-3 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">
            WordPress post id
          </p>
          <p className="text-xs text-muted-foreground">
            Required to update the live page in place. Leave empty only if you intend to create a
            new post.
          </p>
          {piece.pieceMetadata.cmsRemoteLink ? (
            <a
              href={piece.pieceMetadata.cmsRemoteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary hover:underline break-all"
            >
              Matched: {piece.pieceMetadata.cmsRemoteLink}
            </a>
          ) : null}
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={cmsRemoteDraft}
              onChange={(e) => setCmsRemoteDraft(e.target.value)}
              placeholder="e.g. 42"
              className="h-9 flex-1 rounded-lg border border-input bg-card px-2 text-sm"
              aria-label="WordPress post id"
            />
            <button
              type="button"
              disabled={savingRemote || busy}
              className="inline-flex h-9 items-center rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              onClick={() => {
                const next = cmsRemoteDraft.trim() || null;
                setSavingRemote(true);
                void Promise.resolve(onSaveCmsRemoteId(next)).finally(() => setSavingRemote(false));
              }}
            >
              {savingRemote ? "Saving…" : "Save"}
            </button>
          </div>
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
        pieceHasBody={Boolean(body)}
        onInsertOutline={
          onInsertOutline && editing
            ? (markdown, mode) => {
                if (mode === "replace") {
                  onInsertOutline(markdown);
                } else {
                  onInsertOutline(`${displayBody}\n\n${markdown}`);
                }
              }
            : undefined
        }
        renderLink={renderLink}
      />

      {body ? (
        <ArticleQualityPanel
          bodyMarkdown={displayBody}
          wordCount={wordCount}
          metadata={piece.pieceMetadata}
          secondaryKeywords={piece.pieceMetadata?.secondaryKeywords}
          contentPieceId={piece.id}
          formatType={piece.formatType}
          fetchDualScore={fetchDualScore}
          dualScore={dual}
          savedBodyMarkdown={piece.bodyMarkdown ?? ""}
          showScoreDelta={editing}
          editing={editing}
          onInsertMissingTerm={
            onInsertOutline && editing
              ? (snippet) => onInsertOutline(`${displayBody}\n\n${snippet}`)
              : undefined
          }
          onReplaceBody={onInsertOutline && editing ? onInsertOutline : undefined}
          excludeInternalSlug={
            piece.publishedUrl
              ? (() => {
                  try {
                    return new URL(piece.publishedUrl).pathname;
                  } catch {
                    return piece.publishedUrl;
                  }
                })()
              : piece.pieceMetadata?.sourceUrl
                ? (() => {
                    try {
                      return new URL(piece.pieceMetadata.sourceUrl).pathname;
                    } catch {
                      return null;
                    }
                  })()
                : null
          }
          canEnhance={canEnhance}
          onEnhance={onEnhance ? (missingTerms) => void onEnhance(missingTerms) : undefined}
          enhancing={enhancing}
        />
      ) : null}

      {!showPublishPath && onQueueSocial ? (
        <div className="space-y-4 rounded-xl p-6">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Social distribution</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create LinkedIn and X variants from this article.
            </p>
          </div>
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

