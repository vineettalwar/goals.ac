"use client";

import { useCallback, useMemo, useState } from "react";
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
} from "@/lib/integrations/cms-connection-schemas";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IntegrationCategorySection,
  IntegrationIconBox,
  IntegrationTile,
} from "@/components/integration-tile";
import { ContentExportPanel } from "@/components/content-export-panel";
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

export type IntegrationLayout = "stacked" | "grid";
export type IntegrationCategoryFilter = "all" | "cms" | "social" | "esp";

type IntegrationDialogId = PublishDestinationId | "meta";

function getIntegrationDialogTitle(
  activeDialog: IntegrationDialogId,
  destinations: PublishDestinationDefinition[],
): string {
  if (activeDialog === "meta") return "Facebook & Instagram";
  return destinations.find((d) => d.id === activeDialog)?.label ?? "Integration settings";
}

export type CmsIntegrationStatus = Record<string, unknown>;

type MetaPageOption = {
  pageId: string;
  pageName: string;
  instagramAccountId?: string;
  instagramUsername?: string;
};

function HealthBadge({
  health,
}: {
  health?: { ok: boolean; error?: string };
}) {
  if (!health) return null;
  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${health.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
    >
      {health.ok ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      {health.ok ? "Connection healthy" : health.error}
    </div>
  );
}

function DestinationBadge({
  destination,
}: {
  destination: PublishDestinationDefinition;
}) {
  if (destination.badgeLetter) {
    return (
      <span
        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${destination.badgeClassName ?? "bg-muted"}`}
      >
        {destination.badgeLetter}
      </span>
    );
  }
  return <Globe className="w-4 h-4" />;
}

function SocialIcon({ id }: { id: PublishDestinationId }) {
  if (id === "linkedin") return <Linkedin className="w-4 h-4 text-blue-600" />;
  if (id === "twitter") return <Twitter className="w-4 h-4 text-sky-500" />;
  return null;
}

function ConnectionField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ConnectionFieldDef;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <Select value={value || field.defaultValue || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{field.label}</label>
      <Input
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
    </div>
  );
}

function CmsConnectionCard({
  destination,
  integration,
  health,
  apiBase,
  projectId,
  token: _token,
  onConnected,
  onDisconnected,
  onError,
  embedded = false,
}: {
  destination: PublishDestinationDefinition;
  integration?: Record<string, unknown>;
  health?: { ok: boolean; error?: string };
  apiBase: string;
  projectId: string;
  token: string;
  onConnected: (updated: CmsIntegrationStatus) => void;
  onDisconnected: (integrationKey: string) => void;
  onError: (message: string) => void;
  embedded?: boolean;
}) {
  const schema = getCmsConnectionSchema(destination.id);
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(
    getDefaultConnectionMethod(destination.id),
  );
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    getInitialFormValues(destination.id),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const visibleFields = useMemo(() => {
    if (!schema) return [];
    return schema.fields.filter((field) =>
      fieldIsVisible(field, connectionMethod, formValues),
    );
  }, [schema, connectionMethod, formValues]);

  const setFieldValue = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!schema || !schema.canSubmit(formValues, connectionMethod)) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `${apiBase}/api/website-projects/${projectId}/cms-integrations`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [destination.integrationKey]: schema.buildPayload(
              formValues,
              connectionMethod,
            ),
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      const updated = (await res.json()) as CmsIntegrationStatus;
      onConnected(updated);
      setFormValues(schema.resetValues());
    } catch (err) {
      onError(err instanceof Error ? err.message : `Failed to connect ${destination.label}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch(
        `${apiBase}/api/website-projects/${projectId}/cms-integrations/${destination.integrationKey}`,
        {
          method: "DELETE",
        },
      );
      onDisconnected(destination.integrationKey);
    } catch {
      onError(`Failed to disconnect ${destination.label}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!schema) return null;

  return (
    <Card className={embedded ? "border-0 shadow-none" : "border shadow-sm"}>
      <CardHeader className={embedded ? "px-0 pt-0" : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <DestinationBadge destination={destination} />
              {destination.label}
              {integration && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{destination.description}</CardDescription>
          </div>
          {integration && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
              )}
              Disconnect
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        {integration ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            {schema.connectedDetails(integration).map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="font-medium text-foreground">{row.label}:</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">
                  {row.value}
                </code>
              </div>
            ))}
            <HealthBadge health={health} />
            <p className="text-xs text-muted-foreground mt-2">
              To update credentials, disconnect first then re-connect.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {supportsMultipleConnectionMethods(destination.id) && (
              <div className="space-y-2">
                <Label>Connection method</Label>
                <Select
                  value={connectionMethod}
                  onValueChange={(value: ConnectionMethod) => setConnectionMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {destination.connectionMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {getConnectionMethodLabel(destination.id, method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {visibleFields.map((field) => (
              <ConnectionField
                key={field.key}
                field={field}
                value={formValues[field.key] ?? field.defaultValue ?? ""}
                disabled={isSaving}
                onChange={(value) => setFieldValue(field.key, value)}
              />
            ))}
            <Button
              onClick={handleSave}
              disabled={!schema.canSubmit(formValues, connectionMethod) || isSaving}
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Connect {destination.label}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SocialConnectionCard({
  destination,
  integration,
  health,
  apiBase: _apiBase,
  projectId: _projectId,
  isDisconnecting,
  onConnect,
  onDisconnect,
  embedded = false,
}: {
  destination: PublishDestinationDefinition;
  integration?: Record<string, unknown>;
  health?: { ok: boolean; error?: string };
  apiBase: string;
  projectId: string;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  embedded?: boolean;
}) {
  const accountLabel =
    destination.id === "linkedin"
      ? String(integration?.displayName ?? "Connected")
      : destination.id === "twitter"
        ? `@${String(integration?.screenName ?? "connected")}`
        : "Connected";

  return (
    <Card className={embedded ? "border-0 shadow-none" : "border shadow-sm"}>
      <CardHeader className={embedded ? "px-0 pt-0" : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <SocialIcon id={destination.id} />
              {destination.label}
              {integration && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{destination.description}</CardDescription>
          </div>
          {integration && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
              )}
              Disconnect
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        {integration ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Account:</span> {accountLabel}
            </p>
            <HealthBadge health={health} />
          </div>
        ) : (
          <Button size="sm" onClick={onConnect}>
            <Link2 className="w-3.5 h-3.5 mr-1.5" />
            Connect {destination.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PublishingSettingsPanel({
  apiBase,
  projectId,
  token,
  cmsIntegrations,
  healthStatus,
  cmsError,
  cmsSaveSuccess,
  isTestingHealth,
  metaPageToken,
  metaPages,
  isSelectingMetaPage,
  isDisconnectingLinkedin,
  isDisconnectingTwitter,
  isDisconnectingMeta,
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
  isTestingHealth: boolean;
  metaPageToken: string | null;
  metaPages: MetaPageOption[];
  isSelectingMetaPage: boolean;
  isDisconnectingLinkedin: boolean;
  isDisconnectingTwitter: boolean;
  isDisconnectingMeta: boolean;
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
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{cmsError}</span>
        </div>
      )}
      {cmsSaveSuccess && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{cmsSaveSuccess}</span>
        </div>
      )}
    </>
  );

  const testConnectionsButton =
    hasAnyPublishingConnection(cmsIntegrations) ? (
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={onTestHealth} disabled={isTestingHealth}>
          {isTestingHealth ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Test connections
        </Button>
      </div>
    ) : null;

  const renderDialogBody = () => {
    if (!activeDialog) return null;

    if (activeDialog === "meta") {
      return (
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0 pt-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Facebook className="w-4 h-4 text-blue-700" />
                  <Instagram className="w-4 h-4 text-fuchsia-600" />
                  Facebook & Instagram
                  {metaIntegration && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Requires a Facebook Page with a linked Instagram Business account. Instagram posts require
                  a featured image URL in content metadata or an image in markdown.
                </CardDescription>
              </div>
              {metaIntegration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnectSocial("meta")}
                  disabled={isDisconnectingMeta}
                  className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  {isDisconnectingMeta ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Disconnect
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {metaPageToken && metaPages.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select a Facebook Page to connect:</p>
                {metaPages.map((page) => (
                  <Button
                    key={page.pageId}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={isSelectingMetaPage}
                    onClick={() => onSelectMetaPage(page.pageId)}
                  >
                    <span className="font-medium">{page.pageName}</span>
                    {page.instagramUsername && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        @{page.instagramUsername}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            ) : metaIntegration ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Page:</span>{" "}
                  {String(metaIntegration.pageName ?? metaIntegration.pageId)}
                </p>
                {metaIntegration.instagramUsername ? (
                  <p>
                    <span className="font-medium text-foreground">Instagram:</span> @
                    {String(metaIntegration.instagramUsername)}
                  </p>
                ) : null}
                <HealthBadge health={healthStatus?.meta} />
                {healthStatus?.meta && !healthStatus.meta.ok ? (
                  <Button size="sm" variant="outline" onClick={() => onConnectOAuth("meta")}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Reconnect Meta
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button size="sm" onClick={() => onConnectOAuth("meta")}>
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                Connect Meta
              </Button>
            )}
          </CardContent>
        </Card>
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
          onConnected={(updated) => handleConnected(updated, cmsDestination.label)}
          onDisconnected={handleDisconnected}
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
          onConnected={(updated) => handleConnected(updated, espDestination.label)}
          onDisconnected={handleDisconnected}
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
              ? isDisconnectingLinkedin
              : isDisconnectingTwitter
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

    if (activeDialog === "bluesky") {
      return (
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0 pt-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4 text-sky-500" />
                  Bluesky
                  {blueskyIntegration && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect via AT Protocol OAuth to publish skeets from Content Studio.
                </CardDescription>
              </div>
              {blueskyIntegration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnectSocial("bluesky")}
                  className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {blueskyIntegration ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Account:</span> @
                  {String(blueskyIntegration.handle ?? blueskyIntegration.did ?? "connected")}
                </p>
                <HealthBadge health={healthStatus?.bluesky} />
                {healthStatus?.bluesky && !healthStatus.bluesky.ok ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const handle = String(blueskyIntegration.handle ?? "");
                      if (handle) onConnectOAuth("bluesky", { handle });
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Reconnect Bluesky
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bluesky-handle-dialog">Bluesky handle</Label>
                  <Input
                    id="bluesky-handle-dialog"
                    placeholder="you.bsky.social"
                    value={blueskyHandle}
                    onChange={(e) => setBlueskyHandle(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!blueskyHandle.trim()}
                  onClick={() => onConnectOAuth("bluesky", { handle: blueskyHandle.trim() })}
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Connect Bluesky
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (activeDialog === "mastodon") {
      return (
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0 pt-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4 text-violet-500" />
                  Mastodon
                  {mastodonIntegration && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect your Mastodon instance to publish toots from Content Studio.
                </CardDescription>
              </div>
              {mastodonIntegration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnectSocial("mastodon")}
                  className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  Disconnect
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {mastodonIntegration ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Account:</span> @
                  {String(mastodonIntegration.username ?? "connected")}
                </p>
                <p>
                  <span className="font-medium text-foreground">Instance:</span>{" "}
                  {String(mastodonIntegration.instanceUrl ?? "")}
                </p>
                <HealthBadge health={healthStatus?.mastodon} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mastodon-instance-dialog">Instance URL</Label>
                  <Input
                    id="mastodon-instance-dialog"
                    placeholder="mastodon.social"
                    value={mastodonInstance}
                    onChange={(e) => setMastodonInstance(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!mastodonInstance.trim()}
                  onClick={() => onConnectOAuth("mastodon", { instance: mastodonInstance.trim() })}
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Connect Mastodon
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  if (layout === "grid") {
    const showCms = categoryFilter === "all" || categoryFilter === "cms";
    const showEsp = categoryFilter === "all" || categoryFilter === "esp";
    const showSocial = categoryFilter === "all" || categoryFilter === "social";
    const singleCategory = categoryFilter !== "all";

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
          <p className="text-sm text-muted-foreground">
            Click an integration to connect or manage settings.
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
              {cmsDestinations.map((destination) => (
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
                  onClick={() => setActiveDialog(destination.id)}
                />
              ))}
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
                  onClick={() => setActiveDialog(destination.id)}
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
                      connected
                      summary="Export only"
                      onClick={() => setActiveDialog(destination.id)}
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
              {socialDestinations.map((destination) => (
                <IntegrationTile
                  key={destination.id}
                  icon={
                    <IntegrationIconBox>
                      <SocialIcon id={destination.id} />
                    </IntegrationIconBox>
                  }
                  title={destination.label}
                  description={destination.description}
                  connected={destination.isConnected(cmsIntegrations)}
                  summary={getConnectionSummary(destination.id, cmsIntegrations)}
                  onClick={() => setActiveDialog(destination.id)}
                />
              ))}
              <IntegrationTile
                icon={
                  <IntegrationIconBox>
                    <span className="inline-flex items-center gap-0.5">
                      <Facebook className="w-3.5 h-3.5 text-blue-700" />
                      <Instagram className="w-3.5 h-3.5 text-fuchsia-600" />
                    </span>
                  </IntegrationIconBox>
                }
                title="Facebook & Instagram"
                description="Publish via a Facebook Page and linked Instagram account."
                connected={!!metaIntegration}
                summary={
                  metaIntegration
                    ? String(metaIntegration.pageName ?? metaIntegration.pageId)
                    : null
                }
                onClick={() => setActiveDialog("meta")}
              />
              <IntegrationTile
                icon={
                  <IntegrationIconBox>
                    <Globe className="w-4 h-4 text-sky-500" />
                  </IntegrationIconBox>
                }
                title="Bluesky"
                description="Publish skeets via AT Protocol OAuth."
                connected={!!blueskyIntegration}
                summary={
                  blueskyIntegration
                    ? `@${String(blueskyIntegration.handle ?? blueskyIntegration.did ?? "connected")}`
                    : null
                }
                onClick={() => setActiveDialog("bluesky")}
              />
              <IntegrationTile
                icon={
                  <IntegrationIconBox>
                    <Globe className="w-4 h-4 text-violet-500" />
                  </IntegrationIconBox>
                }
                title="Mastodon"
                description="Publish toots to your Mastodon instance."
                connected={!!mastodonIntegration}
                summary={
                  mastodonIntegration
                    ? `@${String(mastodonIntegration.username ?? "connected")}`
                    : null
                }
                onClick={() => setActiveDialog("mastodon")}
              />
            </div>
          </IntegrationCategorySection>
        ) : null}

        <Dialog open={activeDialog != null} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="max-w-xl gap-0 overflow-y-auto p-0 sm:max-w-2xl max-h-[88vh]">
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
            <div className="p-6">{renderDialogBody()}</div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
          onConnected={(updated) => handleConnected(updated, destination.label)}
          onDisconnected={handleDisconnected}
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
              ? isDisconnectingLinkedin
              : isDisconnectingTwitter
          }
          onConnect={() => {
            if (destination.oauthPath) onConnectOAuth(destination.oauthPath);
          }}
          onDisconnect={() => {
            onDisconnectSocial(destination.id as "linkedin" | "twitter");
          }}
        />
      ))}

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Facebook className="w-4 h-4 text-blue-700" />
                <Instagram className="w-4 h-4 text-fuchsia-600" />
                Facebook & Instagram
                {metaIntegration && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Requires a Facebook Page with a linked Instagram Business account. Instagram text posts
                use a placeholder image until you attach media (see Help).
              </CardDescription>
            </div>
            {metaIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnectSocial("meta")}
                disabled={isDisconnectingMeta}
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                {isDisconnectingMeta ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                )}
                Disconnect
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {metaPageToken && metaPages.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select a Facebook Page to connect:</p>
              {metaPages.map((page) => (
                <Button
                  key={page.pageId}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={isSelectingMetaPage}
                  onClick={() => onSelectMetaPage(page.pageId)}
                >
                  <span className="font-medium">{page.pageName}</span>
                  {page.instagramUsername && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      @{page.instagramUsername}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          ) : metaIntegration ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Page:</span>{" "}
                {String(metaIntegration.pageName ?? metaIntegration.pageId)}
              </p>
              {metaIntegration.instagramUsername ? (
                <p>
                  <span className="font-medium text-foreground">Instagram:</span> @
                  {String(metaIntegration.instagramUsername)}
                </p>
              ) : null}
              <HealthBadge health={healthStatus?.meta} />
              {healthStatus?.meta && !healthStatus.meta.ok ? (
                <Button size="sm" variant="outline" onClick={() => onConnectOAuth("meta")}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reconnect Meta
                </Button>
              ) : null}
            </div>
          ) : (
            <Button size="sm" onClick={() => onConnectOAuth("meta")}>
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Connect Meta
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-4 h-4 text-sky-500" />
                Bluesky
                {blueskyIntegration && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Connect via AT Protocol OAuth to publish skeets from Content Studio.
              </CardDescription>
            </div>
            {blueskyIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnectSocial("bluesky")}
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
                Disconnect
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {blueskyIntegration ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Account:</span> @
                {String(blueskyIntegration.handle ?? blueskyIntegration.did ?? "connected")}
              </p>
              <HealthBadge health={healthStatus?.bluesky} />
              {healthStatus?.bluesky && !healthStatus.bluesky.ok ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const handle = String(blueskyIntegration.handle ?? "");
                    if (handle) onConnectOAuth("bluesky", { handle });
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reconnect Bluesky
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bluesky-handle">Bluesky handle</Label>
                <Input
                  id="bluesky-handle"
                  placeholder="you.bsky.social"
                  value={blueskyHandle}
                  onChange={(e) => setBlueskyHandle(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={!blueskyHandle.trim()}
                onClick={() => onConnectOAuth("bluesky", { handle: blueskyHandle.trim() })}
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                Connect Bluesky
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-4 h-4 text-violet-500" />
                Mastodon
                {mastodonIntegration && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your Mastodon instance to publish toots from Content Studio.
              </CardDescription>
            </div>
            {mastodonIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnectSocial("mastodon")}
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <Unlink className="w-3.5 h-3.5 mr-1.5" />
                Disconnect
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mastodonIntegration ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Account:</span> @
                {String(mastodonIntegration.username ?? "connected")}
              </p>
              <p>
                <span className="font-medium text-foreground">Instance:</span>{" "}
                {String(mastodonIntegration.instanceUrl ?? "")}
              </p>
              <HealthBadge health={healthStatus?.mastodon} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mastodon-instance">Instance URL</Label>
                <Input
                  id="mastodon-instance"
                  placeholder="mastodon.social"
                  value={mastodonInstance}
                  onChange={(e) => setMastodonInstance(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={!mastodonInstance.trim()}
                onClick={() => onConnectOAuth("mastodon", { instance: mastodonInstance.trim() })}
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                Connect Mastodon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
