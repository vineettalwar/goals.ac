import type { ReactNode } from "react";
import { cn } from "../cn";
import { projectDetailPath, type ProjectLinkProps } from "../projects";
import {
  CMS_PLATFORMS,
  type CmsIntegrationRow,
  type IntegrationsTab,
} from "./types";
import { CmsPlatformIcon } from "./integration-icons";
import { IntegrationTile } from "./integration-tiles";
import {
  IntegrationsSearchPanel,
  searchConnectedCount,
  type SearchPropertyConnectionsResponse,
  type SearchPropertyProvider,
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
  apiBase,
  onDisconnectSearch,
  onSyncGsc,
  onSelectSearchProperty,
  onRefreshSearch,
  disconnectingSearchProvider,
  syncingGsc,
  appOrigin,
  socialCount,
  onDisconnectSocial,
  metaPageToken,
  onMetaPageConnected,
  socialOauthNotice,
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
  /** API origin for OAuth start URLs (e.g. https://api.goals.ac or empty for dev proxy). */
  apiBase?: string;
  onDisconnectSearch?: (provider: SearchPropertyProvider) => void;
  onSyncGsc?: () => void;
  onSelectSearchProperty?: (provider: SearchPropertyProvider, propertyUrl: string) => void;
  onRefreshSearch?: () => void;
  disconnectingSearchProvider?: SearchPropertyProvider | null;
  syncingGsc?: boolean;
  appOrigin?: string;
  socialCount?: number;
  onDisconnectSocial?: (platform: string) => void;
  metaPageToken?: string | null;
  onMetaPageConnected?: () => void;
  socialOauthNotice?: string | null;
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
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {CMS_PLATFORMS.filter((p) => p.key !== "webhook").map((platform) => {
                    const { key, label, description } = platform;
                    const row = integrations[key];
                    const connected = Boolean(row?.connected);
                    const summary =
                      connected && key === "webhook" && typeof row?.url === "string"
                        ? row.url
                        : connected
                          ? "Connected"
                          : null;

                    return (
                      <IntegrationTile
                        key={key}
                        icon={<CmsPlatformIcon platform={platform} />}
                        title={label}
                        description={description}
                        connected={connected}
                        summary={summary}
                        onClick={() => {
                          if (!connected) {
                            onConnectPlatform(key);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {!integrationsLoading &&
              CMS_PLATFORMS.some(({ key }) => integrations[key]?.connected) ? (
                <div className="flex flex-wrap gap-2">
                  {CMS_PLATFORMS.filter(({ key }) => integrations[key]?.connected).map(({ key, label }) => (
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
                    </div>
                  ))}
                </div>
              ) : null}

              <section className="paper-card max-w-lg space-y-3 p-4">
                <h2 className="text-sm font-semibold">Connect webhook</h2>
                <p className="text-xs text-muted-foreground">
                  Receive publish events at your endpoint when content is pushed from goals.ac.
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
            <IntegrationsSearchPanel
              projectId={projectId}
              data={searchProperties ?? null}
              loading={Boolean(searchPropertiesLoading)}
              error={searchPropertiesError ?? null}
              apiBase={apiBase ?? "http://localhost:8787"}
              saving={saving}
              disconnectingProvider={disconnectingSearchProvider ?? null}
              syncingGsc={syncingGsc}
              onDisconnect={onDisconnectSearch}
              onSyncGsc={onSyncGsc}
              onSelectProperty={onSelectSearchProperty}
              onRefresh={onRefreshSearch}
            />
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
              apiBase={apiBase ?? ""}
              saving={saving}
              onDisconnect={onDisconnectSocial}
              metaPageToken={metaPageToken}
              onMetaPageConnected={onMetaPageConnected}
              oauthNotice={socialOauthNotice}
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
