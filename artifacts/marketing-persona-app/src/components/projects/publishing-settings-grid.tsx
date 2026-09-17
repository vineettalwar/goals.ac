import { PublishBrandIcon } from "@workspace/app-shell/integrations";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IntegrationCategorySection, IntegrationIconBox, IntegrationTile } from "@/components/integrations/integration-tile";
import { useReleasedCmsPlatforms, useSocialOauthConfigured } from "@/lib/queries";
import { isCmsConnectReady } from "@workspace/content-engine/support/publishing/cms-platform-keys";
import { isSocialOauthReady } from "@workspace/content-engine/support/social/social-oauth-availability";
import {
  type PublishDestinationId,
  countCmsConnections,
  countEspConnections,
  countSocialConnections,
  getCmsDestinations,
  getEspDestinations,
  getExportDestinations,
  getConnectionSummary,
  getSocialDestinations,
  SOCIAL_SETTINGS_COUNT,
} from "@/lib/projects/publishing-destinations";
import type { IntegrationCategoryFilter } from "./publishing-settings-panel";
import {
  DestinationBadge,
  SocialIcon,
} from "./publishing-settings-cards";
import type { CmsIntegrationStatus } from "./publishing-settings-cards";
import { getIntegrationDialogTitle } from "./publishing-settings-shared";

type IntegrationDialogId = PublishDestinationId | "meta";

export function PublishingSettingsGridLayout({
  categoryFilter,
  cmsIntegrations,
  healthStatus,
  statusAlerts,
  testConnectionsButton,
  activeDialog,
  onActiveDialogChange,
  renderDialogBody,
}: {
  categoryFilter: IntegrationCategoryFilter;
  cmsIntegrations: CmsIntegrationStatus;
  healthStatus: Record<string, { ok: boolean; error?: string }> | null;
  statusAlerts: React.ReactNode;
  testConnectionsButton: React.ReactNode;
  activeDialog: IntegrationDialogId | null;
  onActiveDialogChange: (id: IntegrationDialogId | null) => void;
  renderDialogBody: () => React.ReactNode;
}) {
  const releasedCms = useReleasedCmsPlatforms();
  const socialOauth = useSocialOauthConfigured();
  const cmsDestinations = getCmsDestinations();
  const espDestinations = getEspDestinations();
  const exportDestinations = getExportDestinations();
  const socialDestinations = getSocialDestinations();
  const metaIntegration = cmsIntegrations.meta as Record<string, unknown> | undefined;
  const blueskyIntegration = cmsIntegrations.bluesky as Record<string, unknown> | undefined;
  const mastodonIntegration = cmsIntegrations.mastodon as Record<string, unknown> | undefined;
  const showCms = categoryFilter === "all" || categoryFilter === "cms";
  const showEsp = categoryFilter === "all" || categoryFilter === "esp";
  const showSocial = categoryFilter === "all" || categoryFilter === "social";
  const singleCategory = categoryFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <p className="text-sm text-muted-foreground">
          {categoryFilter === "cms"
            ? "Connect a released CMS. Unreleased platforms show as coming soon."
            : categoryFilter === "social"
              ? "Connect accounts when platform OAuth is configured. Others show as coming soon."
              : "Click an integration to connect or manage settings."}
        </p>
        {testConnectionsButton}
      </div>

      {statusAlerts}

      {showCms ? (
        <IntegrationCategorySection
          title="CMS & publishing"
          description="Publish long-form articles to websites and content platforms."
          connectedCount={countCmsConnections(cmsIntegrations)}
          totalCount={cmsDestinations.length}
          compact={singleCategory}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {cmsDestinations.map((destination) => {
              const comingSoon = !isCmsConnectReady(destination.id, releasedCms);
              return (
              <IntegrationTile
                key={destination.id}
                icon={
                  <IntegrationIconBox className="p-0 border-0 bg-transparent">
                    <DestinationBadge destination={destination} />
                  </IntegrationIconBox>
                }
                title={destination.label}
                description={destination.description}
                connected={destination.isConnected(cmsIntegrations)}
                summary={getConnectionSummary(destination.id, cmsIntegrations)}
                comingSoon={comingSoon}
                onClick={() => {
                  if (comingSoon && !destination.isConnected(cmsIntegrations)) return;
                  onActiveDialogChange(destination.id);
                }}
              />
              );
            })}
          </div>
        </IntegrationCategorySection>
      ) : null}

      {showEsp ? (
        <IntegrationCategorySection
          title="Email & newsletters"
          description="Publish email sequences to ESP platforms."
          connectedCount={countEspConnections(cmsIntegrations)}
          totalCount={espDestinations.length}
          compact={singleCategory}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {espDestinations.map((destination) => (
              <IntegrationTile
                key={destination.id}
                icon={
                  <IntegrationIconBox className="p-0 border-0 bg-transparent">
                    <DestinationBadge destination={destination} />
                  </IntegrationIconBox>
                }
                title={destination.label}
                description={destination.description}
                connected={destination.isConnected(cmsIntegrations)}
                summary={getConnectionSummary(destination.id, cmsIntegrations)}
                onClick={() => onActiveDialogChange(destination.id)}
              />
            ))}
            {categoryFilter === "all"
              ? exportDestinations.map((destination) => (
                  <IntegrationTile
                    key={destination.id}
                    icon={
                      <IntegrationIconBox className="p-0 border-0 bg-transparent">
                        <DestinationBadge destination={destination} />
                      </IntegrationIconBox>
                    }
                    title={destination.label}
                    description={destination.description}
                    connected={false}
                    summary="Export only"
                    onClick={() => onActiveDialogChange(destination.id)}
                  />
                ))
              : null}
          </div>
        </IntegrationCategorySection>
      ) : null}

      {showSocial ? (
        <IntegrationCategorySection
          title="Social accounts"
          description="Publish posts and threads to social profiles."
          connectedCount={countSocialConnections(cmsIntegrations)}
          totalCount={SOCIAL_SETTINGS_COUNT}
          compact={singleCategory}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {socialDestinations.map((destination) => {
              const connected = destination.isConnected(cmsIntegrations);
              const comingSoon = !connected && !isSocialOauthReady(destination.id, socialOauth);
              return (
              <IntegrationTile
                key={destination.id}
                icon={
                  <IntegrationIconBox className="p-0 border-0 bg-transparent">
                    <SocialIcon id={destination.id} />
                  </IntegrationIconBox>
                }
                title={destination.label}
                description={destination.description}
                connected={connected}
                summary={getConnectionSummary(destination.id, cmsIntegrations)}
                comingSoon={comingSoon}
                onClick={() => {
                  if (comingSoon) return;
                  onActiveDialogChange(destination.id);
                }}
              />
              );
            })}
            {(["meta", "bluesky", "mastodon"] as const).map((id) => {
              const integration =
                id === "meta"
                  ? metaIntegration
                  : id === "bluesky"
                    ? blueskyIntegration
                    : mastodonIntegration;
              const connected = Boolean(integration);
              const comingSoon = !connected && !isSocialOauthReady(id, socialOauth);
              const title =
                id === "meta" ? "Facebook & Instagram" : id === "bluesky" ? "Bluesky" : "Mastodon";
              const description =
                id === "meta"
                  ? "Publish via a Facebook Page and linked Instagram account."
                  : id === "bluesky"
                    ? "Publish skeets via AT Protocol OAuth."
                    : "Publish toots to your Mastodon instance.";
              const summary =
                id === "meta" && metaIntegration
                  ? String(metaIntegration.pageName ?? metaIntegration.pageId)
                  : id === "bluesky" && blueskyIntegration
                    ? `@${String(blueskyIntegration.handle ?? blueskyIntegration.did ?? "connected")}`
                    : id === "mastodon" && mastodonIntegration
                      ? `@${String(mastodonIntegration.username ?? "connected")}`
                      : null;
              return (
                <IntegrationTile
                  key={id}
                  icon={
                    <IntegrationIconBox className="p-0 border-0 bg-transparent">
                      <PublishBrandIcon id={id} />
                    </IntegrationIconBox>
                  }
                  title={title}
                  description={description}
                  connected={connected}
                  summary={summary}
                  comingSoon={comingSoon}
                  onClick={() => {
                    if (comingSoon) return;
                    onActiveDialogChange(id);
                  }}
                />
              );
            })}
          </div>
        </IntegrationCategorySection>
      ) : null}

      <Dialog open={activeDialog != null} onOpenChange={(open) => !open && onActiveDialogChange(null)}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden border-border bg-card p-0 shadow-lg sm:max-w-xl max-h-[88vh]">
          {activeDialog ? (
            <DialogTitle className="sr-only">
              {getIntegrationDialogTitle(activeDialog, [
                ...cmsDestinations,
                ...espDestinations,
                ...exportDestinations,
                ...socialDestinations,
              ])}
            </DialogTitle>
          ) : null}
          <div className="max-h-[88vh] overflow-y-auto overscroll-contain p-6 pr-12">
            {renderDialogBody()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
