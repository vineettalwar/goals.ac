"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Link2, Search, Unlink, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AvailableSearchPropertiesResponse,
  SearchPropertyConnectionStatus,
  SearchPropertyConnectionsResponse,
  SearchPropertyProvider,
} from "@/lib/integrations/search/search-property-types";

const PROVIDER_META = {
  google_search_console: {
    label: "Google Search Console",
    shortLabel: "Search Console",
    connectPath: "google-search-console",
    description: "AI Overview and AI Mode impressions from Google.",
    icon: <Search className="h-4 w-4 text-blue-600" />,
  },
  bing_webmaster: {
    label: "Bing Webmaster Tools",
    shortLabel: "Bing Webmaster",
    connectPath: "bing-webmaster",
    description: "Citation counts from Copilot and Bing AI summaries.",
    icon: <Search className="h-4 w-4 text-teal-600" />,
  },
} as const;

export const SEARCH_INTEGRATIONS_COUNT = 2;

function isOAuthReady(
  provider: keyof typeof PROVIDER_META,
  oauthConfigured: SearchPropertyConnectionsResponse["oauthConfigured"],
) {
  return provider === "google_search_console"
    ? oauthConfigured.googleSearchConsole
    : oauthConfigured.bingWebmaster;
}

function PropertyPicker({
  projectId,
  provider,
  shortLabel,
  onSaved,
}: {
  projectId: string;
  provider: SearchPropertyProvider;
  shortLabel: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableSearchPropertiesResponse | null>(null);
  const [selected, setSelected] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/search-properties/available?provider=${provider}`,
        { method: "POST" },
      );
      if (!res.ok) {
        setError("Could not load verified properties from your account.");
        return;
      }
      const data = (await res.json()) as AvailableSearchPropertiesResponse;
      setAvailable(data);
      const recommended = data.properties.find((p) => p.recommended);
      setSelected(recommended?.propertyUrl ?? data.properties[0]?.propertyUrl ?? "");
    } finally {
      setLoading(false);
    }
  }, [projectId, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/search-properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, propertyUrl: selected }),
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
        <Spinner size="sm" /> Loading verified properties…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!available?.properties.length) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        No verified properties found on this account. Add and verify your site in {shortLabel}, then
        reconnect.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
      <div>
        <p className="text-xs font-medium text-foreground">Choose a property</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We couldn&apos;t auto-match <span className="font-medium">{available.projectUrl}</span>. Pick
          the verified property that belongs to this project.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`property-${provider}`} className="text-xs">
          Verified property
        </Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id={`property-${provider}`} className="h-9 text-xs">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {available.properties.map((property) => (
              <SelectItem key={property.propertyUrl} value={property.propertyUrl} className="text-xs">
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
          <p className="text-[11px] text-muted-foreground break-all">{selected}</p>
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
  } | null;
}) {
  const meta = PROVIDER_META[connection.provider];
  const oauthReady = isOAuthReady(connection.provider, oauthConfigured);
  const [syncingGsc, setSyncingGsc] = useState(false);

  function onConnect() {
    window.location.href = `/api/auth/${meta.connectPath}?projectId=${projectId}`;
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
      toast.success(
        `Synced ${data.rowsUpserted ?? 0} query rows · ${data.opportunitiesInserted ?? 0} new ideas`,
      );
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
          <Button size="sm" onClick={onConnect} disabled={!oauthReady}>
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

export function SearchPropertyConnectionsPanel({
  projectId,
  embedded = false,
  layout = "grid",
}: {
  projectId: string;
  embedded?: boolean;
  layout?: "grid" | "cards";
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SearchPropertyConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<SearchPropertyProvider | null>(null);
  const [gscSyncStatus, setGscSyncStatus] = useState<{
    lastSyncedAt: string | null;
    queryCount: number;
  } | null>(null);

  const load = useCallback(async () => {
    const [propsRes, gscRes] = await Promise.all([
      fetch(`/api/website-projects/${projectId}/search-properties`),
      fetch(`/api/website-projects/${projectId}/search-properties/gsc/sync`),
    ]);
    if (propsRes.ok) setData(await propsRes.json());
    if (gscRes.ok) {
      const status = await gscRes.json();
      setGscSyncStatus({
        lastSyncedAt: status.lastSyncedAt ?? null,
        queryCount: status.queryCount ?? 0,
      });
    }
  }, [projectId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const gsc = searchParams.get("gsc");
    const bing = searchParams.get("bing");

    if (gsc === "connected") toast.success("Google Search Console connected");
    if (gsc === "pick_property") {
      toast.message("Google account connected — choose a Search Console property");
      setActiveProvider("google_search_console");
    }
    if (gsc === "no_properties") {
      toast.warning("Google account connected, but no verified Search Console properties were found");
    }
    if (gsc === "property_not_found") {
      toast.warning("Google account connected, but no matching Search Console property was found");
    }
    if (gsc === "error") toast.error("Google Search Console connection failed");

    if (bing === "connected") toast.success("Bing Webmaster Tools connected");
    if (bing === "pick_property") {
      toast.message("Bing account connected — choose a verified site");
      setActiveProvider("bing_webmaster");
    }
    if (bing === "no_properties") {
      toast.warning("Bing account connected, but no verified sites were found");
    }
    if (bing === "property_not_found") {
      toast.warning("Bing account connected, but no matching verified site was found");
    }
    if (bing === "error") toast.error("Bing Webmaster connection failed");

    if (gsc || bing) void load();
  }, [searchParams, load]);

  async function onDisconnect(provider: SearchPropertyConnectionStatus["provider"]) {
    setDisconnecting(provider);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/search-properties?provider=${provider}`,
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
        tileCount={SEARCH_INTEGRATIONS_COUNT}
        compact={embedded}
      />
    );
  }

  if (!data) return null;

  const connectedCount = data.connections.filter(
    (c) => c.connected && c.propertyVerified,
  ).length;

  const activeConnection = activeProvider
    ? data.connections.find((c) => c.provider === activeProvider)
    : null;

  if (layout === "cards") {
    return (
      <section className="space-y-4">
        {!embedded ? (
          <div>
            <h2 className="font-semibold text-sm">Verified citation sources</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connect Search Console or Bing Webmaster for native AI citation reports.
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
                gscSyncStatus={gscSyncStatus}
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
        title="Search & AI citation"
        description="Track AI Overview and Copilot citations from search consoles."
        connectedCount={connectedCount}
        totalCount={SEARCH_INTEGRATIONS_COUNT}
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
                    ? connection.propertyUrl ?? connection.accountEmail
                    : pending
                      ? "Pick a verified property"
                      : null
                }
                onClick={() => setActiveProvider(connection.provider)}
              />
            );
          })}
        </div>
      </IntegrationCategorySection>

      <Dialog
        open={activeProvider != null}
        onOpenChange={(open) => !open && setActiveProvider(null)}
      >
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
                gscSyncStatus={gscSyncStatus}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
