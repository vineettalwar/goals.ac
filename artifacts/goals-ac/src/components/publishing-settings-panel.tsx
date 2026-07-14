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
} from "@/lib/cms-connection-schemas";
import {
  isPublishingActionPending,
  type PublishingPendingAction,
} from "@/components/publishing-settings-pending";
import {
  type ConnectionMethod,
  type PublishDestinationDefinition,
  type PublishDestinationId,
  getCmsDestinations,
  getConnectionMethodLabel,
  getDefaultConnectionMethod,
  getSocialDestinations,
  hasAnyPublishingConnection,
  supportsMultipleConnectionMethods,
} from "@/lib/publishing-destinations";

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
      <label htmlFor={field.key} className="text-sm font-medium">{field.label}</label>
      <Input
        id={field.key}
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
  token,
  onConnected,
  onDisconnected,
  onError,
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
}) {
  const schema = getCmsConnectionSchema(destination.id);
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(() =>
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
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
          headers: { Authorization: `Bearer ${token}` },
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
    <Card className="border shadow-sm">
      <CardHeader>
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
      <CardContent>
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
}: {
  destination: PublishDestinationDefinition;
  integration?: Record<string, unknown>;
  health?: { ok: boolean; error?: string };
  apiBase: string;
  projectId: string;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const accountLabel =
    destination.id === "linkedin"
      ? String(integration?.displayName ?? "Connected")
      : destination.id === "twitter"
        ? `@${String(integration?.screenName ?? "connected")}`
        : "Connected";

  return (
    <Card className="border shadow-sm">
      <CardHeader>
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
      <CardContent>
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
  onConnectOAuth: (path: string) => void;
  onDisconnectSocial: (platform: "linkedin" | "twitter" | "meta") => void;
  onSelectMetaPage: (pageId: string) => void;
}) {
  const cmsDestinations = getCmsDestinations();
  const socialDestinations = getSocialDestinations();
  const metaIntegration = cmsIntegrations.meta as Record<string, unknown> | undefined;

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

  return (
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
      {hasAnyPublishingConnection(cmsIntegrations) && (
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onTestHealth} disabled={isPublishingActionPending(pendingAction, "testing_health")}>
            {isPublishingActionPending(pendingAction, "testing_health") ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Test connections
          </Button>
        </div>
      )}

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
              ? isPublishingActionPending(pendingAction, "disconnecting_linkedin")
              : isPublishingActionPending(pendingAction, "disconnecting_twitter")
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
                Requires a Facebook Page with a linked Instagram Business account.
              </CardDescription>
            </div>
            {metaIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnectSocial("meta")}
                disabled={isPublishingActionPending(pendingAction, "disconnecting_meta")}
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                {isPublishingActionPending(pendingAction, "disconnecting_meta") ? (
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
                  disabled={isPublishingActionPending(pendingAction, "selecting_meta_page")}
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
            </div>
          ) : (
            <Button size="sm" onClick={() => onConnectOAuth("meta")}>
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Connect Meta
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
