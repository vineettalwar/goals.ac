"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-types";
import type {
  IntegrationEnvStatus,
  PlatformIntegrationDefinition,
} from "@/lib/platform/platform-features";
import type {
  PlatformSettingsResponse,
  ToggleKey,
} from "./admin-integrations-helpers";
import type { AdminIntegrationsFormState } from "./admin-integrations-form-state";

type StatusSetter = (status: PlatformIntegrationStatus) => void;

type SettingsBundle = PlatformSettingsResponse & {
  env: IntegrationEnvStatus;
  integrations: PlatformIntegrationDefinition[];
};

export function useAdminIntegrationsCredentialActions(deps: {
  setStatus: StatusSetter;
  setSettings: (data: PlatformSettingsResponse) => void;
  setEnv: (env: IntegrationEnvStatus) => void;
  setDefinitions: (defs: PlatformIntegrationDefinition[]) => void;
  form: AdminIntegrationsFormState;
  load: () => Promise<void>;
}) {
  const { setStatus, setSettings, setEnv, setDefinitions, form, load } = deps;

  const [savingToggle, setSavingToggle] = useState<ToggleKey | null>(null);
  const [savingStripe, setSavingStripe] = useState(false);
  const [savingResend, setSavingResend] = useState(false);
  const [savingUnsplash, setSavingUnsplash] = useState(false);
  const [savingPexels, setSavingPexels] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);

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
      const data = (await res.json()) as SettingsBundle;
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
    if (form.stripeSecretKey.trim()) payload.secretKey = form.stripeSecretKey.trim();
    if (form.stripeWebhookSecret.trim()) payload.webhookSecret = form.stripeWebhookSecret.trim();
    if (form.stripePriceGrowth.trim()) payload.priceGrowthMonthly = form.stripePriceGrowth.trim();
    if (form.stripePriceScale.trim()) payload.priceScaleMonthly = form.stripePriceScale.trim();

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
      form.setStripeSecretKey("");
      form.setStripeWebhookSecret("");
      toast.success("Stripe credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Stripe credentials");
    } finally {
      setSavingStripe(false);
    }
  }

  async function saveResend() {
    const payload: Record<string, string | null> = {};
    if (form.resendApiKey.trim()) payload.apiKey = form.resendApiKey.trim();
    if (form.resendFromEmail.trim()) payload.fromEmail = form.resendFromEmail.trim();

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
      form.setResendApiKey("");
      toast.success("Resend credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Resend credentials");
    } finally {
      setSavingResend(false);
    }
  }

  async function saveUnsplash() {
    if (!form.unsplashAccessKey.trim()) {
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
          accessKey: form.unsplashAccessKey.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setUnsplashAccessKey("");
      toast.success("Unsplash credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Unsplash credentials");
    } finally {
      setSavingUnsplash(false);
    }
  }

  async function savePexels() {
    if (!form.pexelsApiKey.trim()) {
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
          apiKey: form.pexelsApiKey.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setPexelsApiKey("");
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

  async function clearStored(
    integration:
      | "stripe"
      | "resend"
      | "unsplash"
      | "pexels"
      | "linkedin"
      | "twitter"
      | "meta"
      | "bluesky"
      | "bedrock",
  ) {
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
        form.setStripePriceGrowth(data.status.stripe.priceGrowthMonthly.value ?? "");
        form.setStripePriceScale(data.status.stripe.priceScaleMonthly.value ?? "");
      } else if (integration === "resend") {
        form.setResendFromEmail(data.status.resend.fromEmail.value ?? "");
      } else if (integration === "linkedin") {
        form.setLinkedinClientId("");
        form.setLinkedinClientSecret("");
      } else if (integration === "twitter") {
        form.setTwitterClientId("");
        form.setTwitterClientSecret("");
      } else if (integration === "meta") {
        form.setMetaAppId("");
        form.setMetaAppSecret("");
      } else if (integration === "bluesky") {
        form.setBlueskyClientName("");
        form.setBlueskyPrivateKeyJwk("");
      } else if (integration === "bedrock") {
        form.setBedrockApiKey("");
      }
      toast.success("Stored credentials removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove stored credentials");
    }
  }

  return {
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
    disconnectingStripe,
  };
}
