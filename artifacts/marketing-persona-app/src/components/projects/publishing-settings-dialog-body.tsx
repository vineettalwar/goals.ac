"use client";

import { ContentExportPanel } from "@/components/content/content-export-panel";
import {
  type PublishDestinationId,
  getCmsDestinations,
  getEspDestinations,
  getExportDestinations,
  getSocialDestinations,
} from "@/lib/projects/publishing-destinations";
import type { PublishingPendingAction } from "@/components/projects/publishing-settings-pending";
import {
  PublishingSettingsBlueskyCard,
  PublishingSettingsMastodonCard,
  PublishingSettingsMetaCard,
} from "./publishing-settings-extra-social-cards";
import { CmsConnectionCard, SocialConnectionCard } from "./publishing-settings-cards";
import type { CmsIntegrationStatus } from "./publishing-settings-cards";

type IntegrationDialogId = PublishDestinationId | "meta";

type MetaPageOption = {
  pageId: string;
  pageName: string;
  instagramAccountId?: string;
  instagramUsername?: string;
};

export function PublishingSettingsDialogBody({
  activeDialog,
  apiBase,
  projectId,
  token,
  cmsIntegrations,
  healthStatus,
  pendingAction,
  metaPageToken,
  metaPages,
  blueskyHandle,
  mastodonInstance,
  onBlueskyHandleChange,
  onMastodonInstanceChange,
  onConnected,
  onDisconnected,
  onError,
  onConnectOAuth,
  onDisconnectSocial,
  onSelectMetaPage,
}: {
  activeDialog: IntegrationDialogId;
  apiBase: string;
  projectId: string;
  token: string;
  cmsIntegrations: CmsIntegrationStatus;
  healthStatus: Record<string, { ok: boolean; error?: string }> | null;
  pendingAction: PublishingPendingAction;
  metaPageToken: string | null;
  metaPages: MetaPageOption[];
  blueskyHandle: string;
  mastodonInstance: string;
  onBlueskyHandleChange: (v: string) => void;
  onMastodonInstanceChange: (v: string) => void;
  onConnected: (updated: CmsIntegrationStatus, label?: string) => void;
  onDisconnected: (integrationKey: string) => void;
  onError: (message: string) => void;
  onConnectOAuth: (path: string, params?: { handle?: string; instance?: string }) => void;
  onDisconnectSocial: (platform: "linkedin" | "twitter" | "meta" | "bluesky" | "mastodon") => void;
  onSelectMetaPage: (pageId: string) => void;
}) {
  const cmsDestinations = getCmsDestinations();
  const espDestinations = getEspDestinations();
  const exportDestinations = getExportDestinations();
  const socialDestinations = getSocialDestinations();
  const metaIntegration = cmsIntegrations.meta as Record<string, unknown> | undefined;
  const blueskyIntegration = cmsIntegrations.bluesky as Record<string, unknown> | undefined;
  const mastodonIntegration = cmsIntegrations.mastodon as Record<string, unknown> | undefined;

  const sharedSocial = {
    embedded: true as const,
    healthStatus,
    pendingAction,
    onConnectOAuth,
    onDisconnectSocial,
  };

  if (activeDialog === "meta") {
    return (
      <PublishingSettingsMetaCard
        {...sharedSocial}
        metaIntegration={metaIntegration}
        metaPageToken={metaPageToken}
        metaPages={metaPages}
        onSelectMetaPage={onSelectMetaPage}
      />
    );
  }

  if (activeDialog === "bluesky") {
    return (
      <PublishingSettingsBlueskyCard
        {...sharedSocial}
        blueskyIntegration={blueskyIntegration}
        blueskyHandle={blueskyHandle}
        onBlueskyHandleChange={onBlueskyHandleChange}
      />
    );
  }

  if (activeDialog === "mastodon") {
    return (
      <PublishingSettingsMastodonCard
        {...sharedSocial}
        mastodonIntegration={mastodonIntegration}
        mastodonInstance={mastodonInstance}
        onMastodonInstanceChange={onMastodonInstanceChange}
      />
    );
  }

  const cmsDestination = cmsDestinations.find((d) => d.id === activeDialog);
  if (cmsDestination) {
    return (
      <CmsConnectionCard
        destination={cmsDestination}
        integration={
          cmsIntegrations[cmsDestination.integrationKey] as Record<string, unknown> | undefined
        }
        health={healthStatus?.[cmsDestination.integrationKey]}
        apiBase={apiBase}
        projectId={projectId}
        token={token}
        embedded
        onConnected={(updated) => onConnected(updated, cmsDestination.label)}
        onDisconnected={onDisconnected}
        onError={onError}
      />
    );
  }

  const espDestination = espDestinations.find((d) => d.id === activeDialog);
  if (espDestination) {
    return (
      <CmsConnectionCard
        destination={espDestination}
        integration={
          cmsIntegrations[espDestination.integrationKey] as Record<string, unknown> | undefined
        }
        health={healthStatus?.[espDestination.integrationKey]}
        apiBase={apiBase}
        projectId={projectId}
        token={token}
        embedded
        onConnected={(updated) => onConnected(updated, espDestination.label)}
        onDisconnected={onDisconnected}
        onError={onError}
      />
    );
  }

  const exportDestination = exportDestinations.find((d) => d.id === activeDialog);
  if (exportDestination && (exportDestination.id === "medium" || exportDestination.id === "substack")) {
    return <ContentExportPanel platform={exportDestination.id} />;
  }

  const socialDestination = socialDestinations.find((d) => d.id === activeDialog);
  if (socialDestination) {
    return (
      <SocialConnectionCard
        destination={socialDestination}
        integration={
          cmsIntegrations[socialDestination.integrationKey] as Record<string, unknown> | undefined
        }
        health={healthStatus?.[socialDestination.integrationKey]}
        apiBase={apiBase}
        projectId={projectId}
        embedded
        isDisconnecting={
          socialDestination.id === "linkedin"
            ? pendingAction === "disconnecting_linkedin"
            : pendingAction === "disconnecting_twitter"
        }
        onConnect={() => {
          if (socialDestination.oauthPath) onConnectOAuth(socialDestination.oauthPath);
        }}
        onDisconnect={() => {
          onDisconnectSocial(socialDestination.id as "linkedin" | "twitter");
        }}
      />
    );
  }

  return null;
}
