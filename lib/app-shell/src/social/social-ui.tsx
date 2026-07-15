import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  Loader2,
  Mic2,
  PenLine,
  RefreshCw,
  Settings2,
  Share2,
} from "lucide-react";
import { cn } from "../cn";
import { SectionTabs } from "../section-panels/shared";
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
  const [tab, setTab] = useState("queue");
  const studioHref = projectId ? `/studio?project=${projectId}` : "/studio";
  const integrationsHref = projectId ? `/integrations?project=${projectId}` : "/integrations";

  const tabs = [
    { id: "queue", label: "Queue", icon: <Clock className="h-3.5 w-3.5" /> },
    { id: "calendar", label: "Calendar", icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "compose", label: "Compose", icon: <PenLine className="h-3.5 w-3.5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "voice", label: "Voice", icon: <Mic2 className="h-3.5 w-3.5" /> },
    { id: "settings", label: "Settings", icon: <Settings2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <SectionTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "queue" ? (
        <QueuePanel
          queue={queue}
          queueLoading={queueLoading}
          queueError={queueError}
          platformFilter={platformFilter}
          onPlatformFilterChange={onPlatformFilterChange}
          onRefreshQueue={onRefreshQueue}
        />
      ) : null}

      {tab === "calendar" ? (
        <div className="paper-card p-5">
          <h3 className="text-sm font-semibold">Publishing calendar</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {queue.filter((item) => item.scheduledAt).length} scheduled posts in queue.
          </p>
          <div className="mt-4 space-y-2">
            {queue
              .filter((item) => item.scheduledAt)
              .slice(0, 12)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatScheduledAt(item.scheduledAt)}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {tab === "compose" ? (
        <div className="paper-card p-6">
          <Share2 className="h-8 w-8 text-primary" />
          <h3 className="mt-3 text-sm font-semibold">Compose social posts</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create LinkedIn, X, and Instagram variants in Content Studio, then queue them here.
          </p>
          {renderLink({
            href: studioHref,
            className: "mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground",
            children: "Open Content Studio",
          })}
        </div>
      ) : null}

      {tab === "analytics" ? (
        <MetricsPanel metrics={metrics} metricsLoading={metricsLoading} />
      ) : null}

      {tab === "voice" ? (
        <div className="paper-card p-6">
          <Mic2 className="h-8 w-8 text-violet-600" />
          <h3 className="mt-3 text-sm font-semibold">Platform voice</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Train tone per channel by syncing OAuth-connected accounts or importing sample posts.
          </p>
          {renderLink({
            href: integrationsHref,
            className: "mt-4 inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-secondary",
            children: "Connect social accounts",
          })}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="paper-card p-6">
          <Settings2 className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">Social settings</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Default platforms, approval workflow, and autopilot cadence are configured per project.
          </p>
          {projectId
            ? renderLink({
                href: `/projects/${projectId}`,
                className: "mt-4 inline-flex text-sm font-medium text-primary hover:underline",
                children: "Open project settings",
              })
            : null}
        </div>
      ) : null}
    </div>
  );
}

function QueuePanel({
  queue,
  queueLoading,
  queueError,
  platformFilter,
  onPlatformFilterChange,
  onRefreshQueue,
}: {
  queue: SocialQueueItem[];
  queueLoading: boolean;
  queueError: string | null;
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  onRefreshQueue: () => void;
}) {
  return (
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
  );
}

function MetricsPanel({
  metrics,
  metricsLoading,
}: {
  metrics: SocialMetricsResponse | null;
  metricsLoading: boolean;
}) {
  return (
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
  );
}
