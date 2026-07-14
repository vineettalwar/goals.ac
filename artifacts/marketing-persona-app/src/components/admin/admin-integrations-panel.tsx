"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlatformIntegrationBrandIcon } from "@/components/platform-integration-brand-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  IntegrationIconBox,
  IntegrationTile,
} from "@/components/integration-tile";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-secrets";
import {
  getPlatformIntegrationsByCategory,
  integrationEnvReady,
  type IntegrationEnvStatus,
  type PlatformIntegrationCategoryId,
  type PlatformIntegrationDefinition,
  type PlatformIntegrationId,
  type PlatformIntegrationSettingsKey,
} from "@/lib/platform/platform-features";

interface PlatformSettingsResponse {
  stripeBillingEnabled: boolean;
  emailEnabled: boolean;
}

type ToggleKey = PlatformIntegrationSettingsKey;
type ActiveDialog = PlatformIntegrationId | null;

export type AdminIntegrationsCounts = {
  total: number;
  billing: number;
  email: number;
  media: number;
};

function IntegrationTilesGrid({
  definitions,
  settings,
  env,
  status,
  onSelect,
}: {
  definitions: PlatformIntegrationDefinition[];
  settings: PlatformSettingsResponse;
  env: IntegrationEnvStatus;
  status: PlatformIntegrationStatus;
  onSelect: (id: PlatformIntegrationId) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {definitions.map((definition) => {
        const configured = isIntegrationConfigured(definition, env, status);
        const enabled = isIntegrationEnabled(definition, settings);
        const active = isIntegrationActive(definition, settings, env, status);
        const pending = isIntegrationPending(definition, settings, env, status);
        const managedByEnv = isIntegrationManagedByEnv(definition, status);
        const summary = integrationSummary(
          configured,
          enabled,
          active,
          getIntegrationLastFour(definition, status),
          managedByEnv,
        );

        return (
          <IntegrationTile
            key={definition.id}
            compact
            icon={
              <IntegrationIconBox className="border-0 bg-transparent p-0">
                <PlatformIntegrationBrandIcon id={definition.id} />
              </IntegrationIconBox>
            }
            title={definition.label}
            description={definition.description}
            connected={active}
            pending={pending}
            summary={summary}
            onClick={() => onSelect(definition.id)}
          />
        );
      })}
    </div>
  );
}

function IntegrationsHintBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
      <p className="text-sm text-muted-foreground">
        Click an integration to connect or manage settings.
      </p>
    </div>
  );
}

function SecretField({
  id,
  label,
  placeholder,
  value,
  onChange,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs"
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EnvManagedBanner({ envVars }: { envVars: string[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Managed via server environment</p>
      <p className="mt-1">
        Set these in your deployment env vars and restart the server. Values cannot be changed from
        admin.
      </p>
      {envVars.length > 0 ? (
        <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
          {envVars.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EnvVarChecklist({
  envVars,
}: {
  envVars: PlatformIntegrationDefinition["envVars"];
}) {
  return (
    <ul className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      {envVars.map((envVar) => (
        <li key={envVar.name} className="flex items-center justify-between gap-3 text-xs">
          <span className="font-mono text-[11px]">{envVar.name}</span>
          <span
            className={
              envVar.configured
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }
          >
            {envVar.configured ? "Set" : envVar.required ? "Missing" : "Optional"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SourceNote({
  configured,
  source,
  lastFour,
  managedByEnv,
}: {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour?: string | null;
  managedByEnv?: boolean;
}) {
  if (managedByEnv) return null;
  if (!configured) {
    return <p className="text-[11px] text-muted-foreground">Not configured yet.</p>;
  }
  if (source === "env") {
    return (
      <p className="text-[11px] text-muted-foreground">
        Loaded from server environment{lastFour ? ` (••••${lastFour})` : ""}.
      </p>
    );
  }
  return (
    <p className="text-[11px] text-muted-foreground">
      Stored securely{lastFour ? ` — ends with ••••${lastFour}` : ""}.
    </p>
  );
}

function integrationSummary(
  configured: boolean,
  enabled: boolean | undefined,
  active: boolean,
  lastFour?: string | null,
  managedByEnv?: boolean,
): string {
  if (managedByEnv) return lastFour ? `Env configured · ••••${lastFour}` : "Env configured";
  if (active) return lastFour ? `Active · ••••${lastFour}` : "Active";
  if (enabled && !configured) return "Enabled — needs credentials";
  if (configured) return lastFour ? `Configured · ••••${lastFour}` : "Configured";
  return "Not configured";
}

function isStripeApiConfigured(
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  return env.stripe || status.stripe.connect.connected || status.stripe.secretKey.configured;
}

function isIntegrationConfigured(
  definition: PlatformIntegrationDefinition,
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  if (definition.kind === "env") {
    return integrationEnvReady(definition);
  }
  if (definition.id === "stripe") {
    return (
      isStripeApiConfigured(env, status) &&
      status.stripe.webhookSecret.configured &&
      status.stripe.priceGrowthMonthly.configured &&
      status.stripe.priceScaleMonthly.configured
    );
  }
  if (definition.id === "resend") return status.resend.apiKey.configured;
  if (definition.id === "unsplash") return status.unsplash.accessKey.configured;
  if (definition.id === "pexels") return status.pexels.apiKey.configured;
  return false;
}

function isIntegrationEnabled(
  definition: PlatformIntegrationDefinition,
  settings: PlatformSettingsResponse,
): boolean | undefined {
  if (!definition.settingsKey) return undefined;
  return settings[definition.settingsKey];
}

function isIntegrationActive(
  definition: PlatformIntegrationDefinition,
  settings: PlatformSettingsResponse,
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  const configured = isIntegrationConfigured(definition, env, status);
  if (!definition.settingsKey) {
    return configured;
  }
  const enabled = isIntegrationEnabled(definition, settings);
  return Boolean(enabled && configured);
}

function isIntegrationPending(
  definition: PlatformIntegrationDefinition,
  settings: PlatformSettingsResponse,
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  const enabled = isIntegrationEnabled(definition, settings);
  if (enabled === undefined) return false;
  return enabled && !isIntegrationConfigured(definition, env, status);
}

function getIntegrationLastFour(
  definition: PlatformIntegrationDefinition,
  status: PlatformIntegrationStatus,
): string | null {
  if (definition.id === "stripe") {
    if (status.stripe.connect.connected) return status.stripe.connect.lastFour;
    return status.stripe.secretKey.lastFour;
  }
  if (definition.id === "resend") return status.resend.apiKey.lastFour;
  if (definition.id === "unsplash") return status.unsplash.accessKey.lastFour;
  if (definition.id === "pexels") return status.pexels.apiKey.lastFour;
  return null;
}

function isIntegrationManagedByEnv(
  definition: PlatformIntegrationDefinition,
  status: PlatformIntegrationStatus,
): boolean {
  if (definition.id === "stripe") return status.stripe.managedByEnv;
  if (definition.id === "resend") return status.resend.managedByEnv;
  if (definition.id === "unsplash") return status.unsplash.managedByEnv;
  if (definition.id === "pexels") return status.pexels.managedByEnv;
  return definition.kind === "env";
}

export function useAdminIntegrationsController() {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [env, setEnv] = useState<IntegrationEnvStatus | null>(null);
  const [definitions, setDefinitions] = useState<PlatformIntegrationDefinition[]>([]);
  const [status, setStatus] = useState<PlatformIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [savingToggle, setSavingToggle] = useState<ToggleKey | null>(null);
  const [savingStripe, setSavingStripe] = useState(false);
  const [savingResend, setSavingResend] = useState(false);
  const [savingUnsplash, setSavingUnsplash] = useState(false);
  const [savingPexels, setSavingPexels] = useState(false);

  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [stripePriceGrowth, setStripePriceGrowth] = useState("");
  const [stripePriceScale, setStripePriceScale] = useState("");

  const [showStripeManualKey, setShowStripeManualKey] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const searchParams = useSearchParams();

  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [unsplashAccessKey, setUnsplashAccessKey] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");

  const groupedIntegrations = useMemo(() => getPlatformIntegrationsByCategory(), []);

  const activeDefinition = useMemo(
    () => definitions.find((definition) => definition.id === activeDialog) ?? null,
    [activeDialog, definitions],
  );

  const resetFormFields = useCallback((dialog: ActiveDialog) => {
    if (dialog === "stripe") {
      setStripeSecretKey("");
      setStripeWebhookSecret("");
    } else if (dialog === "resend") {
      setResendApiKey("");
    } else if (dialog === "unsplash") {
      setUnsplashAccessKey("");
    } else if (dialog === "pexels") {
      setPexelsApiKey("");
    }
  }, []);

  const closeDialog = useCallback(() => {
    if (activeDialog) resetFormFields(activeDialog);
    setActiveDialog(null);
  }, [activeDialog, resetFormFields]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch("/api/admin/platform-settings"),
        fetch("/api/admin/platform-integrations"),
      ]);
      if (!settingsRes.ok || !statusRes.ok) throw new Error("Failed to load");
      const settingsData = (await settingsRes.json()) as PlatformSettingsResponse & {
        env: IntegrationEnvStatus;
        integrations: PlatformIntegrationDefinition[];
      };
      const statusData = (await statusRes.json()) as PlatformIntegrationStatus;
      setSettings(settingsData);
      setEnv(settingsData.env);
      setDefinitions(settingsData.integrations);
      setStatus(statusData);
      setStripePriceGrowth(statusData.stripe.priceGrowthMonthly.value ?? "");
      setStripePriceScale(statusData.stripe.priceScaleMonthly.value ?? "");
      setResendFromEmail(statusData.resend.fromEmail.value ?? "");
    } catch {
      setLoadError(true);
      toast.error("Could not load platform integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stripeStatus = searchParams.get("stripe");
    const message = searchParams.get("message");
    if (stripeStatus === "connected") {
      toast.success("Stripe account connected");
    } else if (stripeStatus === "connect_unconfigured") {
      toast.error("Set STRIPE_CONNECT_CLIENT_ID in env to enable Connect");
    } else if (stripeStatus === "connect_error") {
      toast.error(message ? decodeURIComponent(message) : "Stripe Connect failed");
    }
  }, [searchParams]);

  async function toggle(key: ToggleKey, checked: boolean) {
    setSavingToggle(key);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as PlatformSettingsResponse & {
        env: IntegrationEnvStatus;
        integrations: PlatformIntegrationDefinition[];
      };
      setSettings(data);
      setEnv(data.env);
      setDefinitions(data.integrations);
      toast.success("Integration setting updated");
    } catch {
      toast.error("Failed to save setting");
    } finally {
      setSavingToggle(null);
    }
  }

  async function saveStripe() {
    const payload: Record<string, string | null> = {};
    if (stripeSecretKey.trim()) payload.secretKey = stripeSecretKey.trim();
    if (stripeWebhookSecret.trim()) payload.webhookSecret = stripeWebhookSecret.trim();
    if (stripePriceGrowth.trim()) payload.priceGrowthMonthly = stripePriceGrowth.trim();
    if (stripePriceScale.trim()) payload.priceScaleMonthly = stripePriceScale.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter at least one Stripe field to save");
      return;
    }

    setSavingStripe(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "stripe", ...payload }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      setStripeSecretKey("");
      setStripeWebhookSecret("");
      toast.success("Stripe credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Stripe credentials");
    } finally {
      setSavingStripe(false);
    }
  }

  async function saveResend() {
    const payload: Record<string, string | null> = {};
    if (resendApiKey.trim()) payload.apiKey = resendApiKey.trim();
    if (resendFromEmail.trim()) payload.fromEmail = resendFromEmail.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter an API key or from address to save");
      return;
    }

    setSavingResend(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: "resend", ...payload }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      setResendApiKey("");
      toast.success("Resend credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Resend credentials");
    } finally {
      setSavingResend(false);
    }
  }

  async function saveUnsplash() {
    if (!unsplashAccessKey.trim()) {
      toast.error("Enter an Unsplash access key to save");
      return;
    }

    setSavingUnsplash(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "unsplash",
          accessKey: unsplashAccessKey.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      setUnsplashAccessKey("");
      toast.success("Unsplash credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Unsplash credentials");
    } finally {
      setSavingUnsplash(false);
    }
  }

  async function savePexels() {
    if (!pexelsApiKey.trim()) {
      toast.error("Enter a Pexels API key to save");
      return;
    }

    setSavingPexels(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "pexels",
          apiKey: pexelsApiKey.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      setPexelsApiKey("");
      toast.success("Pexels credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Pexels credentials");
    } finally {
      setSavingPexels(false);
    }
  }

  async function disconnectStripeOAuth() {
    setDisconnectingStripe(true);
    try {
      const res = await fetch("/api/admin/stripe-connect", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Disconnect failed");
      }
      await load();
      toast.success("Stripe account disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect Stripe");
    } finally {
      setDisconnectingStripe(false);
    }
  }

  async function clearStored(integration: "stripe" | "resend" | "unsplash" | "pexels") {
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Clear failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      if (integration === "stripe") {
        setStripePriceGrowth(data.status.stripe.priceGrowthMonthly.value ?? "");
        setStripePriceScale(data.status.stripe.priceScaleMonthly.value ?? "");
      } else {
        setResendFromEmail(data.status.resend.fromEmail.value ?? "");
      }
      toast.success("Stored credentials removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove stored credentials");
    }
  }

  const counts = useMemo<AdminIntegrationsCounts>(() => {
    if (!settings || !env || !status) {
      return { total: 0, billing: 0, email: 0, media: 0 };
    }

    const countActive = (definitions: PlatformIntegrationDefinition[]) =>
      definitions.filter((definition) =>
        isIntegrationActive(definition, settings, env, status),
      ).length;

    const countsByCategory = Object.fromEntries(
      groupedIntegrations.map(({ category, integrations }) => [
        category.id,
        countActive(integrations),
      ]),
    ) as Record<PlatformIntegrationCategoryId, number>;

    return {
      billing: countsByCategory.billing,
      email: countsByCategory.email,
      media: countsByCategory.media,
      total: groupedIntegrations.reduce(
        (sum, group) => sum + countActive(group.integrations),
        0,
      ),
    };
  }, [env, groupedIntegrations, settings, status]);

  return {
    loading,
    loadError,
    reload: load,
    settings,
    env,
    status,
    definitions,
    groupedIntegrations,
    counts,
    activeDialog,
    setActiveDialog,
    activeDefinition,
    closeDialog,
    toggle,
    saveStripe,
    saveResend,
    saveUnsplash,
    savePexels,
    disconnectStripeOAuth,
    clearStored,
    savingToggle,
    savingStripe,
    savingResend,
    savingUnsplash,
    savingPexels,
    stripeSecretKey,
    setStripeSecretKey,
    stripeWebhookSecret,
    setStripeWebhookSecret,
    stripePriceGrowth,
    setStripePriceGrowth,
    stripePriceScale,
    setStripePriceScale,
    showStripeManualKey,
    setShowStripeManualKey,
    disconnectingStripe,
    resendApiKey,
    setResendApiKey,
    resendFromEmail,
    setResendFromEmail,
    unsplashAccessKey,
    setUnsplashAccessKey,
    pexelsApiKey,
    setPexelsApiKey,
  };
}

export type AdminIntegrationsController = ReturnType<typeof useAdminIntegrationsController>;

export function AdminIntegrationsContent({
  controller,
  activeTab,
}: {
  controller: AdminIntegrationsController;
  activeTab: PlatformIntegrationCategoryId;
}) {
  const { settings, env, status, groupedIntegrations, setActiveDialog } = controller;
  if (!settings || !env || !status) return null;

  const group = groupedIntegrations.find((entry) => entry.category.id === activeTab);
  if (!group) return null;

  return (
    <div className="space-y-6">
      <IntegrationsHintBar />
      <IntegrationTilesGrid
        definitions={group.integrations}
        settings={settings}
        env={env}
        status={status}
        onSelect={setActiveDialog}
      />
    </div>
  );
}

export function AdminIntegrationsDialogs({
  controller,
}: {
  controller: AdminIntegrationsController;
}) {
  const {
    settings,
    status,
    activeDialog,
    activeDefinition,
    closeDialog,
    toggle,
    saveStripe,
    saveResend,
    saveUnsplash,
    savePexels,
    disconnectStripeOAuth,
    clearStored,
    savingToggle,
    savingStripe,
    savingResend,
    savingUnsplash,
    savingPexels,
    stripeSecretKey,
    setStripeSecretKey,
    stripeWebhookSecret,
    setStripeWebhookSecret,
    stripePriceGrowth,
    setStripePriceGrowth,
    stripePriceScale,
    setStripePriceScale,
    showStripeManualKey,
    setShowStripeManualKey,
    disconnectingStripe,
    resendApiKey,
    setResendApiKey,
    resendFromEmail,
    setResendFromEmail,
    unsplashAccessKey,
    setUnsplashAccessKey,
    pexelsApiKey,
    setPexelsApiKey,
  } = controller;

  if (!settings || !status) return null;

  const stripeStoredInDb =
    status.stripe.secretKey.source === "db" ||
    status.stripe.connect.connected ||
    status.stripe.webhookSecret.source === "db" ||
    status.stripe.priceGrowthMonthly.source === "db" ||
    status.stripe.priceScaleMonthly.source === "db";
  const resendStoredInDb =
    status.resend.apiKey.source === "db" || status.resend.fromEmail.source === "db";
  const unsplashStoredInDb = status.unsplash.accessKey.source === "db";
  const pexelsStoredInDb = status.pexels.apiKey.source === "db";

  return (
    <Dialog open={activeDialog != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg gap-0 overflow-y-auto sm:max-w-xl max-h-[88vh]">
          {activeDialog === "stripe" ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <IntegrationIconBox className="border-0 bg-transparent p-0">
                    <PlatformIntegrationBrandIcon id="stripe" />
                  </IntegrationIconBox>
                  <div>
                    <DialogTitle>Stripe</DialogTitle>
                    <DialogDescription className="mt-1">
                      Checkout, subscriptions, and customer portal.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {status.stripe.managedByEnv ? (
                  <EnvManagedBanner envVars={status.stripe.envVars} />
                ) : (
                  <>
                    {status.stripe.connectAvailable ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 space-y-3">
                        {status.stripe.connect.connected ? (
                          <>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">Stripe connected</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {status.stripe.connect.accountId}
                                {status.stripe.connect.livemode != null
                                  ? ` · ${status.stripe.connect.livemode ? "Live" : "Test"}`
                                  : null}
                              </p>
                              {status.stripe.connect.lastFour ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Access token ends with ••••{status.stripe.connect.lastFour}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <a href="/api/admin/stripe-connect">Reconnect</a>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={disconnectingStripe}
                                onClick={() => void disconnectStripeOAuth()}
                              >
                                {disconnectingStripe ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Disconnect"
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Connect your Stripe account to enable billing without pasting a secret
                              key.
                            </p>
                            <Button size="sm" asChild>
                              <a href="/api/admin/stripe-connect">Connect with Stripe</a>
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2.5">
                        Set <span className="font-mono">STRIPE_CONNECT_CLIENT_ID</span> in env
                        (Stripe Dashboard → Connect → Settings) to enable one-click Connect.
                      </p>
                    )}

                    {!status.stripe.connect.connected ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => setShowStripeManualKey((value) => !value)}
                        >
                          {showStripeManualKey ? "Hide manual API key" : "Or enter secret key manually"}
                        </button>
                        {showStripeManualKey ? (
                          <SourceNote
                            configured={status.stripe.secretKey.configured}
                            source={status.stripe.secretKey.source}
                            lastFour={status.stripe.secretKey.lastFour}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}

                <div className="space-y-3">
                  {!status.stripe.managedByEnv && showStripeManualKey && !status.stripe.connect.connected ? (
                    <SecretField
                      id="stripe-secret-key"
                      label="Secret key"
                      placeholder={
                        status.stripe.secretKey.configured
                          ? "Leave blank to keep current key"
                          : "sk_live_… or sk_test_…"
                      }
                      value={stripeSecretKey}
                      onChange={setStripeSecretKey}
                    />
                  ) : null}
                  <SecretField
                    id="stripe-webhook-secret"
                    label="Webhook signing secret"
                    placeholder={
                      status.stripe.webhookSecret.configured
                        ? "Leave blank to keep current secret"
                        : "whsec_…"
                    }
                    value={stripeWebhookSecret}
                    onChange={setStripeWebhookSecret}
                    disabled={status.stripe.managedByEnv}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-price-growth" className="text-xs">
                      Growth monthly price ID
                    </Label>
                    <Input
                      id="stripe-price-growth"
                      placeholder="price_…"
                      value={stripePriceGrowth}
                      disabled={status.stripe.managedByEnv}
                      onChange={(e) => setStripePriceGrowth(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-price-scale" className="text-xs">
                      Scale monthly price ID
                    </Label>
                    <Input
                      id="stripe-price-scale"
                      placeholder="price_…"
                      value={stripePriceScale}
                      disabled={status.stripe.managedByEnv}
                      onChange={(e) => setStripePriceScale(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <a
                    href="https://dashboard.stripe.com/settings/connect"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Stripe Connect settings
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="stripe-enabled" className="text-xs text-muted-foreground">
                      Enabled
                    </Label>
                    <Switch
                      id="stripe-enabled"
                      checked={settings.stripeBillingEnabled}
                      disabled={savingToggle === "stripeBillingEnabled"}
                      onCheckedChange={(checked) => void toggle("stripeBillingEnabled", checked)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {stripeStoredInDb && !status.stripe.managedByEnv ? (
                    <Button size="sm" variant="outline" onClick={() => void clearStored("stripe")}>
                      Remove stored values
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={closeDialog}>
                    {status.stripe.managedByEnv ? "Close" : "Cancel"}
                  </Button>
                  {!status.stripe.managedByEnv ? (
                    <Button size="sm" disabled={savingStripe} onClick={() => void saveStripe()}>
                      {savingStripe ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save credentials"
                      )}
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}

          {activeDialog === "resend" ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <IntegrationIconBox className="border-0 bg-transparent p-0">
                    <PlatformIntegrationBrandIcon id="resend" />
                  </IntegrationIconBox>
                  <div>
                    <DialogTitle>Resend</DialogTitle>
                    <DialogDescription className="mt-1">
                      Password resets, invites, and notifications.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {status.resend.managedByEnv ? (
                  <EnvManagedBanner envVars={status.resend.envVars} />
                ) : (
                  <SourceNote
                    configured={status.resend.apiKey.configured}
                    source={status.resend.apiKey.source}
                    lastFour={status.resend.apiKey.lastFour}
                  />
                )}

                <div className="space-y-3">
                  <SecretField
                    id="resend-api-key"
                    label="API key"
                    placeholder={
                      status.resend.apiKey.configured ? "Leave blank to keep current key" : "re_…"
                    }
                    value={resendApiKey}
                    onChange={setResendApiKey}
                    disabled={status.resend.managedByEnv}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="resend-from-email" className="text-xs">
                      From address
                    </Label>
                    <Input
                      id="resend-from-email"
                      type="email"
                      placeholder="noreply@yourdomain.com"
                      value={resendFromEmail}
                      disabled={status.resend.managedByEnv}
                      onChange={(e) => setResendFromEmail(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Must be a verified sender in Resend. Defaults to noreply@goals.ac if empty.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Resend dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="resend-enabled" className="text-xs text-muted-foreground">
                      Enabled
                    </Label>
                    <Switch
                      id="resend-enabled"
                      checked={settings.emailEnabled}
                      disabled={savingToggle === "emailEnabled"}
                      onCheckedChange={(checked) => void toggle("emailEnabled", checked)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {resendStoredInDb && !status.resend.managedByEnv ? (
                    <Button size="sm" variant="outline" onClick={() => void clearStored("resend")}>
                      Remove stored values
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={closeDialog}>
                    {status.resend.managedByEnv ? "Close" : "Cancel"}
                  </Button>
                  {!status.resend.managedByEnv ? (
                    <Button size="sm" disabled={savingResend} onClick={() => void saveResend()}>
                      {savingResend ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save credentials"
                      )}
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}

          {activeDialog === "unsplash" ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <IntegrationIconBox className="border-0 bg-transparent p-0">
                    <PlatformIntegrationBrandIcon id="unsplash" />
                  </IntegrationIconBox>
                  <div>
                    <DialogTitle>Unsplash</DialogTitle>
                    <DialogDescription className="mt-1">
                      Free stock photos for article featured images.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {status.unsplash.managedByEnv ? (
                  <EnvManagedBanner envVars={status.unsplash.envVars} />
                ) : (
                  <SourceNote
                    configured={status.unsplash.accessKey.configured}
                    source={status.unsplash.accessKey.source}
                    lastFour={status.unsplash.accessKey.lastFour}
                  />
                )}

                <SecretField
                  id="unsplash-access-key"
                  label="Access key"
                  placeholder={
                    status.unsplash.accessKey.configured
                      ? "Leave blank to keep current key"
                      : "Unsplash developer access key"
                  }
                  value={unsplashAccessKey}
                  onChange={setUnsplashAccessKey}
                  disabled={status.unsplash.managedByEnv}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <a
                    href="https://unsplash.com/developers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Unsplash developers
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {unsplashStoredInDb && !status.unsplash.managedByEnv ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void clearStored("unsplash")}
                    >
                      Remove stored values
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={closeDialog}>
                    {status.unsplash.managedByEnv ? "Close" : "Cancel"}
                  </Button>
                  {!status.unsplash.managedByEnv ? (
                    <Button size="sm" disabled={savingUnsplash} onClick={() => void saveUnsplash()}>
                      {savingUnsplash ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save credentials"
                      )}
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}

          {activeDialog === "pexels" ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <IntegrationIconBox className="border-0 bg-transparent p-0">
                    <PlatformIntegrationBrandIcon id="unsplash" />
                  </IntegrationIconBox>
                  <div>
                    <DialogTitle>Pexels</DialogTitle>
                    <DialogDescription className="mt-1">
                      Free stock photos for article featured images.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {status.pexels.managedByEnv ? (
                  <EnvManagedBanner envVars={status.pexels.envVars} />
                ) : (
                  <SourceNote
                    configured={status.pexels.apiKey.configured}
                    source={status.pexels.apiKey.source}
                    lastFour={status.pexels.apiKey.lastFour}
                  />
                )}

                <SecretField
                  id="pexels-api-key"
                  label="API key"
                  placeholder={
                    status.pexels.apiKey.configured
                      ? "Leave blank to keep current key"
                      : "Pexels API key"
                  }
                  value={pexelsApiKey}
                  onChange={setPexelsApiKey}
                  disabled={status.pexels.managedByEnv}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <a
                    href="https://www.pexels.com/api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Pexels API
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {pexelsStoredInDb && !status.pexels.managedByEnv ? (
                    <Button size="sm" variant="outline" onClick={() => void clearStored("pexels")}>
                      Remove stored values
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={closeDialog}>
                    {status.pexels.managedByEnv ? "Close" : "Cancel"}
                  </Button>
                  {!status.pexels.managedByEnv ? (
                    <Button size="sm" disabled={savingPexels} onClick={() => void savePexels()}>
                      {savingPexels ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save credentials"
                      )}
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}

          {activeDefinition &&
          activeDefinition.kind === "env" &&
          activeDialog !== "stripe" &&
          activeDialog !== "resend" &&
          activeDialog !== "unsplash" &&
          activeDialog !== "pexels" ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <IntegrationIconBox className="border-0 bg-transparent p-0">
                    <PlatformIntegrationBrandIcon id={activeDefinition.id} />
                  </IntegrationIconBox>
                  <div>
                    <DialogTitle>{activeDefinition.label}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {activeDefinition.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <EnvManagedBanner
                  envVars={activeDefinition.envVars.map((envVar) => envVar.name)}
                />
                <EnvVarChecklist envVars={activeDefinition.envVars} />

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  {activeDefinition.docsUrl ? (
                    <a
                      href={activeDefinition.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Developer docs
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span />
                  )}
                  {activeDefinition.settingsKey ? (
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`${activeDefinition.id}-enabled`}
                        className="text-xs text-muted-foreground"
                      >
                        Enabled
                      </Label>
                      <Switch
                        id={`${activeDefinition.id}-enabled`}
                        checked={settings[activeDefinition.settingsKey]}
                        disabled={savingToggle === activeDefinition.settingsKey}
                        onCheckedChange={(checked) =>
                          void toggle(activeDefinition.settingsKey!, checked)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter>
                <Button size="sm" variant="outline" onClick={closeDialog}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
    </Dialog>
  );
}
