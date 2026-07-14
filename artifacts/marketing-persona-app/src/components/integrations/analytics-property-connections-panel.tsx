"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart3, CheckCircle2, ExternalLink, Link2, Unlink, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  IntegrationCategorySection,
  IntegrationIconBox,
  IntegrationTile,
  IntegrationCategorySkeleton,
} from "@/components/integrations/integration-tile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AnalyticsPropertyConnectionStatus,
  AnalyticsPropertyConnectionsResponse,
  AnalyticsPropertyProvider,
  AvailableAnalyticsPropertiesResponse,
  Ga4SyncStatus,
} from "@/lib/integrations/analytics/analytics-property-types";

const PROVIDER_META = {
  google_analytics_4: {
    label: "Google Analytics 4",
    shortLabel: "GA4",
    description: "Sessions, pageviews, and engagement for published content.",
    icon: <BarChart3 className="h-4 w-4 text-orange-600" />,
  },
} as const;

export const ANALYTICS_INTEGRATIONS_COUNT = 1;

function ga4ConsoleUrl(propertyId: string | null): string {
  if (!propertyId) return "https://analytics.google.com/";
  const numericId = propertyId.replace(/^properties\//, "");
  return `https://analytics.google.com/analytics/web/#/p${numericId}/reports/intelligenthome`;
}

function PropertyPicker({
  projectId,
  shortLabel,
  onSaved,
}: {
  projectId: string;
  shortLabel: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableAnalyticsPropertiesResponse | null>(null);
  const [selected, setSelected] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/analytics-properties/available`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Could not load GA4 properties from your account.");
        return;
      }
      const data = (await res.json()) as AvailableAnalyticsPropertiesResponse;
      setAvailable(data);
      const recommended = data.properties.find((p) => p.recommended);
      setSelected(recommended?.propertyId ?? data.properties[0]?.propertyId ?? "");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!selected) return;
    const property = available?.properties.find((p) => p.propertyId === selected);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/analytics-properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selected,
          streamId: property?.streamId ?? undefined,
        }),
      });
      if (!res.ok) {
        setError("Failed to save property selection.");
        return;
      }
      toast.success(`${shortLabel} property linked`);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner size="sm" /> Loading GA4 properties…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!available?.properties.length) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        No GA4 properties found on this account. Create a GA4 property for your site, then reconnect.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
      <div>
        <p className="text-xs font-medium text-foreground">Choose a property</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We couldn&apos;t auto-match <span className="font-medium">{available.projectUrl}</span>. Pick
          the GA4 property that belongs to this project.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ga4-property" className="text-xs">
          GA4 property
        </Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="ga4-property" className="h-9 text-xs">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {available.properties.map((property) => (
              <SelectItem key={property.propertyId} value={property.propertyId} className="text-xs">
                <span className="flex items-center gap-2">
                  <span>{property.label}</span>
                  {property.recommended ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Recommended</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected ? (
          <p className="text-[11px] text-muted-foreground break-all">
            {available.properties.find((p) => p.propertyId === selected)?.propertyName ?? selected}
          </p>
        ) : null}
      </div>
      <Button size="sm" onClick={onSave} disabled={!selected || saving}>
        {saving ? <Spinner size="sm" /> : null}
        {saving ? "Saving…" : "Use this property"}
      </Button>
    </div>
  );
}

function ConnectionDetails({
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
    window.location.href = `/api/auth/google-analytics?projectId=${projectId}`;
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
          <Button size="sm" onClick={onConnect} disabled={!oauthReady}>
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
            {!connection.propertyVerified ? (
              <Button size="sm" variant="outline" onClick={onConnect}>
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

export function AnalyticsPropertyConnectionsPanel({
  projectId,
  embedded = false,
  layout = "grid",
}: {
  projectId: string;
  embedded?: boolean;
  layout?: "grid" | "cards";
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AnalyticsPropertyConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<AnalyticsPropertyProvider | null>(null);
  const [ga4SyncStatus, setGa4SyncStatus] = useState<Ga4SyncStatus | null>(null);

  const load = useCallback(async () => {
    const [propsRes, ga4Res] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/analytics-properties`),
      fetch(`/api/website-projects/${projectId}/analytics-properties/ga4/sync`),
    ]);
    if (propsRes.ok) setData(await propsRes.json());
    if (ga4Res.ok) setGa4SyncStatus(await ga4Res.json());
  }, [projectId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const ga4 = searchParams.get("ga4");

    if (ga4 === "connected") toast.success("Google Analytics 4 connected");
    if (ga4 === "pick_property") {
      toast.message("Google account connected — choose a GA4 property");
      setActiveProvider("google_analytics_4");
    }
    if (ga4 === "no_properties") {
      toast.warning("Google account connected, but no GA4 properties were found");
    }
    if (ga4 === "error") toast.error("Google Analytics connection failed");

    if (ga4) void load();
  }, [searchParams, load]);

  async function onDisconnect(provider: AnalyticsPropertyProvider) {
    setDisconnecting(provider);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/analytics-properties?provider=${provider}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error("Failed to disconnect");
        return;
      }
      toast.success("Disconnected");
      setActiveProvider(null);
      await load();
    } finally {
      setDisconnecting(null);
    }
  }

  async function onRefresh() {
    await load();
    setActiveProvider(null);
  }

  if (loading) {
    return (
      <IntegrationCategorySkeleton
        tileCount={ANALYTICS_INTEGRATIONS_COUNT}
        compact={embedded}
      />
    );
  }

  if (!data) return null;

  const connectedCount = data.connections.filter((c) => c.connected && c.propertyVerified).length;

  const activeConnection = activeProvider
    ? data.connections.find((c) => c.provider === activeProvider)
    : null;

  if (layout === "cards") {
    return (
      <section className="space-y-4">
        {!embedded ? (
          <div>
            <h2 className="font-semibold text-sm">Web analytics</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connect GA4 to measure sessions and engagement on published content.
            </p>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {data.connections.map((connection) => (
            <div key={connection.provider} className="rounded-xl border p-5 space-y-3">
              <ConnectionDetails
                connection={connection}
                projectId={projectId}
                oauthConfigured={data.oauthConfigured}
                onDisconnect={onDisconnect}
                onRefresh={onRefresh}
                disconnecting={disconnecting}
                showPicker={connection.connected && !connection.propertyVerified}
                ga4SyncStatus={ga4SyncStatus}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <IntegrationCategorySection
        title="Web analytics"
        description="Measure sessions, pageviews, and engagement from Google Analytics 4."
        connectedCount={connectedCount}
        totalCount={ANALYTICS_INTEGRATIONS_COUNT}
        compact={embedded}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {data.connections.map((connection) => {
            const meta = PROVIDER_META[connection.provider];
            const connected = connection.connected && connection.propertyVerified;
            const pending = connection.connected && !connection.propertyVerified;

            return (
              <IntegrationTile
                key={connection.provider}
                icon={<IntegrationIconBox>{meta.icon}</IntegrationIconBox>}
                title={meta.label}
                description={meta.description}
                connected={connected || pending}
                pending={pending}
                summary={
                  connected
                    ? connection.propertyName ?? connection.accountEmail
                    : pending
                      ? "Pick a GA4 property"
                      : null
                }
                onClick={() => setActiveProvider(connection.provider)}
              />
            );
          })}
        </div>
      </IntegrationCategorySection>

      <Dialog open={activeProvider != null} onOpenChange={(open) => !open && setActiveProvider(null)}>
        <DialogContent className="max-w-xl gap-0 overflow-y-auto p-0 sm:max-w-lg max-h-[88vh]">
          <DialogTitle className="sr-only">
            {activeConnection ? PROVIDER_META[activeConnection.provider].label : "Connection settings"}
          </DialogTitle>
          <div className="p-6">
            {activeConnection ? (
              <ConnectionDetails
                connection={activeConnection}
                projectId={projectId}
                oauthConfigured={data.oauthConfigured}
                onDisconnect={onDisconnect}
                onRefresh={onRefresh}
                disconnecting={disconnecting}
                showPicker={activeConnection.connected && !activeConnection.propertyVerified}
                ga4SyncStatus={ga4SyncStatus}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
