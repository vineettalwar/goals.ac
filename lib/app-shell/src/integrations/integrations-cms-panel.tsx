import { cn } from "../cn";
import { isCmsConnectReady, DEFAULT_RELEASED_CMS_PLATFORMS } from "@workspace/content-engine/support/publishing/cms-platform-keys";
import {
  CMS_PLATFORMS,
  type CmsIntegrationRow,
} from "./types";
import { CmsPlatformIcon } from "./integration-icons";
import { IntegrationTile } from "./integration-tiles";

function CmsPlatformTiles({
  integrations,
  onConnectPlatform,
  releasedCmsPlatforms = DEFAULT_RELEASED_CMS_PLATFORMS,
}: {
  integrations: Record<string, CmsIntegrationRow>;
  onConnectPlatform: (platform: string) => void;
  releasedCmsPlatforms?: readonly string[];
}) {
  const tiles = [];
  for (const platform of CMS_PLATFORMS) {
    const { key, label, description, tierBadge } = platform;
    const row = integrations[key];
    const connected = Boolean(row?.connected);
    const healthOk = row?.lastHealthOk;
    const summary = connected
      ? healthOk === true
        ? "Connected · Healthy"
        : healthOk === false
          ? "Connected · Failing"
          : "Connected"
      : null;
    tiles.push(
      <IntegrationTile
        key={key}
        icon={<CmsPlatformIcon platform={platform} />}
        title={label}
        description={description}
        connected={connected}
        summary={summary}
        tierBadge={tierBadge}
        comingSoon={!isCmsConnectReady(key, releasedCmsPlatforms)}
        onClick={() => {
          if (connected || isCmsConnectReady(key, releasedCmsPlatforms)) onConnectPlatform(key);
        }}
      />,
    );
  }
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{tiles}</div>;
}

function CmsHealthStatusList({
  healthStatuses,
}: {
  healthStatuses: Array<{
    platform: string;
    connected: boolean;
    ok: boolean | null;
    error?: string;
  }>;
}) {
  const rows = [];
  for (const row of healthStatuses) {
    if (!row.connected) continue;
    rows.push(
      <li key={row.platform} className="rounded-lg border border-border px-3 py-2 text-xs">
        <span className="font-medium capitalize">{row.platform}</span>
        <span
          className={
            row.ok
              ? "ml-2 text-emerald-700"
              : row.ok === false
                ? "ml-2 text-red-700"
                : "ml-2 text-muted-foreground"
          }
        >
          {row.ok === true ? "Healthy" : row.ok === false ? "Failing" : "Unknown"}
        </span>
        {row.error ? <p className="mt-1 text-muted-foreground">{row.error}</p> : null}
      </li>,
    );
  }
  if (rows.length === 0) return null;
  return <ul className="grid gap-2 sm:grid-cols-2">{rows}</ul>;
}

function CmsConnectedActions({
  integrations,
  saving,
  onTestPlatform,
  onDisconnect,
}: {
  integrations: Record<string, CmsIntegrationRow>;
  saving: boolean;
  onTestPlatform?: (platform: string) => void;
  onDisconnect: (platform: string) => void;
}) {
  const cards = [];
  for (const { key, label } of CMS_PLATFORMS) {
    if (!integrations[key]?.connected) continue;
    cards.push(
      <div key={key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
        <span className="font-medium">{label}</span>
        {onTestPlatform ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => onTestPlatform(key)}
            className="text-primary hover:underline disabled:opacity-50"
          >
            Test
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => onDisconnect(key)}
          className="text-red-700 hover:underline disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>,
    );
  }
  return <div className="flex flex-wrap gap-2">{cards}</div>;
}

export function IntegrationsCmsPanel({
  integrations,
  integrationsLoading,
  loadError,
  saveMessage,
  saving,
  webhookUrl: _webhookUrl,
  webhookSecret: _webhookSecret,
  onWebhookUrlChange: _onWebhookUrlChange,
  onWebhookSecretChange: _onWebhookSecretChange,
  onSaveWebhook: _onSaveWebhook,
  onDisconnect,
  onConnectPlatform,
  onTestPlatform,
  onRunHealthCheck,
  healthCheckRunning,
  healthStatuses,
  releasedCmsPlatforms,
}: {
  integrations: Record<string, CmsIntegrationRow>;
  integrationsLoading: boolean;
  loadError: string | null;
  saveMessage: string | null;
  saving: boolean;
  webhookUrl: string;
  webhookSecret: string;
  onWebhookUrlChange: (value: string) => void;
  onWebhookSecretChange: (value: string) => void;
  onSaveWebhook: () => void;
  onDisconnect: (platform: string) => void;
  onConnectPlatform: (platform: string) => void;
  onTestPlatform?: (platform: string) => void;
  onRunHealthCheck?: () => void;
  healthCheckRunning?: boolean;
  healthStatuses?: Array<{
    platform: string;
    connected: boolean;
    ok: boolean | null;
    error?: string;
  }> | null;
  releasedCmsPlatforms?: readonly string[];
}) {
  return (
    <div className="space-y-6">
      {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}
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

      {integrationsLoading ? (
        <p className="text-sm text-muted-foreground">Loading integrations…</p>
      ) : (
        <CmsPlatformTiles
          integrations={integrations}
          onConnectPlatform={onConnectPlatform}
          releasedCmsPlatforms={releasedCmsPlatforms}
        />
      )}

      {!integrationsLoading &&
      CMS_PLATFORMS.some(({ key }) => integrations[key]?.connected) ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {onRunHealthCheck ? (
              <button
                type="button"
                disabled={saving || healthCheckRunning}
                onClick={onRunHealthCheck}
                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-muted/40 disabled:opacity-50"
              >
                {healthCheckRunning ? "Checking…" : "Run health check"}
              </button>
            ) : null}
          </div>
          {healthStatuses && healthStatuses.length > 0 ? (
            <CmsHealthStatusList healthStatuses={healthStatuses} />
          ) : null}
          <CmsConnectedActions
            integrations={integrations}
            saving={saving}
            onTestPlatform={onTestPlatform}
            onDisconnect={onDisconnect}
          />
        </div>
      ) : null}

    </div>
  );
}
