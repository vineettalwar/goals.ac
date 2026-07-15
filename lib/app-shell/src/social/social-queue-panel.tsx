import { AlertCircle, Calendar, Check, Loader2, RefreshCw, Send, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { SocialPostPreview } from "./social-post-preview";
import {
  INSTAGRAM_IMAGE_REQUIRED_MESSAGE,
  SOCIAL_PLATFORM_OPTIONS,
  isSocialOverCharLimit,
  resolveSocialPieceImageUrl,
  resolveSocialPlatformId,
  socialPieceNeedsInstagramImage,
  type SocialQueueItem,
} from "./types";

export type SocialHubLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

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
}) {
  return (
    <div className="space-y-4">
      {requireApproval ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>Posts need approval before the publish sweep</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
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
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm hover:bg-muted/50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loadingQueue && "animate-spin")} />
          Refresh
        </button>
      </div>

      {queueError ? (
        <div className="paper-card px-4 py-8 text-sm text-destructive">{queueError}</div>
      ) : loadingQueue && (queue ?? []).length === 0 ? (
        <div className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queue…
        </div>
      ) : (queue ?? []).length === 0 ? (
        <div className="paper-card px-4 py-10 text-center text-sm text-muted-foreground">
          No social posts in the queue yet. Create LinkedIn, X, or Instagram posts in Content Studio,
          then schedule them here.
        </div>
      ) : (
        <div className="space-y-4">
          {(queue ?? []).map((item) => {
            const platformId = resolveSocialPlatformId(item);
            const overLimit = isSocialOverCharLimit(item.bodyMarkdown, platformId);
            const needsImage = socialPieceNeedsInstagramImage(item);
            const imageUrl = resolveSocialPieceImageUrl(item);
            const hasImage = Boolean(imageUrl);
            const imageBlocked = needsImage && !hasImage;
            const actionsBlocked = overLimit || imageBlocked;

            return (
              <div key={item.id} className="paper-card space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs capitalize",
                        item.approvalStatus === "approved"
                          ? "bg-primary/10 text-primary"
                          : item.approvalStatus === "pending_review"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : item.approvalStatus === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {(item.approvalStatus ?? "draft").replace(/_/g, " ")}
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
                        Submit
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
                  lineClamp={4}
                  className={overLimit ? "ring-1 ring-destructive/40" : undefined}
                />

                {imageBlocked ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{INSTAGRAM_IMAGE_REQUIRED_MESSAGE}</span>
                  </div>
                ) : null}

                {overLimit ? (
                  <p className="text-xs text-destructive">
                    Body is over this platform&apos;s character limit. Edit in studio before
                    scheduling.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    aria-label={
                      overLimit
                        ? "Schedule disabled — post is over the character limit"
                        : imageBlocked
                          ? "Schedule disabled — Instagram posts need an image"
                          : "Schedule post"
                    }
                    disabled={actionsBlocked}
                    className="h-9 max-w-[220px] rounded-lg border border-input bg-card px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue={item.scheduledAt ? item.scheduledAt.slice(0, 16) : ""}
                    onBlur={(event) => {
                      if (actionsBlocked) return;
                      if (event.target.value) void onSchedule(item.id, event.target.value);
                    }}
                  />
                  {renderLink({
                    href: pieceHref(item.id),
                    className:
                      "inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted/50",
                    children: overLimit ? "Edit to fit limit" : "Open in studio",
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
