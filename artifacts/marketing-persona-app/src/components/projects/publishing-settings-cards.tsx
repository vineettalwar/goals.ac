"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Link2,
  Loader2,
  Unlink,
} from "lucide-react";
import {
  PublishBrandIcon,
  type PublishBrandIconId,
} from "@workspace/app-shell/integrations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
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
  ConnectSetupSteps,
  getCmsSetupSteps,
  getSocialSetupSteps,
} from "@workspace/app-shell/integrations";
import { cn } from "@/lib/utils";
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
  readShopifyThemeSnippetRequiredFor,
  shopifyOutputModeNeedsThemeSnippet,
  ShopifyThemeSnippetPreflight,
} from "@workspace/app-shell/content-piece";
import {
  type ConnectionMethod,
  type PublishDestinationDefinition,
  type PublishDestinationId,
  getConnectionMethodLabel,
  getDefaultConnectionMethod,
  supportsMultipleConnectionMethods,
} from "@/lib/projects/publishing-destinations";

export type CmsIntegrationStatus = Record<string, unknown>;

const WIZARD_EASE = [0.16, 1, 0.3, 1] as const;

type WizardStep =
  | { kind: "method" }
  | { kind: "field"; field: ConnectionFieldDef };

export function HealthBadge({
  health,
  destinationName,
}: {
  health?: {
    ok: boolean;
    error?: string;
    recommendedOutputMode?: string;
    availableOutputModes?: string[];
    themeSnippetRequiredFor?: string[];
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
  return <PublishBrandIcon id={destination.id as PublishBrandIconId} className="h-8 w-8" />;
}

function SocialIcon({ id }: { id: PublishDestinationId }) {
  return <PublishBrandIcon id={id as PublishBrandIconId} className="h-8 w-8" />;
}

function fieldStepComplete(
  field: ConnectionFieldDef,
  value: string,
): boolean {
  if (field.required === false) return true;
  if (field.type === "select") return Boolean(value || field.defaultValue);
  return value.trim().length > 0;
}

function buildWizardSteps(
  destination: PublishDestinationDefinition,
  visibleFields: ConnectionFieldDef[],
): WizardStep[] {
  const steps: WizardStep[] = [];
  if (supportsMultipleConnectionMethods(destination.id)) {
    steps.push({ kind: "method" });
  }
  for (const field of visibleFields) {
    steps.push({ kind: "field", field });
  }
  return steps;
}

function WizardChoiceList({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div role="listbox" aria-label="Choose one" className="flex flex-col gap-2">
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-5 py-4 text-left transition-colors",
              "hover:bg-secondary/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary ring-1 ring-primary",
            )}
          >
            <span>
              <span className="block font-medium text-foreground">{option.label}</span>
              {option.hint ? (
                <span className="mt-0.5 block text-sm text-muted-foreground">{option.hint}</span>
              ) : null}
            </span>
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-xs text-muted-foreground"
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ConnectionField({
  field,
  value,
  disabled,
  onChange,
  destinationId,
  large = false,
  onEnter,
}: {
  field: ConnectionFieldDef;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  destinationId: string;
  large?: boolean;
  onEnter?: () => void;
}) {
  const fieldId = `${destinationId}-${field.key}`;
  const hintId = field.hint ? `${fieldId}-hint` : undefined;
  const requiredMark = field.required ? " *" : "";
  const hasLabel = Boolean(field.label);

  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        {hasLabel ? (
          <Label id={`${fieldId}-label`}>
            {field.label}
            {requiredMark}
          </Label>
        ) : null}
        <Select value={value || field.defaultValue || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger
            aria-labelledby={hasLabel ? `${fieldId}-label` : undefined}
            aria-label={hasLabel ? undefined : field.key}
            aria-required={field.required || undefined}
            aria-describedby={hintId}
            className={large ? "h-14 text-base" : undefined}
          >
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
        {field.hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {field.hint}
          </p>
        ) : null}
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
      {hasLabel ? (
        <Label htmlFor={fieldId}>
          {field.label}
          {requiredMark}
        </Label>
      ) : null}
      <Input
        id={fieldId}
        type={inputType}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        disabled={disabled}
        required={field.required}
        autoFocus={large}
        aria-label={hasLabel ? undefined : field.key}
        aria-required={field.required || undefined}
        aria-describedby={hintId}
        className={large ? "h-14 text-lg" : undefined}
      />
      {field.hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

function ConnectedOutputModeControl({
  platform,
  integration,
  health,
  apiBase,
  projectId,
  onUpdated,
  onError,
}: {
  platform: PublishDestinationId;
  integration: Record<string, unknown>;
  health?: { themeSnippetRequiredFor?: string[] };
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

  const themeSnippetRequiredFor =
    platform === "shopify"
      ? (health?.themeSnippetRequiredFor ??
        readShopifyThemeSnippetRequiredFor(integration))
      : null;
  const showShopifyThemeSnippetWarning =
    platform === "shopify" &&
    shopifyOutputModeNeedsThemeSnippet(currentMode, themeSnippetRequiredFor);

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
      {showShopifyThemeSnippetWarning ? <ShopifyThemeSnippetPreflight /> : null}
    </div>
  );
}

function CmsConnectWizard({
  destination,
  connectionMethod,
  setConnectionMethod,
  formValues,
  setFieldValue,
  visibleFields,
  isSaving,
  canSubmit,
  onSave,
}: {
  destination: PublishDestinationDefinition;
  connectionMethod: ConnectionMethod;
  setConnectionMethod: (method: ConnectionMethod) => void;
  formValues: Record<string, string>;
  setFieldValue: (key: string, value: string) => void;
  visibleFields: ConnectionFieldDef[];
  isSaving: boolean;
  canSubmit: boolean;
  onSave: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const steps = useMemo(
    () => buildWizardSteps(destination, visibleFields),
    [destination, visibleFields],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    setStepIndex((i) => Math.min(i, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  const step = steps[stepIndex] ?? steps[0];
  const isLast = stepIndex >= steps.length - 1;
  const progressPct =
    steps.length > 0 ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;

  function goNext() {
    if (!step) return;
    if (step.kind === "field") {
      const value = formValues[step.field.key] ?? step.field.defaultValue ?? "";
      if (!fieldStepComplete(step.field, value)) {
        setStepError(`${step.field.label} is required`);
        return;
      }
    }
    setStepError(null);
    if (isLast) {
      if (!canSubmit) return;
      onSave();
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setStepError(null);
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }

  const variants = reduceMotion
    ? { enter: { opacity: 1, x: 0 }, center: { opacity: 1, x: 0 }, exit: { opacity: 1, x: 0 } }
    : {
        enter: (dir: 1 | -1) => ({ opacity: 0, x: dir === 1 ? 28 : -28 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: 1 | -1) => ({ opacity: 0, x: dir === 1 ? -28 : 28 }),
      };

  const question =
    step?.kind === "method"
      ? "How do you want to connect?"
      : (step?.field.label ?? "Connect");
  const helper =
    step?.kind === "method"
      ? destination.description
      : (step?.field.hint ?? null);

  const stepKey =
    step?.kind === "method" ? "method" : `field:${step?.field.key ?? "none"}`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <DestinationBadge destination={destination} />
            {destination.label}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </p>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {stepIndex > 0 ? (
        <button
          type="button"
          onClick={goBack}
          disabled={isSaving}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
      ) : null}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: WIZARD_EASE }}
          className="space-y-5"
        >
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {question}
            </h3>
            {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
          </div>

          {step?.kind === "method" ? (
            <WizardChoiceList
              value={connectionMethod}
              onSelect={(value) => {
                setConnectionMethod(value as ConnectionMethod);
                setStepError(null);
                setDirection(1);
                setStepIndex(1);
              }}
              options={destination.connectionMethods.map((method) => ({
                value: method,
                label: getConnectionMethodLabel(destination.id, method),
              }))}
            />
          ) : null}

          {step?.kind === "field" && step.field.type === "select" && step.field.options ? (
            <WizardChoiceList
              value={formValues[step.field.key] || step.field.defaultValue || ""}
              onSelect={(value) => {
                setFieldValue(step.field.key, value);
                setStepError(null);
                if (isLast) {
                  // leave user on last step with Connect CTA
                  return;
                }
                setDirection(1);
                setStepIndex((i) => i + 1);
              }}
              options={step.field.options.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          ) : null}

          {step?.kind === "field" && step.field.type !== "select" ? (
            <ConnectionField
              destinationId={destination.id}
              field={{ ...step.field, label: "", hint: undefined }}
              value={formValues[step.field.key] ?? step.field.defaultValue ?? ""}
              disabled={isSaving}
              onChange={(value) => {
                setFieldValue(step.field.key, value);
                setStepError(null);
              }}
              large
              onEnter={goNext}
            />
          ) : null}

          {stepError ? (
            <p role="alert" className="text-sm text-destructive">
              {stepError}
            </p>
          ) : null}

          {step?.kind === "field" && (step.field.type !== "select" || isLast) ? (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={goNext} disabled={isSaving || (isLast && !canSubmit)} size="default">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                    Connecting…
                  </>
                ) : isLast ? (
                  <>
                    <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
                    Connect {destination.label}
                  </>
                ) : (
                  <>
                    OK
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </>
                )}
              </Button>
              {!isLast ? (
                <span className="text-xs text-muted-foreground">press Enter ↵</span>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
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
  health?: {
    ok: boolean;
    error?: string;
    themeSnippetRequiredFor?: string[];
  };
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

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-base font-semibold">
          <DestinationBadge destination={destination} />
          {destination.label}
          {integration && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{destination.description}</p>
      </div>
      {integration && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/5"
        >
          {isDisconnecting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              Disconnecting…
            </>
          ) : (
            <Unlink className="mr-1.5 h-3.5 w-3.5" />
          )}
          Disconnect
        </Button>
      )}
    </div>
  );

  const connectedBody = integration ? (
    <div className="space-y-3 text-sm text-muted-foreground">
      {schema.connectedDetails(integration).flatMap((row) =>
        row.label === "Output format"
          ? []
          : [
              (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{row.label}:</span>
                  <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {row.value}
                  </code>
                </div>
              ),
            ],
      )}
      <ConnectedOutputModeControl
        platform={destination.id}
        integration={integration}
        health={health}
        apiBase={apiBase}
        projectId={projectId}
        onUpdated={onConnected}
        onError={onError}
      />
      <HealthBadge health={health} destinationName={destination.label} />
      <p className="mt-2 text-xs text-muted-foreground">
        To update credentials, disconnect first then re-connect.
      </p>
    </div>
  ) : null;

  const stackedForm = !integration ? (
    <div className="space-y-4">
      {destination.category !== "esp" ? (
        <ConnectSetupSteps
          steps={getCmsSetupSteps(destination.id, destination.label)}
        />
      ) : null}
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
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Connect {destination.label}
          </>
        )}
      </Button>
    </div>
  ) : null;

  if (embedded) {
    if (!integration) {
      return (
        <CmsConnectWizard
          destination={destination}
          connectionMethod={connectionMethod}
          setConnectionMethod={setConnectionMethod}
          formValues={formValues}
          setFieldValue={setFieldValue}
          visibleFields={visibleFields}
          isSaving={isSaving}
          canSubmit={schema.canSubmit(formValues, connectionMethod)}
          onSave={handleSave}
        />
      );
    }
    return (
      <div className="space-y-4">
        {header}
        {connectedBody}
      </div>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>{header}</CardHeader>
      <CardContent>{integration ? connectedBody : stackedForm}</CardContent>
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

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-base font-semibold">
          <SocialIcon id={destination.id} />
          {destination.label}
          {integration && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{destination.description}</p>
      </div>
      {integration && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/5"
        >
          {isDisconnecting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              Disconnecting…
            </>
          ) : (
            <Unlink className="mr-1.5 h-3.5 w-3.5" />
          )}
          Disconnect
        </Button>
      )}
    </div>
  );

  const body = integration ? (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">Account:</span> {accountLabel}
      </p>
      <HealthBadge health={health} destinationName={destination.label} />
    </div>
  ) : (
    <div className="space-y-3">
      <ConnectSetupSteps steps={getSocialSetupSteps(destination.id)} />
      <Button size="sm" onClick={onConnect}>
        <Link2 className="mr-1.5 h-3.5 w-3.5" />
        Connect {destination.label}
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {header}
        {body}
      </div>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>{header}</CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

export { CmsConnectionCard, SocialConnectionCard, SocialIcon, DestinationBadge };
