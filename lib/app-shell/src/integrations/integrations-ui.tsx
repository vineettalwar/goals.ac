import type { ReactNode } from "react";
import { cn } from "../cn";
import { projectDetailPath, type ProjectLinkProps } from "../projects/projects-ui";
import {
  type CmsIntegrationRow,
  type ProjectIntegrationsTab,
} from "./types";
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
import { IntegrationsCmsPanel } from "./integrations-cms-panel";
import type { EspPlatformId } from "./publishing-destinations";
import { orgIntegrationsPath, projectIntegrationsPath } from "../project-detail/types";
import { CMS_PLATFORMS } from "./types";

const TABS: Array<{ id: ProjectIntegrationsTab; label: string }> = [
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
  let count = 0;
  for (const { key } of CMS_PLATFORMS) {
    if (integrations[key]?.connected) count += 1;
  }
  return count;
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
  onRunHealthCheck,
  healthCheckRunning,
  healthStatuses,
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
  activeTab: ProjectIntegrationsTab;
  onTabChange: (tab: ProjectIntegrationsTab) => void;
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
  const projectIntegrationsHref = projectId
    ? appOrigin
      ? `${appOrigin.replace(/\/+$/, "")}${projectIntegrationsPath(projectId)}`
      : projectIntegrationsPath(projectId)
    : appOrigin
      ? `${appOrigin.replace(/\/+$/, "")}/integrations`
      : "/integrations";

  return (
    <div className="max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
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
                  : searchCount;
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
              <IntegrationTabBadge
                count={count}
                loading={tab.id === "search" ? searchPropertiesLoading : integrationsLoading}
              />
            </button>
          );
        })}
      </div>

      {!projectId ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Choose a project in the sidebar to manage CMS, social, email, and search connections.
        </div>
      ) : null}

      {projectId ? (
        <>
          {activeTab === "cms" ? (
            <IntegrationsCmsPanel
              integrations={integrations}
              integrationsLoading={integrationsLoading}
              loadError={loadError}
              saveMessage={saveMessage}
              saving={saving}
              webhookUrl={webhookUrl}
              webhookSecret={webhookSecret}
              onWebhookUrlChange={onWebhookUrlChange}
              onWebhookSecretChange={onWebhookSecretChange}
              onSaveWebhook={onSaveWebhook}
              onDisconnect={onDisconnect}
              onConnectPlatform={onConnectPlatform}
              onTestPlatform={onTestPlatform}
              onRunHealthCheck={onRunHealthCheck}
              healthCheckRunning={healthCheckRunning}
              healthStatuses={healthStatuses}
            />
          ) : null}

          {activeTab === "search" ? (
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
              fullAppIntegrationsUrl={projectIntegrationsHref}
            />
          ) : null}

          {activeTab === "social" ? (
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
      ) : null}

      {projectId ? (
        <p className="text-xs text-muted-foreground">
          Organization AI and research tools:{" "}
          <ProjectLink
            renderLink={renderLink}
            href={orgIntegrationsPath("ai")}
            className="font-medium text-primary hover:underline"
          >
            Org integrations
          </ProjectLink>
          {" · "}
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
