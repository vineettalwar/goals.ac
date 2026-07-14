"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
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
import { IntegrationIconBox, IntegrationTile } from "@/components/integration-tile";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-secrets";

interface PlatformSettingsResponse {
  stripeBillingEnabled: boolean;
  emailEnabled: boolean;
}

type ToggleKey = "stripeBillingEnabled" | "emailEnabled";
type ActiveDialog = "stripe" | "resend" | null;

function IntegrationsSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="h-[72px] rounded-xl bg-secondary/50" />
      ))}
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
        These credentials are set in deployment env vars and cannot be changed here. Remove the env
        vars and restart the server to configure from admin instead.
      </p>
      {envVars.length > 0 ? (
        <ul className="mt-2 space-y-0.5 font-mono text-[11px]">
          {envVars.map((name) => (
            <li key={name}>{name}=••••</li>
          ))}
        </ul>
      ) : null}
    </div>
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
  enabled: boolean,
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

export function AdminIntegrationsPanel() {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [status, setStatus] = useState<PlatformIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [savingToggle, setSavingToggle] = useState<ToggleKey | null>(null);
  const [savingStripe, setSavingStripe] = useState(false);
  const [savingResend, setSavingResend] = useState(false);

  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [stripePriceGrowth, setStripePriceGrowth] = useState("");
  const [stripePriceScale, setStripePriceScale] = useState("");

  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");

  const resetFormFields = useCallback((dialog: ActiveDialog) => {
    if (dialog === "stripe") {
      setStripeSecretKey("");
      setStripeWebhookSecret("");
    } else if (dialog === "resend") {
      setResendApiKey("");
    }
  }, []);

  const closeDialog = useCallback(() => {
    if (activeDialog) resetFormFields(activeDialog);
    setActiveDialog(null);
  }, [activeDialog, resetFormFields]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch("/api/admin/platform-settings"),
        fetch("/api/admin/platform-integrations"),
      ]);
      if (!settingsRes.ok || !statusRes.ok) throw new Error("Failed to load");
      const settingsData = (await settingsRes.json()) as PlatformSettingsResponse;
      const statusData = (await statusRes.json()) as PlatformIntegrationStatus;
      setSettings(settingsData);
      setStatus(statusData);
      setStripePriceGrowth(statusData.stripe.priceGrowthMonthly.value ?? "");
      setStripePriceScale(statusData.stripe.priceScaleMonthly.value ?? "");
      setResendFromEmail(statusData.resend.fromEmail.value ?? "");
    } catch {
      toast.error("Could not load platform integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      const data = (await res.json()) as PlatformSettingsResponse;
      setSettings(data);
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

  async function clearStored(integration: "stripe" | "resend") {
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

  if (loading || !settings || !status) return <IntegrationsSkeleton />;

  const stripeReady =
    status.stripe.secretKey.configured &&
    status.stripe.webhookSecret.configured &&
    status.stripe.priceGrowthMonthly.configured &&
    status.stripe.priceScaleMonthly.configured;
  const stripeActive = settings.stripeBillingEnabled && stripeReady;
  const resendActive = settings.emailEnabled && status.resend.apiKey.configured;

  const stripeStoredInDb =
    status.stripe.secretKey.source === "db" ||
    status.stripe.webhookSecret.source === "db" ||
    status.stripe.priceGrowthMonthly.source === "db" ||
    status.stripe.priceScaleMonthly.source === "db";
  const resendStoredInDb =
    status.resend.apiKey.source === "db" || status.resend.fromEmail.source === "db";

  const stripeSummary = integrationSummary(
    stripeReady,
    settings.stripeBillingEnabled,
    stripeActive,
    status.stripe.secretKey.lastFour,
    status.stripe.managedByEnv,
  );
  const resendSummary = integrationSummary(
    status.resend.apiKey.configured,
    settings.emailEnabled,
    resendActive,
    status.resend.apiKey.lastFour,
    status.resend.managedByEnv,
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Platform-wide billing and email services. When not set in server env vars, credentials can
        be saved here (encrypted at rest). Env vars always take precedence and lock the admin form.
        Google, Bing, social, CMS, and other connections stay per project in{" "}
        <Link href="/integrations" className="text-primary hover:underline">
          project Integrations
        </Link>
        .
      </p>

      <p className="text-sm text-muted-foreground border-b border-border/50 pb-4">
        Click an integration to configure credentials and settings.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <IntegrationTile
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          title="Stripe"
          description="Checkout, subscriptions, and customer portal."
          connected={stripeActive}
          pending={settings.stripeBillingEnabled && !stripeReady}
          summary={stripeSummary}
          onClick={() => setActiveDialog("stripe")}
        />
        <IntegrationTile
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          title="Resend"
          description="Password resets, invites, and notifications."
          connected={resendActive}
          pending={settings.emailEnabled && !status.resend.apiKey.configured}
          summary={resendSummary}
          onClick={() => setActiveDialog("resend")}
        />
      </div>

      <Dialog open={activeDialog != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg gap-0 overflow-y-auto sm:max-w-xl max-h-[88vh]">
          {activeDialog === "stripe" ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <IntegrationIconBox>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
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
                  <SourceNote
                    configured={status.stripe.secretKey.configured}
                    source={status.stripe.secretKey.source}
                    lastFour={status.stripe.secretKey.lastFour}
                  />
                )}

                <div className="space-y-3">
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
                    disabled={status.stripe.managedByEnv}
                  />
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
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Stripe dashboard
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void clearStored("stripe")}
                    >
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
                      {savingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
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
                  <IntegrationIconBox>
                    <Mail className="h-4 w-4 text-muted-foreground" />
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
                      status.resend.apiKey.configured
                        ? "Leave blank to keep current key"
                        : "re_…"
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void clearStored("resend")}
                    >
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
                      {savingResend ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save credentials"}
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
