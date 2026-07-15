import { useCallback, useEffect, useState } from "react";
import { cn } from "../cn";
import { IntegrationIconBox, SearchProviderIcon } from "./integration-icons";

export type SearchPropertyProvider = "google_search_console" | "bing_webmaster";

export type SearchPropertyConnectionStatus = {
  provider: SearchPropertyProvider;
  connected: boolean;
  propertyUrl: string | null;
  propertyVerified: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
  aiReportUrl: string | null;
  aiReportLabel: string;
  aiReportAvailable: boolean;
  apiIngestionNote: string;
};

export type SearchPropertyConnectionsResponse = {
  connections: SearchPropertyConnectionStatus[];
  oauthConfigured: {
    googleSearchConsole: boolean;
    bingWebmaster: boolean;
  };
};

export type AvailableSearchProperty = {
  propertyUrl: string;
  label: string;
  recommended: boolean;
};

export type AvailableSearchPropertiesResponse = {
  properties: AvailableSearchProperty[];
  projectUrl: string;
};

const PROVIDER_META = {
  google_search_console: {
    label: "Google Search Console",
    shortLabel: "Search Console",
    connectPath: "google-search-console",
    description: "AI Overview and AI Mode impressions from Google.",
  },
  bing_webmaster: {
    label: "Bing Webmaster Tools",
    shortLabel: "Bing Webmaster",
    connectPath: "bing-webmaster",
    description: "Citation counts from Copilot and Bing AI summaries.",
  },
} as const;

function isOAuthReady(
  provider: SearchPropertyProvider,
  oauthConfigured: SearchPropertyConnectionsResponse["oauthConfigured"],
): boolean {
  return provider === "google_search_console"
    ? oauthConfigured.googleSearchConsole
    : oauthConfigured.bingWebmaster;
}

function searchConnectedCount(data: SearchPropertyConnectionsResponse | null): number {
  if (!data) return 0;
  return data.connections.filter((row) => row.connected && row.propertyVerified).length;
}

export { searchConnectedCount };

function PropertyPicker({
  projectId,
  provider,
  shortLabel,
  apiBase,
  saving,
  onSelectProperty,
}: {
  projectId: string;
  provider: SearchPropertyProvider;
  shortLabel: string;
  apiBase: string;
  saving?: boolean;
  onSelectProperty: (provider: SearchPropertyProvider, propertyUrl: string) => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableSearchPropertiesResponse | null>(null);
  const [selected, setSelected] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = apiBase.replace(/\/+$/, "");
      const res = await fetch(
        `${base}/api/website-projects/${projectId}/search-properties/available?provider=${provider}`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        setError("Could not load verified properties from your account.");
        return;
      }
      const data = (await res.json()) as AvailableSearchPropertiesResponse;
      setAvailable(data);
      const recommended = data.properties.find((property) => property.recommended);
      setSelected(recommended?.propertyUrl ?? data.properties[0]?.propertyUrl ?? "");
    } catch {
      setError("Could not load verified properties from your account.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, projectId, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading verified properties…</p>;
  }

  if (error) {
    return <p className="text-xs text-red-700">{error}</p>;
  }

  if (!available?.properties.length) {
    return (
      <p className="text-xs text-amber-700">
        No verified properties found on this account. Add and verify your site in {shortLabel}, then
        reconnect.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 p-3">
      <div>
        <p className="text-xs font-medium text-foreground">Choose a property</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          We couldn&apos;t auto-match{" "}
          <span className="font-medium">{available.projectUrl}</span>. Pick the verified property that
          belongs to this project.
        </p>
      </div>
      <label className="block text-xs">
        <span className="mb-1 block text-muted-foreground">Verified property</span>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
        >
          {available.properties.map((property) => (
            <option key={property.propertyUrl} value={property.propertyUrl}>
              {property.label}
              {property.recommended ? " (Recommended)" : ""}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="break-all text-[11px] text-muted-foreground">{selected}</p>
      ) : null}
      <button
        type="button"
        disabled={!selected || saving}
        onClick={() => void onSelectProperty(provider, selected)}
        className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Use this property"}
      </button>
    </div>
  );
}

export function IntegrationsSearchPanel({
  projectId,
  data,
  loading,
  error,
  apiBase,
  saving,
  disconnectingProvider,
  syncingGsc,
  onDisconnect,
  onSyncGsc,
  onSelectProperty,
  onRefresh,
}: {
  projectId: string;
  data: SearchPropertyConnectionsResponse | null;
  loading: boolean;
  error: string | null;
  /** API origin for OAuth start URLs (api.goals.ac). */
  apiBase: string;
  saving?: boolean;
  disconnectingProvider?: SearchPropertyProvider | null;
  syncingGsc?: boolean;
  onDisconnect?: (provider: SearchPropertyProvider) => void | Promise<void>;
  onSyncGsc?: () => void | Promise<void>;
  onSelectProperty?: (provider: SearchPropertyProvider, propertyUrl: string) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading search connections…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return (
      <div className="paper-card p-8 text-center text-sm text-muted-foreground">
        Search connection status is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {data.connections.map((connection) => {
          const meta = PROVIDER_META[connection.provider];
          const oauthReady = isOAuthReady(connection.provider, data.oauthConfigured);
          const verified = connection.connected && connection.propertyVerified;
          const pending = connection.connected && !connection.propertyVerified;
          const connectHref = `${apiBase.replace(/\/+$/, "")}/api/auth/${meta.connectPath}?projectId=${encodeURIComponent(projectId)}`;
          const disconnecting = disconnectingProvider === connection.provider;

          return (
            <div
              key={connection.provider}
              className={cn(
                "paper-card flex flex-col gap-3 p-4 transition-colors",
                verified && "border-emerald-500/25 bg-emerald-500/3",
                pending && "border-amber-500/25 bg-amber-500/3",
              )}
            >
              <div className="flex items-start gap-3">
                <IntegrationIconBox>
                  <SearchProviderIcon provider={connection.provider} />
                </IntegrationIconBox>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{meta.label}</p>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        verified && "bg-emerald-500",
                        pending && "bg-amber-500",
                        !connection.connected && "bg-muted-foreground/25",
                      )}
                      aria-hidden
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                {verified && connection.propertyUrl ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Property: <span className="text-foreground">{connection.propertyUrl}</span>
                  </p>
                ) : null}
                {connection.accountEmail ? (
                  <p className="text-xs text-muted-foreground">
                    Account: <span className="text-foreground">{connection.accountEmail}</span>
                  </p>
                ) : null}
                {pending ? (
                  <p className="text-xs text-amber-700">
                    Account linked — pick a verified property below.
                  </p>
                ) : null}
                {connection.apiIngestionNote ? (
                  <p className="text-xs text-muted-foreground">{connection.apiIngestionNote}</p>
                ) : null}

                {pending && onSelectProperty ? (
                  <PropertyPicker
                    projectId={projectId}
                    provider={connection.provider}
                    shortLabel={meta.shortLabel}
                    apiBase={apiBase}
                    saving={saving}
                    onSelectProperty={async (provider, propertyUrl) => {
                      await onSelectProperty(provider, propertyUrl);
                      await onRefresh?.();
                    }}
                  />
                ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-xs font-medium",
                    verified
                      ? "bg-emerald-50 text-emerald-800"
                      : pending
                        ? "bg-amber-50 text-amber-800"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {verified ? "Connected" : pending ? "Pending" : "Not connected"}
                </span>

                {!connection.connected ? (
                  oauthReady ? (
                    <a
                      href={connectHref}
                      className="h-8 rounded-lg border border-border px-3 text-xs font-medium leading-8 hover:bg-secondary"
                    >
                      Connect {meta.shortLabel}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      OAuth not configured on this deployment.
                    </span>
                  )
                ) : null}

                {verified && connection.provider === "google_search_console" && onSyncGsc ? (
                  <button
                    type="button"
                    disabled={Boolean(saving || syncingGsc)}
                    onClick={() => void onSyncGsc()}
                    className="h-8 rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    {syncingGsc ? "Syncing…" : "Sync GSC queries"}
                  </button>
                ) : null}

                {connection.connected && onDisconnect ? (
                  <button
                    type="button"
                    disabled={Boolean(saving || disconnecting)}
                    onClick={() => void onDisconnect(connection.provider)}
                    className="h-8 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : null}

                {verified && connection.aiReportUrl ? (
                  <a
                    href={connection.aiReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open {connection.aiReportLabel}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
