import type { ReactNode } from "react";
import { Loader2, RefreshCw, Share2 } from "lucide-react";
import { cn } from "../cn";
import type { SocialMetricsResponse, SocialQueueItem } from "./types";
import { SOCIAL_PLATFORM_OPTIONS } from "./types";

export type SocialHubLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

function formatPlatformLabel(platform: string | null): string {
  if (!platform) return "—";
  const match = SOCIAL_PLATFORM_OPTIONS.find((option) => option.id === platform);
  return match?.label ?? platform;
}

function formatScheduledAt(value: string | null): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetric(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "approved" || value === "published"
      ? "bg-primary/10 text-primary"
      : value === "pending_review"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function SocialHubView({
  projectId,
  renderLink,
  queue,
  queueLoading,
  queueError,
  platformFilter,
  onPlatformFilterChange,
  onRefreshQueue,
  metrics,
  metricsLoading,
}: {
  projectId?: string | null;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
  queue: SocialQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  onRefreshQueue: () => void;
  metrics: SocialMetricsResponse | null;
  metricsLoading: boolean;
}) {
  const studioHref = projectId ? `/studio?project=${projectId}` : "/studio";

  return (
    <div className="space-y-4">
      <div className="paper-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Social publishing</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Schedule and publish social variants from content pieces. Queue management write APIs are
          rolling out on the edge worker.
        </p>
        <div className="mt-4">
          {renderLink({
            href: studioHref,
            className:
              "inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground",
            children: "Open content studio",
          })}
        </div>
      </div>

      <div className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Posting queue</h3>
            <p className="text-xs text-muted-foreground">Scheduled and draft social posts</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by platform"
              className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm"
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
              onClick={() => void onRefreshQueue()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-sm hover:bg-muted/50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", queueLoading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {queueError ? (
          <div className="px-4 py-8 text-sm text-destructive">{queueError}</div>
        ) : queueLoading && queue.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading queue…
          </div>
        ) : queue.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No social posts in the queue yet. Create LinkedIn, X, or Instagram posts in Content Studio,
            then schedule them here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Platform</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatPlatformLabel(item.platform)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={item.approvalStatus || item.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatScheduledAt(item.scheduledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="paper-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Performance (30 days)</h3>
          <p className="text-xs text-muted-foreground">Published posts with synced metrics</p>
        </div>
        {metricsLoading && !metrics ? (
          <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading metrics…
          </div>
        ) : !metrics || metrics.rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            No published social posts with metrics yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-4 sm:grid-cols-5">
              {(
                [
                  ["Impressions", metrics.totals.impressions],
                  ["Likes", metrics.totals.likes],
                  ["Comments", metrics.totals.comments],
                  ["Shares", metrics.totals.shares],
                  ["Clicks", metrics.totals.clicks],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Title</th>
                    <th className="px-4 py-2.5 font-medium">Platform</th>
                    <th className="px-4 py-2.5 font-medium">Impressions</th>
                    <th className="px-4 py-2.5 font-medium">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.rows.slice(0, 10).map((row) => (
                    <tr key={row.contentPieceId} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{row.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPlatformLabel(row.platform)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatMetric(row.impressions)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {(
                          (row.likes ?? 0) +
                          (row.comments ?? 0) +
                          (row.shares ?? 0)
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
