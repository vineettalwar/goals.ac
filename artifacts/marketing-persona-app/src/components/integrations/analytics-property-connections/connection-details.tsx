"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Link2, Unlink, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  AnalyticsPropertyConnectionStatus,
  AnalyticsPropertyConnectionsResponse,
  AnalyticsPropertyProvider,
  Ga4SyncStatus,
} from "@/lib/integrations/analytics/analytics-property-types";
import { PROVIDER_META, ga4ConsoleUrl } from "./constants";
import { PropertyPicker } from "./property-picker";

export function ConnectionDetails({
  connection,
  projectId,
  oauthConfigured,
  onDisconnect,
  onRefresh,
  disconnecting,
  showPicker,
  ga4SyncStatus,
}: {
  connection: AnalyticsPropertyConnectionStatus;
  projectId: string;
  oauthConfigured: AnalyticsPropertyConnectionsResponse["oauthConfigured"];
  onDisconnect: (provider: AnalyticsPropertyProvider) => void;
  onRefresh: () => void;
  disconnecting: string | null;
  showPicker: boolean;
  ga4SyncStatus?: Ga4SyncStatus | null;
}) {
  const meta = PROVIDER_META[connection.provider];
  const oauthReady = oauthConfigured.googleAnalytics4;
  const [syncingGa4, setSyncingGa4] = useState(false);

  function onConnect() {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/api/auth/google-analytics?projectId=${projectId}&returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }

  async function onSyncGa4() {
    setSyncingGa4(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/analytics-properties/ga4/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error ?? "GA4 sync failed");
        return;
      }
      const data = await res.json();
      toast.success(`Synced ${data.rowsUpserted ?? 0} page metric rows`);
      onRefresh();
    } finally {
      setSyncingGa4(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{meta.label}</h3>
        <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
      </div>

      {connection.connected ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          {connection.propertyVerified && connection.propertyName ? (
            <p>
              <span className="font-medium text-foreground">Property:</span> {connection.propertyName}
              {connection.propertyId ? ` (${connection.propertyId})` : ""}
            </p>
          ) : null}
          {connection.accountEmail ? (
            <p>
              <span className="font-medium text-foreground">Account:</span> {connection.accountEmail}
            </p>
          ) : null}
          {connection.connected && !connection.propertyVerified ? (
            <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              Account linked — pick a GA4 property to finish setup.
            </p>
          ) : connection.propertyVerified ? (
            <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected and verified
            </p>
          ) : null}
          {connection.propertyVerified &&
          ga4SyncStatus?.lastSyncStatus &&
          ga4SyncStatus.lastSyncStatus !== "ok" ? (
            <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {ga4SyncStatus.lastSyncStatus === "auth_error"
                  ? "Google stopped accepting this connection — reconnect to keep analytics data flowing."
                  : "The last sync failed. We'll retry automatically, but data may be stale."}
                {ga4SyncStatus.lastSyncError ? (
                  <span className="block text-muted-foreground mt-0.5">{ga4SyncStatus.lastSyncError}</span>
                ) : null}
              </span>
            </p>
          ) : null}
          {connection.propertyVerified && ga4SyncStatus ? (
            <p className="text-xs">
              {ga4SyncStatus.pageCount > 0
                ? `${ga4SyncStatus.pageCount.toLocaleString()} page paths indexed`
                : "No page metrics synced yet"}
              {ga4SyncStatus.lastSyncedAt
                ? ` · Last sync ${new Date(ga4SyncStatus.lastSyncedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {connection.connected && !connection.propertyVerified && showPicker ? (
        <PropertyPicker projectId={projectId} shortLabel={meta.shortLabel} onSaved={onRefresh} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!connection.connected ? (
          <Button type="button" size="sm" onClick={onConnect} disabled={!oauthReady}>
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Connect {meta.shortLabel}
          </Button>
        ) : (
          <>
            {connection.propertyVerified ? (
              <>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={ga4ConsoleUrl(connection.propertyId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open GA4
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={onSyncGa4} disabled={syncingGa4}>
                  {syncingGa4 ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Sync metrics
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/search/performance">Article performance</Link>
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDisconnect(connection.provider)}
              disabled={disconnecting === connection.provider}
              className="text-destructive hover:text-destructive"
            >
              {disconnecting === connection.provider ? (
                <Spinner size="sm" />
              ) : (
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
              )}
              Disconnect
            </Button>
            {!connection.propertyVerified || ga4SyncStatus?.lastSyncStatus === "auth_error" ? (
              <Button type="button" size="sm" variant="outline" onClick={onConnect}>
                Reconnect account
              </Button>
            ) : null}
          </>
        )}
        {!oauthReady ? (
          <span className="text-xs text-muted-foreground">OAuth not configured.</span>
        ) : null}
      </div>
    </div>
  );
}
