import { cn } from "../cn";

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

export function IntegrationsSearchPanel({
  projectId,
  data,
  loading,
  error,
  appOrigin,
  fullAppIntegrationsUrl = "http://localhost:3001/integrations",
}: {
  projectId: string;
  data: SearchPropertyConnectionsResponse | null;
  loading: boolean;
  error: string | null;
  /** Origin for OAuth start URLs (Next.js product app). */
  appOrigin: string;
  fullAppIntegrationsUrl?: string;
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
      <p className="text-xs text-muted-foreground">
        Property selection, disconnect, and query sync are available in the full product app at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{fullAppIntegrationsUrl}</code>
        .
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.connections.map((connection) => {
          const meta = PROVIDER_META[connection.provider];
          const oauthReady = isOAuthReady(connection.provider, data.oauthConfigured);
          const verified = connection.connected && connection.propertyVerified;
          const pending = connection.connected && !connection.propertyVerified;
          const connectHref = `${appOrigin.replace(/\/+$/, "")}/api/auth/${meta.connectPath}?projectId=${encodeURIComponent(projectId)}`;

          return (
            <div
              key={connection.provider}
              className="paper-card flex flex-col justify-between gap-3 p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{meta.label}</p>
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
                  <p className="text-xs text-amber-700">Account linked — pick a verified property in the full app.</p>
                ) : null}
                {connection.apiIngestionNote ? (
                  <p className="text-xs text-muted-foreground">{connection.apiIngestionNote}</p>
                ) : null}
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
                    <span className="text-xs text-muted-foreground">OAuth not configured on this deployment.</span>
                  )
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

                {pending && oauthReady ? (
                  <a
                    href={connectHref}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Finish setup in full app
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
