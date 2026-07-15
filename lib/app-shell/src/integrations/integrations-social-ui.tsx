import { useState } from "react";
import { cn } from "../cn";
import type { CmsIntegrationRow } from "./types";
import {
  countSocialConnections,
  getSocialDestinations,
  type SocialDestinationDefinition,
} from "./publishing-destinations";

export { countSocialConnections };

function buildConnectHref(
  appOrigin: string,
  projectId: string,
  destination: SocialDestinationDefinition,
  options?: { handle?: string; instance?: string },
): string | null {
  const origin = appOrigin.replace(/\/+$/, "");
  const params = new URLSearchParams({ projectId });
  if (destination.oauthHandleParam) {
    const handle = options?.handle?.trim();
    if (!handle) return null;
    params.set("handle", handle);
  }
  if (destination.oauthInstanceParam) {
    const instance = options?.instance?.trim();
    if (!instance) return null;
    params.set("instance", instance);
  }
  return `${origin}/api/auth/${destination.oauthPath}?${params.toString()}`;
}

export function IntegrationsSocialPanel({
  projectId,
  integrations,
  loading,
  error,
  appOrigin,
  saving,
  onDisconnect,
  fullAppIntegrationsUrl = "http://localhost:3001/integrations",
}: {
  projectId: string;
  integrations: Record<string, CmsIntegrationRow>;
  loading: boolean;
  error: string | null;
  appOrigin: string;
  saving?: boolean;
  onDisconnect?: (integrationKey: string) => void;
  fullAppIntegrationsUrl?: string;
}) {
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [mastodonInstance, setMastodonInstance] = useState("");
  const destinations = getSocialDestinations();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading social connections…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        OAuth sign-in opens the product app. Page selection for Meta and advanced disconnect
        options are available in the full app at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{fullAppIntegrationsUrl}</code>
        .
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {destinations.map((destination) => {
          const connected = destination.isConnected(integrations);
          const summary = destination.connectionSummary(integrations);
          const connectHref = connected
            ? null
            : buildConnectHref(appOrigin, projectId, destination, {
                handle: blueskyHandle,
                instance: mastodonInstance,
              });

          return (
            <div
              key={destination.id}
              className="paper-card flex flex-col justify-between gap-3 p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{destination.label}</p>
                <p className="text-xs text-muted-foreground">{destination.description}</p>
                {summary ? (
                  <p className="truncate text-xs text-muted-foreground">
                    Account: <span className="text-foreground">{summary}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <span
                  className={cn(
                    "w-fit rounded-full px-2 py-1 text-xs font-medium",
                    connected
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {connected ? "Connected" : "Not connected"}
                </span>

                {!connected && destination.oauthHandleParam ? (
                  <label className="block text-xs">
                    <span className="mb-1 block text-muted-foreground">Bluesky handle</span>
                    <input
                      type="text"
                      value={blueskyHandle}
                      onChange={(event) => setBlueskyHandle(event.target.value)}
                      placeholder="you.bsky.social"
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                ) : null}

                {!connected && destination.oauthInstanceParam ? (
                  <label className="block text-xs">
                    <span className="mb-1 block text-muted-foreground">Mastodon instance</span>
                    <input
                      type="url"
                      value={mastodonInstance}
                      onChange={(event) => setMastodonInstance(event.target.value)}
                      placeholder="https://mastodon.social"
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {!connected && connectHref ? (
                    <a
                      href={connectHref}
                      className="h-8 rounded-lg border border-border px-3 text-xs font-medium leading-8 hover:bg-secondary"
                    >
                      Connect {destination.label}
                    </a>
                  ) : null}

                  {!connected &&
                  !connectHref &&
                  (destination.oauthHandleParam || destination.oauthInstanceParam) ? (
                    <span className="text-xs text-muted-foreground">
                      Enter {destination.oauthHandleParam ? "your handle" : "your instance"} to
                      connect.
                    </span>
                  ) : null}

                  {connected ? (
                    onDisconnect ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDisconnect(destination.integrationKey)}
                        className="text-xs text-red-700 hover:underline disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Disconnect in the full product app.
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
