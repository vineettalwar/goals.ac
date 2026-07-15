import { cn } from "../cn";
import type { CmsIntegrationRow } from "./types";
import {
  getEspConnectionDetail,
  getEspDestinations,
  type EspPlatformId,
} from "./publishing-destinations";

export { countEspConnections } from "./publishing-destinations";

export function IntegrationsEspPanel({
  integrations,
  loading,
  error,
  saveMessage,
  saving,
  onDisconnect,
  onConnectPlatform,
  onTestPlatform,
  fullAppIntegrationsUrl,
}: {
  integrations: Record<string, CmsIntegrationRow>;
  loading: boolean;
  error: string | null;
  saveMessage: string | null;
  saving: boolean;
  onDisconnect: (platform: EspPlatformId) => void;
  onConnectPlatform: (platform: EspPlatformId) => void;
  onTestPlatform?: (platform: EspPlatformId) => void;
  fullAppIntegrationsUrl?: string;
}) {
  const destinations = getEspDestinations();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading email connections…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {fullAppIntegrationsUrl ? (
        <p className="text-xs text-muted-foreground">
          Publish email sequences from Content Studio. OAuth ESPs can be configured in{" "}
          <a
            href={fullAppIntegrationsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Integrations
          </a>
          .
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Publish email sequences from Content Studio.
        </p>
      )}

      {saveMessage ? (
        <p
          className={cn(
            "text-sm",
            saveMessage.toLowerCase().includes("fail") ? "text-red-700" : "text-muted-foreground",
          )}
        >
          {saveMessage}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {destinations.map((destination) => {
          const row = integrations[destination.integrationKey];
          const connected = destination.isConnected(integrations);
          const detail = getEspConnectionDetail(destination.id, row);
          const usesOAuth = destination.connectionMethods.includes("oauth");
          const fullAppOnly = destination.fullAppOnly || usesOAuth;

          return (
            <div
              key={destination.id}
              className="paper-card flex items-start justify-between gap-3 p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold">{destination.label}</p>
                <p className="text-xs text-muted-foreground">{destination.description}</p>
                <p className="text-xs text-muted-foreground">
                  {connected ? "Connected" : "Not connected"} · {destination.connectionMethodLabel}
                </p>
                {connected && detail ? (
                  <p className="truncate text-xs text-muted-foreground">{detail}</p>
                ) : null}
                {connected && typeof row?.apiKeyHint === "string" ? (
                  <p className="text-xs text-muted-foreground">Key …{row.apiKeyHint}</p>
                ) : null}
                {connected && typeof row?.apiSecretHint === "string" ? (
                  <p className="text-xs text-muted-foreground">Secret …{row.apiSecretHint}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-xs font-medium",
                    connected
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {connected ? "On" : "Off"}
                </span>

                {connected ? (
                  <div className="flex flex-col items-end gap-1">
                    {onTestPlatform ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onTestPlatform(destination.id)}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        Test
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onDisconnect(destination.id)}
                      className="text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : fullAppOnly && fullAppIntegrationsUrl ? (
                  <a
                    href={fullAppIntegrationsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 rounded-lg border border-border px-3 text-xs font-medium leading-8 hover:bg-secondary"
                  >
                    Configure in Integrations
                  </a>
                ) : fullAppOnly ? (
                  <span className="text-xs text-muted-foreground">OAuth setup required</span>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onConnectPlatform(destination.id)}
                    className="h-8 rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
