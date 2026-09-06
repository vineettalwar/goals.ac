import type { ReactNode } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { SOCIAL_PLATFORM_OPTIONS, type SocialMetricsResponse } from "./types";
import type { SocialHubLinkProps } from "./social-queue-panel";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export function SocialAnalyticsPanel({
  metrics,
  metricsLoading,
  metricsPlatformFilter,
  onMetricsPlatformFilterChange,
  syncing,
  lastSyncedAt,
  pieceHref,
  integrationsHref,
  settingsHref,
  renderLink,
  onSync,
  onSyncMetrics,
}: {
  metrics: SocialMetricsResponse | null;
  metricsLoading: boolean;
  metricsPlatformFilter: string;
  onMetricsPlatformFilterChange: (value: string) => void;
  syncing: boolean;
  lastSyncedAt: string | null;
  pieceHref: (pieceId: number) => string;
  integrationsHref: string;
  /** Prefer Integrations → Social when set; falls back to `integrationsHref`. */
  settingsHref?: string;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
  onSync: () => void;
  /** Empty-state sync CTA; falls back to `onSync`. */
  onSyncMetrics?: () => void;
}) {
  const totals = metrics?.totals;
  const handleSyncMetrics = onSyncMetrics ?? onSync;
  const socialSettingsHref = settingsHref ?? integrationsHref;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter analytics by platform"
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
          value={metricsPlatformFilter}
          onChange={(event) => onMetricsPlatformFilterChange(event.target.value)}
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
          disabled={syncing}
          onClick={() => void onSync()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm hover:bg-muted/50 disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync metrics
        </button>
        {lastSyncedAt ? (
          <span className="text-xs text-muted-foreground">
            Last synced {new Date(lastSyncedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Impressions", value: totals?.impressions },
          { label: "Likes", value: totals?.likes },
          { label: "Comments", value: totals?.comments },
          { label: "Shares", value: totals?.shares },
        ].map((card) => (
          <div key={card.label} className="paper-card p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {metricsLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analytics…
        </div>
      ) : !metrics?.rows.length ? (
        <div className="paper-card space-y-3 px-4 py-10 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground opacity-40" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No metrics yet</p>
            <p className="text-sm text-muted-foreground">
              Metrics appear after posts publish and sync.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void handleSyncMetrics()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm hover:bg-muted/50 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync metrics
            </button>
            {renderLink({
              href: socialSettingsHref,
              className:
                "inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-secondary",
              children: "Integrations → Social",
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-160 text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Post</th>
                <th className="p-3 font-medium">Platform</th>
                <th className="p-3 text-right font-medium">Impr.</th>
                <th className="p-3 text-right font-medium">Likes</th>
                <th className="p-3 text-right font-medium">Comments</th>
                <th className="p-3 text-right font-medium">Shares</th>
                <th className="p-3 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rows.map((row) => (
                <tr key={`${row.contentPieceId}-${row.platform}`} className="border-t border-border">
                  <td className="p-3">
                    {renderLink({
                      href: pieceHref(row.contentPieceId),
                      className: "font-medium hover:underline",
                      children: row.title,
                    })}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs">
                      {row.platform}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.impressions)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.likes)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.comments)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.shares)}</td>
                  <td className="p-3 text-right tabular-nums">{fmt(row.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
