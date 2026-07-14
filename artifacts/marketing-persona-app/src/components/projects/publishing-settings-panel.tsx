"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Facebook,
  Globe,
  Instagram,
  Link2,
  Linkedin,
  Loader2,
  RefreshCw,
  Twitter,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fieldIsVisible,
  getCmsConnectionSchema,
  getInitialFormValues,
  type ConnectionFieldDef,
} from "@/lib/integrations/cms/cms-connection-schemas";
import {
  getDefaultOutputMode,
  getFixedOutputModeLabel,
  getOutputModes,
  outputModeLabel,
} from "@workspace/content-engine/support/publishing/platform-output-modes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IntegrationCategorySection,
  IntegrationIconBox,
  IntegrationTile,
} from "@/components/integrations/integration-tile";
import { ContentExportPanel } from "@/components/content/content-export-panel";
import {
  type ConnectionMethod,
  type PublishDestinationDefinition,
  type PublishDestinationId,
  countCmsConnections,
  countEspConnections,
  countSocialConnections,
  getCmsDestinations,
  getEspDestinations,
  getExportDestinations,
  getConnectionMethodLabel,
  getConnectionSummary,
  getDefaultConnectionMethod,
  getSocialDestinations,
  hasAnyPublishingConnection,
  SOCIAL_SETTINGS_COUNT,
  supportsMultipleConnectionMethods,
} from "@/lib/projects/publishing-destinations";
import {
  isPublishingActionPending,
  type PublishingPendingAction,
} from "@/components/projects/publishing-settings-pending";

export type IntegrationLayout = "stacked" | "grid";
export type IntegrationCategoryFilter = "all" | "cms" | "social" | "esp";
import { getIntegrationDialogTitle } from "./publishing-settings-shared";
import { PublishingSettingsGridLayout } from "./publishing-settings-grid";
import { PublishingSettingsStackedLayout } from "./publishing-settings-stacked";

type IntegrationDialogId = PublishDestinationId | "meta";


type MetaPageOption = {
  pageId: string;
  pageName: string;
  instagramAccountId?: string;
  instagramUsername?: string;
};

import {
  CmsConnectionCard,
  DestinationBadge,
  HealthBadge,
  SocialConnectionCard,
  SocialIcon,
} from "./publishing-settings-cards";
import { PublishingSettingsDialogBody } from "./publishing-settings-dialog-body";
export type { CmsIntegrationStatus } from "./publishing-settings-cards";


export function PublishingSettingsPanel({
  apiBase,
  projectId,
  token,
  cmsIntegrations,
  healthStatus,
  cmsError,
  cmsSaveSuccess,
  pendingAction,
  metaPageToken,
  metaPages,
  onIntegrationsChange,
  onHealthKeyRemove,
  onError,
  onSaveSuccess,
  onTestHealth,
  onConnectOAuth,
  onDisconnectSocial,
  onSelectMetaPage,
  layout = "stacked",
  categoryFilter = "all",
}: {
  apiBase: string;
  projectId: string;
  token: string;
  cmsIntegrations: CmsIntegrationStatus;
  healthStatus: Record<string, { ok: boolean; error?: string }> | null;
  cmsError: string | null;
  cmsSaveSuccess: string | null;
  pendingAction: PublishingPendingAction;
  metaPageToken: string | null;
  metaPages: MetaPageOption[];
  onIntegrationsChange: (updated: CmsIntegrationStatus) => void;
  onHealthKeyRemove: (key: string) => void;
  onError: (message: string) => void;
  onSaveSuccess: (message: string) => void;
  onTestHealth: () => void;
  onConnectOAuth: (path: string, params?: { handle?: string; instance?: string }) => void;
  onDisconnectSocial: (platform: "linkedin" | "twitter" | "meta" | "bluesky" | "mastodon") => void;
  onSelectMetaPage: (pageId: string) => void;
  layout?: IntegrationLayout;
  categoryFilter?: IntegrationCategoryFilter;
}) {
  const cmsDestinations = getCmsDestinations();
  const espDestinations = getEspDestinations();
  const exportDestinations = getExportDestinations();
  const socialDestinations = getSocialDestinations();
  const metaIntegration = cmsIntegrations.meta as Record<string, unknown> | undefined;
  const blueskyIntegration = cmsIntegrations.bluesky as Record<string, unknown> | undefined;
  const mastodonIntegration = cmsIntegrations.mastodon as Record<string, unknown> | undefined;
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [mastodonInstance, setMastodonInstance] = useState("");
  const [activeDialog, setActiveDialog] = useState<IntegrationDialogId | null>(null);

  const handleConnected = useCallback(
    (updated: CmsIntegrationStatus, label?: string) => {
      onIntegrationsChange(updated);
      onSaveSuccess(label ? `${label} connected successfully` : "Connection saved successfully");
    },
    [onIntegrationsChange, onSaveSuccess],
  );

  const handleDisconnected = useCallback(
    (integrationKey: string) => {
      onIntegrationsChange(
        Object.fromEntries(
          Object.entries(cmsIntegrations).filter(([key]) => key !== integrationKey),
        ),
      );
      onHealthKeyRemove(integrationKey);
    },
    [cmsIntegrations, onHealthKeyRemove, onIntegrationsChange],
  );

  const statusAlerts = (
    <>
      {cmsError && (
        <div
          role="alert"
          className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>{cmsError}</span>
        </div>
      )}
      {cmsSaveSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          <span>{cmsSaveSuccess}</span>
        </div>
      )}
    </>
  );

  const testConnectionsButton =
    hasAnyPublishingConnection(cmsIntegrations) ? (
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={onTestHealth} disabled={pendingAction === "testing_health"}>
          {pendingAction === "testing_health" ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Test connections
        </Button>
      </div>
    ) : null;

  const renderDialogBody = () => (
    <PublishingSettingsDialogBody
      activeDialog={activeDialog!}
      apiBase={apiBase}
      projectId={projectId}
      token={token}
      cmsIntegrations={cmsIntegrations}
      healthStatus={healthStatus}
      pendingAction={pendingAction}
      metaPageToken={metaPageToken}
      metaPages={metaPages}
      blueskyHandle={blueskyHandle}
      mastodonInstance={mastodonInstance}
      onBlueskyHandleChange={setBlueskyHandle}
      onMastodonInstanceChange={setMastodonInstance}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onError={onError}
      onConnectOAuth={onConnectOAuth}
      onDisconnectSocial={onDisconnectSocial}
      onSelectMetaPage={onSelectMetaPage}
    />
  );

  if (layout === "grid") {
    return (
      <PublishingSettingsGridLayout
        categoryFilter={categoryFilter}
        cmsIntegrations={cmsIntegrations}
        healthStatus={healthStatus}
        statusAlerts={statusAlerts}
        testConnectionsButton={testConnectionsButton}
        activeDialog={activeDialog}
        onActiveDialogChange={setActiveDialog}
        renderDialogBody={renderDialogBody}
      />
    );
  }

  return (
    <PublishingSettingsStackedLayout
      statusAlerts={statusAlerts}
      testConnectionsButton={testConnectionsButton}
      cmsDestinations={cmsDestinations}
      socialDestinations={socialDestinations}
      cmsIntegrations={cmsIntegrations}
      healthStatus={healthStatus}
      apiBase={apiBase}
      projectId={projectId}
      token={token}
      pendingAction={pendingAction}
      metaPageToken={metaPageToken}
      metaPages={metaPages}
      metaIntegration={metaIntegration}
      blueskyIntegration={blueskyIntegration}
      mastodonIntegration={mastodonIntegration}
      blueskyHandle={blueskyHandle}
      mastodonInstance={mastodonInstance}
      onBlueskyHandleChange={setBlueskyHandle}
      onMastodonInstanceChange={setMastodonInstance}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      onError={onError}
      onConnectOAuth={onConnectOAuth}
      onDisconnectSocial={onDisconnectSocial}
      onSelectMetaPage={onSelectMetaPage}
    />
  );
}