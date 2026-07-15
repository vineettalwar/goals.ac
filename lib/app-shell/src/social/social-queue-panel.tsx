import { Calendar, Check, Loader2, RefreshCw, Send } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../cn";
import { SOCIAL_PLATFORM_OPTIONS, type SocialQueueItem } from "./types";

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
  onSchedule,
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
  onSchedule: (id: number, value: string) => void;
}) {
  return (
    <div className="space-y-4">
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
      ) : loadingQueue && queue.length === 0 ? (
        <div className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queue…
        </div>
      ) : queue.length === 0 ? (
        <div className="paper-card px-4 py-10 text-center text-sm text-muted-foreground">
          No social posts in the queue yet. Create LinkedIn, X, or Instagram posts in Content Studio,
          then schedule them here.
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div key={item.id} className="paper-card p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {renderLink({
                    href: pieceHref(item.id),
                    className: "text-base font-semibold hover:underline",
                    children: item.title,
                  })}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                      {item.formatType.replace(/_/g, " ")}
                    </span>
                    {item.platform ? (
                      <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs">
                        {item.platform}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs capitalize",
                        item.approvalStatus === "approved"
                          ? "bg-primary/10 text-primary"
                          : item.approvalStatus === "pending_review"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.approvalStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {item.approvalStatus === "draft" ? (
                    <button
                      type="button"
                      onClick={() => void onSubmitReview(item.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-input px-2.5 text-sm hover:bg-muted/50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit
                    </button>
                  ) : null}
                  {item.approvalStatus === "pending_review" ? (
                    <button
                      type="button"
                      onClick={() => void onApprove(item.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-sm text-primary-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  ) : null}
                </div>
              </div>
              {item.bodyMarkdown ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{item.bodyMarkdown}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="datetime-local"
                  className="h-9 max-w-[220px] rounded-lg border border-input bg-card px-2.5 text-sm"
                  defaultValue={item.scheduledAt ? item.scheduledAt.slice(0, 16) : ""}
                  onBlur={(event) => {
                    if (event.target.value) void onSchedule(item.id, event.target.value);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
