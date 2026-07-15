"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import {
  type AdminIntegrationsCounts,
  type PlatformSettingsResponse,
  type ToggleKey,
  type ActiveDialog,
  isIntegrationActive,
} from "./admin-integrations-helpers";

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
  const [savingLinkedIn, setSavingLinkedIn] = useState(false);

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
  const [linkedinClientId, setLinkedinClientId] = useState("");
  const [linkedinClientSecret, setLinkedinClientSecret] = useState("");

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
    } else if (dialog === "linkedin") {
      setLinkedinClientSecret("");
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
      setLinkedinClientId(statusData.linkedin.clientId.value ?? "");
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

  async function saveLinkedIn() {
    const payload: Record<string, string> = {};
    if (linkedinClientId.trim()) payload.clientId = linkedinClientId.trim();
    if (linkedinClientSecret.trim()) payload.clientSecret = linkedinClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter a Client ID or Client Secret to save");
      return;
    }

    const alreadyConfigured =
      status?.linkedin.clientId.configured && status.linkedin.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      toast.error("Enter both Client ID and Client Secret for the first save");
      return;
    }

    setSavingLinkedIn(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "linkedin",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      setLinkedinClientId(data.status.linkedin.clientId.value ?? "");
      setLinkedinClientSecret("");
      toast.success("LinkedIn credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save LinkedIn credentials");
    } finally {
      setSavingLinkedIn(false);
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
    integration: "stripe" | "resend" | "unsplash" | "pexels" | "linkedin",
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
        setStripePriceGrowth(data.status.stripe.priceGrowthMonthly.value ?? "");
        setStripePriceScale(data.status.stripe.priceScaleMonthly.value ?? "");
      } else if (integration === "resend") {
        setResendFromEmail(data.status.resend.fromEmail.value ?? "");
      } else if (integration === "linkedin") {
        setLinkedinClientId("");
        setLinkedinClientSecret("");
      }
      toast.success("Stored credentials removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove stored credentials");
    }
  }

  const counts = useMemo<AdminIntegrationsCounts>(() => {
    if (!settings || !env || !status) {
      return { total: 0, billing: 0, email: 0, media: 0, social: 0 };
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
      billing: countsByCategory.billing ?? 0,
      email: countsByCategory.email ?? 0,
      media: countsByCategory.media ?? 0,
      social: countsByCategory.social ?? 0,
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
    saveLinkedIn,
    disconnectStripeOAuth,
    clearStored,
    savingToggle,
    savingStripe,
    savingResend,
    savingUnsplash,
    savingPexels,
    savingLinkedIn,
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
    linkedinClientId,
    setLinkedinClientId,
    linkedinClientSecret,
    setLinkedinClientSecret,
  };
}

export type AdminIntegrationsController = ReturnType<typeof useAdminIntegrationsController>;
