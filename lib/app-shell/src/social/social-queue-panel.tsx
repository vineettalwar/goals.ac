import {
  AlertCircle,
  Calendar,
  Check,
  CircleHelp,
  Loader2,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { SocialPostPreview } from "./social-post-preview";
import {
  INSTAGRAM_IMAGE_REQUIRED_MESSAGE,
  SOCIAL_PLATFORM_OPTIONS,
  isSocialOverCharLimit,
  resolveSocialPieceImageUrl,
  resolveSocialPiecePublicImageUrl,
  resolveSocialPlatformId,
  socialPieceNeedsInstagramImage,
  type SocialQueueItem,
} from "./types";

export type SocialHubLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

function approvalLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending_review":
      return "Needs approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Draft";
  }
}

function nextStepHint(
  item: SocialQueueItem,
  requireApproval: boolean,
  actionsBlocked: boolean,
): string | null {
  if (actionsBlocked) return null;
  if (item.approvalStatus === "draft") {
    return requireApproval
      ? "Next: submit for approval, then set a go-live time"
      : "Next: set a go-live time, then mark Ready in studio";
  }
  if (item.approvalStatus === "pending_review") {
    return "Next: approve to unlock publishing";
  }
  if (item.approvalStatus === "approved" && !item.scheduledAt) {
    return "Next: pick a go-live time";
  }
  if (item.scheduledAt) {
    return "Queued for the daily publish sweep";
  }
  return null;
}

export function SocialQueuePanel({
  platformFilter,
  onPlatformFilterChange,
  loadingQueue,
  queue,
  queueError,
  pieceHref,
  renderLink,
  onRefresh,
  onSubmitReview,
  onApprove,
  onReject,
  onSchedule,
  requireApproval = false,
  attachingImage,
  onUseStockImage,
}: {
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  loadingQueue: boolean;
  queue: SocialQueueItem[];
  queueError: string | null;
  pieceHref: (pieceId: number) => string;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
  onRefresh: () => void;
  onSubmitReview: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSchedule: (id: number, value: string) => void;
  requireApproval?: boolean;
  attachingImage?: boolean;
  onUseStockImage?: (pieceId: number) => void | Promise<void>;
}) {
  const items = queue ?? [];
  const needsActionCount = items.filter(
    (item) =>
      item.approvalStatus === "pending_review" ||
      (requireApproval && item.approvalStatus === "draft"),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by platform"
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
          value={platformFilter}
          onChange={(event) => onPlatformFilterChange(event.target.value)}
        >
          <option value="all">All platforms</option>
          {SOCIAL_PLATFORM_OPTIONS.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void onRefresh()}
          aria-label="Refresh queue"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loadingQueue && "animate-spin")} />
        </button>

        {!loadingQueue && items.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "post" : "posts"}
            {needsActionCount > 0 ? ` · ${needsActionCount} to review` : null}
          </p>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {requireApproval ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-900 dark:text-amber-100"
              role="status"
            >
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              Approval required
            </span>
          ) : null}

          <details className="group relative">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground [&::-webkit-details-marker]:hidden">
              <CircleHelp className="h-3.5 w-3.5" aria-hidden />
              How publishing works
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-[min(100vw-2rem,20rem)] rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-sm">
              <ol className="list-decimal space-y-1.5 pl-3.5 text-foreground/80">
                <li>Set a go-live time on the post.</li>
                <li>
                  Mark it <strong className="font-medium text-foreground">Ready</strong> in studio
                  {requireApproval ? (
                    <>
                      {" "}
                      and <strong className="font-medium text-foreground">Approved</strong> here
                    </>
                  ) : null}
                  .
                </li>
                <li>The daily sweep publishes due posts — not instantly on save.</li>
              </ol>
            </div>
          </details>
        </div>
      </div>

      {queueError ? (
        <div className="paper-card px-4 py-8 text-sm text-destructive">{queueError}</div>
      ) : loadingQueue && items.length === 0 ? (
        <div className="flex items-center gap-2 px-1 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queue…
        </div>
      ) : items.length === 0 ? (
        <div className="paper-card space-y-2 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Nothing queued yet</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Create LinkedIn, X, or Instagram posts in Content Studio, then come back here to schedule
            them. Publishing runs on a daily sweep after a post is Ready
            {requireApproval ? " and Approved" : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const platformId = resolveSocialPlatformId(item);
            const overLimit = isSocialOverCharLimit(item.bodyMarkdown, platformId);
            const needsImage = socialPieceNeedsInstagramImage(item);
            const imageUrl = resolveSocialPieceImageUrl(item);
            const hasImage = Boolean(resolveSocialPiecePublicImageUrl(item));
            const imageBlocked = needsImage && !hasImage;
            const actionsBlocked = overLimit || imageBlocked;
            const hint = nextStepHint(item, requireApproval, actionsBlocked);

            return (
              <div
                key={item.id}
                className={cn(
                  "space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6",
                  overLimit && "border-destructive/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs",
                        item.approvalStatus === "approved"
                          ? "bg-primary/10 text-primary"
                          : item.approvalStatus === "pending_review"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : item.approvalStatus === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {approvalLabel(item.approvalStatus)}
                    </span>
                    {imageBlocked ? (
                      <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                        Needs image
                      </span>
                    ) : null}
                    {overLimit ? (
                      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        Over limit
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    {item.approvalStatus === "draft" ? (
                      <button
                        type="button"
                        disabled={actionsBlocked}
                        title={
                          overLimit
                            ? "Shorten the post before submitting"
                            : imageBlocked
                              ? "Add an image before submitting"
                              : undefined
                        }
                        onClick={() => void onSubmitReview(item.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-input px-2.5 text-sm hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {requireApproval ? "Submit for approval" : "Submit"}
                      </button>
                    ) : null}
                    {item.approvalStatus === "pending_review" ? (
                      <>
                        <button
                          type="button"
                          disabled={actionsBlocked}
                          title={
                            overLimit
                              ? "Shorten the post before approving"
                              : imageBlocked
                                ? "Add an image before approving"
                                : undefined
                          }
                          onClick={() => void onApprove(item.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void onReject(item.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-input px-2.5 text-sm hover:bg-muted/50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <SocialPostPreview
                  platform={item.platform}
                  formatType={item.formatType}
                  title={item.title}
                  bodyMarkdown={item.bodyMarkdown}
                  imageUrl={imageUrl}
                  lineClamp={3}
                  variant="plain"
                />

                {imageBlocked ? (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <span>{INSTAGRAM_IMAGE_REQUIRED_MESSAGE}</span>
                      {onUseStockImage ? (
                        <button
                          type="button"
                          disabled={attachingImage}
                          onClick={() => {
                            if (onUseStockImage) void onUseStockImage(item.id);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-100 px-2.5 text-xs font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
                        >
                          {attachingImage ? (
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          ) : (
                            <RefreshCw className="h-3 w-3" aria-hidden />
                          )}
                          Use stock image
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {overLimit ? (
                  <p className="text-xs text-destructive">
                    Too long for this platform — shorten in studio before scheduling.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                  <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                      Go live
                    </span>
                    <input
                      type="datetime-local"
                      aria-label={
                        overLimit
                          ? "Schedule disabled — post is over the character limit"
                          : imageBlocked
                            ? "Schedule disabled — Instagram posts need an image"
                            : "Go-live time"
                      }
                      disabled={actionsBlocked}
                      className="h-9 max-w-[220px] rounded-lg border border-input bg-card px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      defaultValue={item.scheduledAt ? item.scheduledAt.slice(0, 16) : ""}
                      onBlur={(event) => {
                        if (actionsBlocked) return;
                        if (event.target.value) void onSchedule(item.id, event.target.value);
                      }}
                    />
                  </label>
                  {renderLink({
                    href: pieceHref(item.id),
                    className:
                      "inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted/50",
                    children: overLimit ? "Edit to fit limit" : "Open in studio",
                  })}
                </div>

                {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
