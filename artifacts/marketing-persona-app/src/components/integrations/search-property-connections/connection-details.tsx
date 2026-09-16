"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Link2, Unlink, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  SearchPropertyConnectionStatus,
  SearchPropertyConnectionsResponse,
} from "@/lib/integrations/search/search-property-types";
import { notifyGscSyncResult } from "@/lib/integrations/search/gsc-sync-result";
import { PROVIDER_META, isOAuthReady } from "./constants";
import { PropertyPicker } from "./property-picker";

export function ConnectionDetails({
  connection,
  projectId,
  oauthConfigured,
  onDisconnect,
  onRefresh,
  disconnecting,
  showPicker,
  gscSyncStatus,
}: {
  connection: SearchPropertyConnectionStatus;
  projectId: string;
  oauthConfigured: SearchPropertyConnectionsResponse["oauthConfigured"];
  onDisconnect: (provider: SearchPropertyConnectionStatus["provider"]) => void;
  onRefresh: () => void;
  disconnecting: string | null;
  showPicker: boolean;
  gscSyncStatus?: {
    lastSyncedAt: string | null;
    queryCount: number;
    lastSyncStatus: "ok" | "auth_error" | "error" | null;
    lastSyncError: string | null;
  } | null;
}) {
  const meta = PROVIDER_META[connection.provider];
  const oauthReady = isOAuthReady(connection.provider, oauthConfigured);
  const [syncingGsc, setSyncingGsc] = useState(false);

  function onConnect() {
    const returnUrl = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/api/auth/${meta.connectPath}?projectId=${projectId}&returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }

  async function onSyncGsc() {
    setSyncingGsc(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error ?? "GSC sync failed");
        return;
      }
      const data = await res.json();
      notifyGscSyncResult(data);
      onRefresh();
    } finally {
      setSyncingGsc(false);
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
          {connection.propertyVerified && connection.propertyUrl ? (
            <p>
              <span className="font-medium text-foreground">Property:</span> {connection.propertyUrl}
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
              Account linked — pick a verified property to finish setup.
            </p>
          ) : connection.propertyVerified ? (
            <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected and verified
            </p>
          ) : null}
          {connection.apiIngestionNote ? (
            <p className="text-xs">{connection.apiIngestionNote}</p>
          ) : null}
          {connection.provider === "google_search_console" &&
          connection.propertyVerified &&
          gscSyncStatus?.lastSyncStatus &&
          gscSyncStatus.lastSyncStatus !== "ok" ? (
            <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {gscSyncStatus.lastSyncStatus === "auth_error"
                  ? "Google stopped accepting this connection — reconnect to keep search data flowing."
                  : "The last sync failed. We'll retry automatically, but data may be stale."}
                {gscSyncStatus.lastSyncError ? (
                  <span className="block text-muted-foreground mt-0.5">
                    {gscSyncStatus.lastSyncError}
                  </span>
                ) : null}
              </span>
            </p>
          ) : null}
          {connection.provider === "google_search_console" &&
          connection.propertyVerified &&
          gscSyncStatus ? (
            <p className="text-xs">
              {gscSyncStatus.queryCount > 0
                ? `${gscSyncStatus.queryCount.toLocaleString()} queries indexed`
                : "No query data synced yet"}
              {gscSyncStatus.lastSyncedAt
                ? ` · Last sync ${new Date(gscSyncStatus.lastSyncedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {connection.connected && !connection.propertyVerified && showPicker ? (
        <PropertyPicker
          projectId={projectId}
          provider={connection.provider}
          shortLabel={meta.shortLabel}
          onSaved={onRefresh}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!connection.connected ? (
          <Button type="button" size="sm" onClick={onConnect} disabled={!oauthReady}>
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Connect {meta.shortLabel}
          </Button>
        ) : (
          <>
            {connection.propertyVerified && connection.aiReportUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a href={connection.aiReportUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open {connection.aiReportLabel}
                </a>
              </Button>
            ) : null}
            {connection.provider === "google_search_console" && connection.propertyVerified ? (
              <>
                <Button size="sm" variant="outline" onClick={onSyncGsc} disabled={syncingGsc}>
                  {syncingGsc ? <Spinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Sync queries
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/search/keywords">Keyword ideas</Link>
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
            {!connection.propertyVerified ||
            (connection.provider === "google_search_console" &&
              gscSyncStatus?.lastSyncStatus === "auth_error") ? (
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
