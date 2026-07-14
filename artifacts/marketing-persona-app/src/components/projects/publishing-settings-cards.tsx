"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Link2,
  Linkedin,
  Loader2,
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
  type ConnectionMethod,
  type PublishDestinationDefinition,
  type PublishDestinationId,
  getConnectionMethodLabel,
  getDefaultConnectionMethod,
  supportsMultipleConnectionMethods,
} from "@/lib/projects/publishing-destinations";
export type CmsIntegrationStatus = Record<string, unknown>;

export function HealthBadge({
  health,
  destinationName,
}: {
  health?: {
    ok: boolean;
    error?: string;
    recommendedOutputMode?: string;
    availableOutputModes?: string[];
  };
  destinationName?: string;
}) {
  if (!health) return null;
  const message = health.ok
    ? `${destinationName ? `${destinationName}: ` : ""}Connection healthy`
    : `${destinationName ? `${destinationName}: ` : ""}${health.error ?? "Connection failed"}`;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-1 text-xs font-medium mt-1 ${health.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
    >
      <div className="flex items-center gap-1.5">
        {health.ok ? (
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
        ) : (
          <AlertCircle className="w-3.5 h-3.5" aria-hidden />
        )}
        {message}
      </div>
      {health.ok && health.recommendedOutputMode ? (
        <p className="text-muted-foreground font-normal pl-5">
          Recommended output: {health.recommendedOutputMode}
        </p>
      ) : null}
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
  destinationId,
}: {
  field: ConnectionFieldDef;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  destinationId: string;
}) {
  const fieldId = `${destinationId}-${field.key}`;
  const hintId = field.hint ? `${fieldId}-hint` : undefined;
  const requiredMark = field.required ? " *" : "";

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <Label id={`${fieldId}-label`}>
          {field.label}
          {requiredMark}
        </Label>
        <Select value={value || field.defaultValue || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger aria-labelledby={`${fieldId}-label`} aria-required={field.required || undefined} aria-describedby={hintId}>
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
        {field.hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {field.hint}
          </p>
        )}
      </div>
    );
  }

  const inputType =
    field.type === "password"
      ? "password"
      : field.type === "number"
        ? "number"
        : field.type === "url"
          ? "url"
          : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>
        {field.label}
        {requiredMark}
      </Label>
      <Input
        id={fieldId}
        type={inputType}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={field.required}
        aria-required={field.required || undefined}
        aria-describedby={hintId}
      />
      {field.hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {field.hint}
        </p>
      )}
    </div>
  );
}

function ConnectedOutputModeControl({
  platform,
  integration,
  apiBase,
  projectId,
  onUpdated,
  onError,
}: {
  platform: PublishDestinationId;
  integration: Record<string, unknown>;
  apiBase: string;
  projectId: string;
  onUpdated: (updated: CmsIntegrationStatus) => void;
  onError: (message: string) => void;
}) {
  const fixedLabel = getFixedOutputModeLabel(platform);
  const modeOptions = getOutputModes(platform);
  const [isSaving, setIsSaving] = useState(false);

  if (fixedLabel) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">Output format:</span>
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {fixedLabel}
        </span>
      </div>
    );
  }

  if (modeOptions.length === 0) return null;

  const currentMode = String(
    integration.outputMode ?? integration.editorMode ?? getDefaultOutputMode(platform),
  );

  const handleChange = async (outputMode: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(
        `${apiBase}/api/website-projects/${projectId}/cms-integrations/${platform}/output-mode`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outputMode }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update output format");
      }
      const updated = (await res.json()) as CmsIntegrationStatus;
      onUpdated(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update output format");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${platform}-output-mode`}>Output format</Label>
      <Select value={currentMode} onValueChange={handleChange} disabled={isSaving}>
        <SelectTrigger id={`${platform}-output-mode`} className="max-w-md">
          <SelectValue>{outputModeLabel(platform, currentMode)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {modeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {modeOptions.find((option) => option.value === currentMode)?.hint ? (
        <p className="text-xs text-muted-foreground">
          {modeOptions.find((option) => option.value === currentMode)?.hint}
        </p>
      ) : null}
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
    const selectedOutputMode =
      (formValues.outputMode ?? formValues.editorMode ?? "").trim() ||
      getDefaultOutputMode(destination.id);
    const userPickedOutputMode =
      Boolean(formValues.outputMode || formValues.editorMode) &&
      selectedOutputMode !== getDefaultOutputMode(destination.id);

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
      let updated = (await res.json()) as CmsIntegrationStatus;

      if (getOutputModes(destination.id).length > 0 && !userPickedOutputMode) {
        try {
          const testRes = await fetch(
            `${apiBase}/api/website-projects/${projectId}/cms-integrations/test?platform=${destination.integrationKey}`,
            { method: "POST" },
          );
          if (testRes.ok) {
            const healthData = (await testRes.json()) as Record<
              string,
              { ok?: boolean; recommendedOutputMode?: string }
            >;
            const recommended = healthData[destination.integrationKey]?.recommendedOutputMode;
            if (recommended && recommended !== selectedOutputMode) {
              const patchRes = await fetch(
                `${apiBase}/api/website-projects/${projectId}/cms-integrations/${destination.integrationKey}/output-mode`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outputMode: recommended }),
                },
              );
              if (patchRes.ok) {
                updated = (await patchRes.json()) as CmsIntegrationStatus;
                toast.success(
                  `Output format set to ${outputModeLabel(destination.id, recommended)} based on your site`,
                );
              }
            }
          }
        } catch {
          // Best-effort — connection still saved
        }
      }

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
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                  Disconnecting…
                </>
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
          <div className="space-y-3 text-sm text-muted-foreground">
            {schema.connectedDetails(integration).flatMap((row) =>
              row.label === "Output format"
                ? []
                : [
                    (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{row.label}:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">
                          {row.value}
                        </code>
                      </div>
                    ),
                  ],
            )}
            <ConnectedOutputModeControl
              platform={destination.id}
              integration={integration}
              apiBase={apiBase}
              projectId={projectId}
              onUpdated={onConnected}
              onError={onError}
            />
            <HealthBadge health={health} destinationName={destination.label} />
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
                destinationId={destination.id}
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
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                  Disconnecting…
                </>
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
            <HealthBadge health={health} destinationName={destination.label} />
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

export { CmsConnectionCard, SocialConnectionCard, SocialIcon, DestinationBadge };
