import { useEffect, useState } from "react";
import { cn } from "../cn";
import type { CmsIntegrationRow } from "./types";
import {
  countSocialConnections,
  getSocialDestinations,
  type SocialDestinationDefinition,
} from "./publishing-destinations";
import { IntegrationIconBox, SocialDestinationIcon } from "./integration-icons";
import { ConnectSetupSteps, getSocialSetupSteps } from "./connect-setup-steps";

export { countSocialConnections };

type MetaPageOption = {
  pageId: string;
  pageName: string;
  instagramAccountId?: string;
  instagramUsername?: string;
};

function buildConnectHref(
  apiBase: string,
  projectId: string,
  destination: SocialDestinationDefinition,
  options?: { handle?: string; instance?: string },
): string | null {
  const base = apiBase.replace(/\/+$/, "");
  if (!base) return null;
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
  return `${base}/api/auth/${destination.oauthPath}?${params.toString()}`;
}

function MetaPageSelectModal({
  apiBase,
  token,
  saving,
  onClose,
  onConnected,
}: {
  apiBase: string;
  token: string;
  saving?: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [pages, setPages] = useState<MetaPageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const base = apiBase.replace(/\/+$/, "");
    fetch(`${base}/api/auth/meta/pages?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to load Meta pages");
        }
        return res.json() as Promise<{ pages?: MetaPageOption[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setPages(data.pages ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load Meta pages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, token]);

  async function selectPage(pageId: string) {
    setSelecting(true);
    setError(null);
    try {
      const base = apiBase.replace(/\/+$/, "");
      const res = await fetch(`${base}/api/auth/meta/select-page`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pageId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to connect Meta page");
      }
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Meta page");
    } finally {
      setSelecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="paper-card w-full max-w-md space-y-4 p-5"
        role="dialog"
        aria-labelledby="meta-page-picker-title"
      >
        <div className="space-y-1">
          <h2 id="meta-page-picker-title" className="text-base font-semibold">
            Choose a Facebook Page
          </h2>
          <p className="text-xs text-muted-foreground">
            Select the page (and linked Instagram account) to publish from.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading pages…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pages found for this account.</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {pages.map((page) => (
              <li key={page.pageId}>
                <button
                  type="button"
                  disabled={saving || selecting}
                  onClick={() => void selectPage(page.pageId)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50"
                >
                  <span className="font-medium">{page.pageName}</span>
                  {page.instagramUsername ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Instagram @{page.instagramUsername}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={selecting}
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntegrationsSocialPanel({
  projectId,
  integrations,
  loading,
  error,
  apiBase,
  saving,
  onDisconnect,
  metaPageToken,
  onMetaPageConnected,
  oauthNotice,
}: {
  projectId: string;
  integrations: Record<string, CmsIntegrationRow>;
  loading: boolean;
  error: string | null;
  /** API origin for OAuth start routes (e.g. https://api.goals.ac or empty for dev proxy). */
  apiBase: string;
  saving?: boolean;
  onDisconnect?: (integrationKey: string) => void;
  /** Short-lived token from Meta OAuth callback (`meta=select_page`). */
  metaPageToken?: string | null;
  onMetaPageConnected?: () => void;
  oauthNotice?: string | null;
}) {
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [mastodonInstance, setMastodonInstance] = useState("");
  const [metaPickerOpen, setMetaPickerOpen] = useState(Boolean(metaPageToken));
  const destinations = getSocialDestinations();
  const resolvedApiBase = apiBase.replace(/\/+$/, "");

  useEffect(() => {
    if (metaPageToken) setMetaPickerOpen(true);
  }, [metaPageToken]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading social connections…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {oauthNotice ? (
        <p
          className={cn(
            "text-sm",
            oauthNotice.toLowerCase().includes("fail") ||
              oauthNotice.toLowerCase().includes("error") ||
              oauthNotice.toLowerCase().includes("no pages")
              ? "text-red-700"
              : "text-muted-foreground",
          )}
        >
          {oauthNotice}
        </p>
      ) : null}

      {!resolvedApiBase ? (
        <p className="text-xs text-muted-foreground">
          Set an API base URL to enable social OAuth connect links.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {destinations.map((destination) => {
          const row = integrations[destination.integrationKey];
          const connected = destination.isConnected(integrations);
          const accountSummary = destination.connectionSummary(integrations);
          const healthOk = row?.lastHealthOk;
          const summary = connected
            ? healthOk === true
              ? accountSummary
                ? `${accountSummary} · Healthy`
                : "Connected · Healthy"
              : healthOk === false
                ? accountSummary
                  ? `${accountSummary} · Failing`
                  : "Connected · Failing"
                : (accountSummary ?? "Connected")
            : null;
          const connectHref = connected
            ? null
            : buildConnectHref(resolvedApiBase, projectId, destination, {
                handle: blueskyHandle,
                instance: mastodonInstance,
              });

          return (
            <div
              key={destination.id}
              className={cn(
                "paper-card flex flex-col gap-3 p-4 transition-colors",
                connected && "border-emerald-500/25 bg-emerald-500/3",
              )}
            >
              <div className="flex items-start gap-3">
                <IntegrationIconBox>
                  <SocialDestinationIcon destination={destination} />
                </IntegrationIconBox>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{destination.label}</p>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        connected
                          ? healthOk === false
                            ? "bg-red-500"
                            : "bg-emerald-500"
                          : "bg-muted-foreground/25",
                      )}
                      aria-hidden
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary ?? destination.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span
                  className={cn(
                    "w-fit rounded-full px-2 py-1 text-xs font-medium",
                    connected
                      ? healthOk === false
                        ? "bg-red-50 text-red-800"
                        : "bg-emerald-50 text-emerald-800"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {connected
                    ? healthOk === true
                      ? "Healthy"
                      : healthOk === false
                        ? "Failing"
                        : "Connected"
                    : "Not connected"}
                </span>

                {!connected ? (
                  <ConnectSetupSteps steps={getSocialSetupSteps(destination.id)} />
                ) : null}

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

                  {connected && onDisconnect ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onDisconnect(destination.integrationKey)}
                      className="text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {metaPickerOpen && metaPageToken && resolvedApiBase ? (
        <MetaPageSelectModal
          apiBase={resolvedApiBase}
          token={metaPageToken}
          saving={saving}
          onClose={() => setMetaPickerOpen(false)}
          onConnected={() => {
            setMetaPickerOpen(false);
            onMetaPageConnected?.();
          }}
        />
      ) : null}
    </div>
  );
}
