import type { ReactNode } from "react";
import { cn } from "../cn";
import { projectDetailPath, type ProjectLinkProps } from "../projects";
import {
  CMS_PLATFORMS,
  type CmsIntegrationRow,
  type IntegrationsTab,
} from "./types";
import {
  IntegrationsSearchPanel,
  searchConnectedCount,
  type SearchPropertyConnectionsResponse,
} from "./integrations-search-ui";
import {
  IntegrationsSocialPanel,
  countSocialConnections,
} from "./integrations-social-ui";
import { IntegrationsEspPanel, countEspConnections } from "./integrations-esp-ui";
import type { EspPlatformId } from "./publishing-destinations";

const TABS: Array<{ id: IntegrationsTab; label: string }> = [
  { id: "cms", label: "CMS" },
  { id: "social", label: "Social" },
  { id: "esp", label: "Email" },
  { id: "search", label: "Search & Analytics" },
];

function IntegrationTabBadge({ count, loading }: { count: number; loading?: boolean }) {
  if (!loading && count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary",
        loading && "invisible",
      )}
      aria-hidden={loading}
    >
      {loading ? 0 : count}
    </span>
  );
}

function ProjectLink({
  renderLink,
  ...props
}: ProjectLinkProps & { renderLink: (props: ProjectLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

function cmsConnectedCount(integrations: Record<string, CmsIntegrationRow>): number {
  return CMS_PLATFORMS.filter(({ key }) => Boolean(integrations[key]?.connected)).length;
}

function PlaceholderTabPanel() {
  return (
    <div className="paper-card p-8 text-center text-sm text-muted-foreground">
      <p>Available in the full product app at</p>
      <p className="mt-2">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">localhost:3001/integrations</code>
      </p>
    </div>
  );
}

export function IntegrationsView({
  projectId,
  projectName,
  activeTab,
  onTabChange,
  integrations,
  integrationsLoading,
  loadError,
  saveMessage,
  saving,
  webhookUrl,
  webhookSecret,
  onWebhookUrlChange,
  onWebhookSecretChange,
  onSaveWebhook,
  onDisconnect,
  onConnectPlatform,
  onTestPlatform,
  onConnectEsp,
  onDisconnectEsp,
  onTestEsp,
  searchProperties,
  searchPropertiesLoading,
  searchPropertiesError,
  appOrigin,
  socialCount,
  onDisconnectSocial,
  renderLink,
}: {
  projectId: string | null;
  projectName: string | null;
  activeTab: IntegrationsTab;
  onTabChange: (tab: IntegrationsTab) => void;
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
  onConnectEsp?: (platform: EspPlatformId) => void;
  onDisconnectEsp?: (platform: EspPlatformId) => void;
  onTestEsp?: (platform: EspPlatformId) => void;
  searchProperties?: SearchPropertyConnectionsResponse | null;
  searchPropertiesLoading?: boolean;
  searchPropertiesError?: string | null;
  appOrigin?: string;
  socialCount?: number;
  onDisconnectSocial?: (platform: string) => void;
  renderLink: (props: ProjectLinkProps) => ReactNode;
}) {
  const cmsCount = cmsConnectedCount(integrations);
  const espCount = countEspConnections(integrations);
  const resolvedSocialCount = socialCount ?? countSocialConnections(integrations);
  const searchCount = searchConnectedCount(searchProperties ?? null);

  return (
    <div className="max-w-5xl space-y-6 px-8 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          {projectName ? (
            <>
              Manage connections for{" "}
              <span className="font-medium text-foreground">{projectName}</span>
            </>
          ) : (
            "Choose a project to manage connections"
          )}
          . Credentials are encrypted at rest.
        </p>
      </div>

      {!projectId ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Choose a project in the sidebar to manage integrations.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const count =
                tab.id === "cms"
                  ? cmsCount
                  : tab.id === "social"
                    ? resolvedSocialCount
                    : tab.id === "esp"
                      ? espCount
                      : tab.id === "search"
                        ? searchCount
                        : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  {tab.label}
                  {tab.id === "cms" ? (
                    <IntegrationTabBadge count={count} loading={integrationsLoading} />
                  ) : null}
                  {tab.id === "social" ? (
                    <IntegrationTabBadge count={count} loading={integrationsLoading} />
                  ) : null}
                  {tab.id === "esp" ? (
                    <IntegrationTabBadge count={count} loading={integrationsLoading} />
                  ) : null}
                  {tab.id === "search" ? (
                    <IntegrationTabBadge count={count} loading={searchPropertiesLoading} />
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeTab === "cms" ? (
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
                <div className="grid gap-3 sm:grid-cols-2">
                  {CMS_PLATFORMS.map(({ key, label }) => {
                    const row = integrations[key];
                    const connected = Boolean(row?.connected);
                    return (
                      <div
                        key={key}
                        className="paper-card flex items-start justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {connected ? "Connected" : "Not connected"}
                          </p>
                          {connected && key === "webhook" && typeof row?.url === "string" ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground">{row.url}</p>
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
                                  onClick={() => onTestPlatform(key)}
                                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                                >
                                  Test
                                </button>
                              ) : null}
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => onDisconnect(key)}
                                className="text-xs text-red-700 hover:underline disabled:opacity-50"
                              >
                                Disconnect
                              </button>
                            </div>
                          ) : key !== "webhook" ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => onConnectPlatform(key)}
                              className="h-8 rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                            >
                              Connect
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <section className="paper-card max-w-lg space-y-3 p-4">
                <h2 className="text-sm font-semibold">Connect webhook</h2>
                <p className="text-xs text-muted-foreground">
                  Other CMS platforms use the same API; full connection forms are available in the
                  full product app.
                </p>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">Webhook URL</span>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(event) => onWebhookUrlChange(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="https://example.com/hooks/goals-ac"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">Signing secret</span>
                    <input
                      type="password"
                      value={webhookSecret}
                      onChange={(event) => onWebhookSecretChange(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving || !webhookUrl.trim() || !webhookSecret.trim()}
                    onClick={onSaveWebhook}
                    className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save webhook"}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "search" && projectId ? (
            searchProperties != null || searchPropertiesLoading || searchPropertiesError ? (
              <IntegrationsSearchPanel
                projectId={projectId}
                data={searchProperties ?? null}
                loading={Boolean(searchPropertiesLoading)}
                error={searchPropertiesError ?? null}
                appOrigin={appOrigin ?? "http://localhost:3001"}
              />
            ) : (
              <PlaceholderTabPanel />
            )
          ) : null}

          {activeTab === "esp" ? (
            <IntegrationsEspPanel
              integrations={integrations}
              loading={integrationsLoading}
              error={loadError}
              saveMessage={saveMessage}
              saving={saving}
              onDisconnect={(platform) => onDisconnectEsp?.(platform) ?? onDisconnect(platform)}
              onConnectPlatform={(platform) => onConnectEsp?.(platform) ?? onConnectPlatform(platform)}
              onTestPlatform={onTestEsp ?? onTestPlatform}
              fullAppIntegrationsUrl={
                appOrigin ? `${appOrigin.replace(/\/+$/, "")}/integrations` : undefined
              }
            />
          ) : null}

          {activeTab === "social" && projectId ? (
            <IntegrationsSocialPanel
              projectId={projectId}
              integrations={integrations}
              loading={integrationsLoading}
              error={loadError}
              appOrigin={appOrigin ?? "http://localhost:3001"}
              saving={saving}
              onDisconnect={onDisconnectSocial}
              fullAppIntegrationsUrl={
                appOrigin ? `${appOrigin.replace(/\/+$/, "")}/integrations` : undefined
              }
            />
          ) : null}
        </>
      )}

      {projectId ? (
        <p className="text-xs text-muted-foreground">
          <ProjectLink
            renderLink={renderLink}
            href={projectDetailPath(projectId)}
            className="font-medium text-primary hover:underline"
          >
            Open project overview
          </ProjectLink>
        </p>
      ) : null}
    </div>
  );
}
