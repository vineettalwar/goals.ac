"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-types";
import {
  PLATFORM_INTEGRATION_CATEGORIES,
  type IntegrationEnvStatus,
  type PlatformIntegrationCategoryId,
  type PlatformIntegrationDefinition,
} from "@/lib/platform/platform-features";
import {
  type AdminIntegrationsCounts,
  type PlatformSettingsResponse,
  type ActiveDialog,
  isIntegrationActive,
} from "./admin-integrations-helpers";
import { useAdminIntegrationsFormState } from "./admin-integrations-form-state";
import { useAdminIntegrationsCredentialActions } from "./admin-integrations-credential-actions";
import { useAdminIntegrationsOauthActions } from "./admin-integrations-oauth-actions";

export function useAdminIntegrationsController() {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [env, setEnv] = useState<IntegrationEnvStatus | null>(null);
  const [definitions, setDefinitions] = useState<PlatformIntegrationDefinition[]>([]);
  const [status, setStatus] = useState<PlatformIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const searchParams = useSearchParams();

  const form = useAdminIntegrationsFormState();
  const groupedIntegrations = useMemo(
    () =>
      PLATFORM_INTEGRATION_CATEGORIES.map((category) => ({
        category,
        integrations: definitions.filter((d) => d.category === category.id),
      })).filter((g) => g.integrations.length > 0),
    [definitions],
  );

  const activeDefinition = useMemo(
    () => definitions.find((definition) => definition.id === activeDialog) ?? null,
    [activeDialog, definitions],
  );

  const closeDialog = useCallback(() => {
    if (activeDialog) form.resetFormFields(activeDialog);
    setActiveDialog(null);
  }, [activeDialog, form.resetFormFields]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [settingsRes, statusRes, orgsRes] = await Promise.all([
        fetch("/api/admin/platform-settings"),
        fetch("/api/admin/platform-integrations"),
        fetch("/api/admin/organizations?minimal=true"),
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
      form.setStripePriceGrowth(statusData.stripe.priceGrowthMonthly.value ?? "");
      form.setStripePriceScale(statusData.stripe.priceScaleMonthly.value ?? "");
      form.setResendFromEmail(statusData.resend.fromEmail.value ?? "");
      form.setLinkedinClientId(statusData.linkedin.clientId.value ?? "");
      form.setTwitterClientId(statusData.twitter.clientId.value ?? "");
      form.setMetaAppId(statusData.meta.appId.value ?? "");
      form.setBlueskyClientName(statusData.bluesky.clientName.value ?? "");
      form.setBingClientId(statusData.bing.clientId.value ?? "");
      form.setGoogleClientId(statusData.google.clientId.value ?? "");
      form.setBedrockGrantedOrgIds(
        new Set(statusData.bedrock.grantedOrganizations.map((org) => org.id)),
      );
      form.setBedrockModel(statusData.bedrock.model.value ?? "");
      if (orgsRes.ok) {
        const orgsData = (await orgsRes.json()) as {
          organizations: Array<{ id: number; name: string }>;
        };
        form.setBedrockOrgOptions(orgsData.organizations ?? []);
      }
    } catch {
      setLoadError(true);
      toast.error("Could not load platform integrations");
    } finally {
      setLoading(false);
    }
    // ponytail: form setters are useState-stable; omit form object to avoid reload loop
  }, []);

  const credentials = useAdminIntegrationsCredentialActions({
    setStatus,
    setSettings,
    setEnv,
    setDefinitions,
    form,
    load,
  });

  const oauth = useAdminIntegrationsOauthActions({
    status,
    setStatus,
    form,
  });

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

  const counts = useMemo<AdminIntegrationsCounts>(() => {
    if (!settings || !env || !status) {
      return { total: 0, billing: 0, email: 0, media: 0, social: 0, ai: 0, search: 0 };
    }

    const countActive = (defs: PlatformIntegrationDefinition[]) =>
      defs.filter((definition) => isIntegrationActive(definition, settings, env, status)).length;

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
      ai: countsByCategory.ai ?? 0,
      search: countsByCategory.search ?? 0,
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
    toggle: credentials.toggle,
    saveStripe: credentials.saveStripe,
    saveResend: credentials.saveResend,
    saveUnsplash: credentials.saveUnsplash,
    savePexels: credentials.savePexels,
    saveLinkedIn: oauth.saveLinkedIn,
    saveTwitter: oauth.saveTwitter,
    saveMeta: oauth.saveMeta,
    saveBluesky: oauth.saveBluesky,
    saveBing: oauth.saveBing,
    saveGoogle: oauth.saveGoogle,
    saveDataforseo: oauth.saveDataforseo,
    saveBedrock: oauth.saveBedrock,
    testBedrock: oauth.testBedrock,
    toggleBedrockGrantedOrg: oauth.toggleBedrockGrantedOrg,
    disconnectStripeOAuth: credentials.disconnectStripeOAuth,
    clearStored: credentials.clearStored,
    savingToggle: credentials.savingToggle,
    savingStripe: credentials.savingStripe,
    savingResend: credentials.savingResend,
    savingUnsplash: credentials.savingUnsplash,
    savingPexels: credentials.savingPexels,
    savingLinkedIn: oauth.savingLinkedIn,
    savingTwitter: oauth.savingTwitter,
    savingMeta: oauth.savingMeta,
    savingBluesky: oauth.savingBluesky,
    savingBing: oauth.savingBing,
    savingGoogle: oauth.savingGoogle,
    savingDataforseo: oauth.savingDataforseo,
    savingBedrock: oauth.savingBedrock,
    testingBedrock: oauth.testingBedrock,
    stripeSecretKey: form.stripeSecretKey,
    setStripeSecretKey: form.setStripeSecretKey,
    stripeWebhookSecret: form.stripeWebhookSecret,
    setStripeWebhookSecret: form.setStripeWebhookSecret,
    stripePriceGrowth: form.stripePriceGrowth,
    setStripePriceGrowth: form.setStripePriceGrowth,
    stripePriceScale: form.stripePriceScale,
    setStripePriceScale: form.setStripePriceScale,
    showStripeManualKey: form.showStripeManualKey,
    setShowStripeManualKey: form.setShowStripeManualKey,
    disconnectingStripe: credentials.disconnectingStripe,
    resendApiKey: form.resendApiKey,
    setResendApiKey: form.setResendApiKey,
    resendFromEmail: form.resendFromEmail,
    setResendFromEmail: form.setResendFromEmail,
    unsplashAccessKey: form.unsplashAccessKey,
    setUnsplashAccessKey: form.setUnsplashAccessKey,
    pexelsApiKey: form.pexelsApiKey,
    setPexelsApiKey: form.setPexelsApiKey,
    linkedinClientId: form.linkedinClientId,
    setLinkedinClientId: form.setLinkedinClientId,
    linkedinClientSecret: form.linkedinClientSecret,
    setLinkedinClientSecret: form.setLinkedinClientSecret,
    twitterClientId: form.twitterClientId,
    setTwitterClientId: form.setTwitterClientId,
    twitterClientSecret: form.twitterClientSecret,
    setTwitterClientSecret: form.setTwitterClientSecret,
    metaAppId: form.metaAppId,
    setMetaAppId: form.setMetaAppId,
    metaAppSecret: form.metaAppSecret,
    setMetaAppSecret: form.setMetaAppSecret,
    blueskyClientName: form.blueskyClientName,
    setBlueskyClientName: form.setBlueskyClientName,
    blueskyPrivateKeyJwk: form.blueskyPrivateKeyJwk,
    setBlueskyPrivateKeyJwk: form.setBlueskyPrivateKeyJwk,
    bingClientId: form.bingClientId,
    setBingClientId: form.setBingClientId,
    bingClientSecret: form.bingClientSecret,
    setBingClientSecret: form.setBingClientSecret,
    googleClientId: form.googleClientId,
    setGoogleClientId: form.setGoogleClientId,
    googleClientSecret: form.googleClientSecret,
    setGoogleClientSecret: form.setGoogleClientSecret,
    dataforseoLogin: form.dataforseoLogin,
    setDataforseoLogin: form.setDataforseoLogin,
    dataforseoPassword: form.dataforseoPassword,
    setDataforseoPassword: form.setDataforseoPassword,
    bedrockApiKey: form.bedrockApiKey,
    setBedrockApiKey: form.setBedrockApiKey,
    bedrockModel: form.bedrockModel,
    setBedrockModel: form.setBedrockModel,
    bedrockOrgSearch: form.bedrockOrgSearch,
    setBedrockOrgSearch: form.setBedrockOrgSearch,
    bedrockOrgOptions: form.bedrockOrgOptions,
    bedrockGrantedOrgIds: form.bedrockGrantedOrgIds,
  };
}

export type AdminIntegrationsController = ReturnType<typeof useAdminIntegrationsController>;
