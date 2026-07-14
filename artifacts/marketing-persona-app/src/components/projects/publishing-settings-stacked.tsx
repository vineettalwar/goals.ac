"use client";

import {
  CmsConnectionCard,
  SocialConnectionCard,
} from "./publishing-settings-cards";
import type { CmsIntegrationStatus } from "./publishing-settings-cards";
import type { PublishingPendingAction } from "@/components/projects/publishing-settings-pending";
import type { PublishDestinationDefinition } from "@/lib/projects/publishing-destinations";
import { PublishingSettingsExtraSocialCards } from "./publishing-settings-extra-social-cards";

export function PublishingSettingsStackedLayout({
  statusAlerts,
  testConnectionsButton,
  cmsDestinations,
  socialDestinations,
  cmsIntegrations,
  healthStatus,
  apiBase,
  projectId,
  token,
  pendingAction,
  metaPageToken,
  metaPages,
  metaIntegration,
  blueskyIntegration,
  mastodonIntegration,
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
  statusAlerts: React.ReactNode;
  testConnectionsButton: React.ReactNode;
  cmsDestinations: PublishDestinationDefinition[];
  socialDestinations: PublishDestinationDefinition[];
  cmsIntegrations: CmsIntegrationStatus;
  healthStatus: Record<string, { ok: boolean; error?: string }> | null;
  apiBase: string;
  projectId: string;
  token: string;
  pendingAction: PublishingPendingAction;
  metaPageToken: string | null;
  metaPages: Array<{ pageId: string; pageName: string; instagramUsername?: string }>;
  metaIntegration?: Record<string, unknown>;
  blueskyIntegration?: Record<string, unknown>;
  mastodonIntegration?: Record<string, unknown>;
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
  return (
    <>
      {statusAlerts}
      {testConnectionsButton}

      {cmsDestinations.map((destination) => (
        <CmsConnectionCard
          key={destination.id}
          destination={destination}
          integration={
            cmsIntegrations[destination.integrationKey] as Record<string, unknown> | undefined
          }
          health={healthStatus?.[destination.integrationKey]}
          apiBase={apiBase}
          projectId={projectId}
          token={token}
          onConnected={(updated) => onConnected(updated, destination.label)}
          onDisconnected={onDisconnected}
          onError={onError}
        />
      ))}

      {socialDestinations.map((destination) => (
        <SocialConnectionCard
          key={destination.id}
          destination={destination}
          integration={
            cmsIntegrations[destination.integrationKey] as Record<string, unknown> | undefined
          }
          health={healthStatus?.[destination.integrationKey]}
          apiBase={apiBase}
          projectId={projectId}
          isDisconnecting={
            destination.id === "linkedin"
              ? pendingAction === "disconnecting_linkedin"
              : pendingAction === "disconnecting_twitter"
          }
          onConnect={() => {
            if (destination.oauthPath) onConnectOAuth(destination.oauthPath);
          }}
          onDisconnect={() => {
            onDisconnectSocial(destination.id as "linkedin" | "twitter");
          }}
        />
      ))}

      <PublishingSettingsExtraSocialCards
        metaIntegration={metaIntegration}
        blueskyIntegration={blueskyIntegration}
        mastodonIntegration={mastodonIntegration}
        healthStatus={healthStatus}
        pendingAction={pendingAction}
        metaPageToken={metaPageToken}
        metaPages={metaPages}
        blueskyHandle={blueskyHandle}
        mastodonInstance={mastodonInstance}
        onBlueskyHandleChange={onBlueskyHandleChange}
        onMastodonInstanceChange={onMastodonInstanceChange}
        onConnectOAuth={onConnectOAuth}
        onDisconnectSocial={onDisconnectSocial}
        onSelectMetaPage={onSelectMetaPage}
      />
    </>
  );
}
