import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, getApiBase } from "@/lib/api";
import {
  PLATFORM_INTEGRATION_CATEGORIES,
  type PlatformIntegrationCategoryId,
  type PlatformIntegrationDefinition,
  type PlatformIntegrationStatus,
  type PlatformSettingsResponse,
  type IntegrationEnvStatus,
} from "./types";
import {
  type AdminIntegrationsCounts,
  type ActiveDialog,
  isIntegrationActive,
} from "./helpers";
import { useAdminIntegrationsFormState } from "./integrations-form-state";
import { useAdminIntegrationsCredentialActions } from "./integrations-credential-actions";
import { useAdminIntegrationsOauthActions } from "./integrations-oauth-actions";

export type Notice = { type: "success" | "error"; message: string } | null;

export function useAdminIntegrationsController() {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [env, setEnv] = useState<IntegrationEnvStatus | null>(null);
  const [definitions, setDefinitions] = useState<PlatformIntegrationDefinition[]>([]);
  const [status, setStatus] = useState<PlatformIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [searchParams, setSearchParams] = useSearchParams();

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
    () => definitions.find((d) => d.id === activeDialog) ?? null,
    [activeDialog, definitions],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  const closeDialog = useCallback(() => {
    if (activeDialog) form.resetFormFields(activeDialog);
    setActiveDialog(null);
  }, [activeDialog, form.resetFormFields]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [settingsData, statusData, orgsData] = await Promise.all([
        apiFetch<PlatformSettingsResponse>("/api/admin/platform-settings"),
        apiFetch<PlatformIntegrationStatus>("/api/admin/platform-integrations"),
        apiFetch<{ organizations: Array<{ id: number; name: string }> }>(
          "/api/admin/organizations?minimal=true",
        ).catch(() => ({ organizations: [] as Array<{ id: number; name: string }> })),
      ]);
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
      form.setBedrockModel(statusData.bedrock.model.value ?? "");
      form.setBedrockGrantedOrgIds(
        new Set(statusData.bedrock.grantedOrganizations.map((org) => org.id)),
      );
      form.setBedrockOrgOptions(orgsData.organizations ?? []);
      form.setOllamaBaseUrl(statusData.ollama.baseUrl.value ?? "");
      form.setAiModel("");
    } catch {
      setLoadError(true);
      setNotice({ type: "error", message: "Could not load platform integrations" });
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
    setNotice,
    form,
    load,
  });

  const oauth = useAdminIntegrationsOauthActions({
    status,
    setStatus,
    setNotice,
    form,
  });

  useEffect(() => {
    void load();
  }, [load]);

  // Handle Stripe Connect redirect params
  useEffect(() => {
    const stripeStatus = searchParams.get("stripe");
    const message = searchParams.get("message");
    if (!stripeStatus) return;

    if (stripeStatus === "connected") {
      setNotice({ type: "success", message: "Stripe account connected" });
    } else if (stripeStatus === "connect_unconfigured") {
      setNotice({
        type: "error",
        message: "Set STRIPE_CONNECT_CLIENT_ID in env to enable Connect",
      });
    } else if (stripeStatus === "connect_error") {
      setNotice({
        type: "error",
        message: message ? decodeURIComponent(message) : "Stripe Connect failed",
      });
    }
    // Clear stripe query params after showing
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("stripe");
      next.delete("message");
      return next;
    });
  }, [searchParams, setSearchParams]);

  const counts = useMemo<AdminIntegrationsCounts>(() => {
    if (!settings || !env || !status) {
      return { total: 0, billing: 0, email: 0, media: 0, social: 0, ai: 0, search: 0 };
    }

    const countActive = (defs: PlatformIntegrationDefinition[]) =>
      defs.filter((d) => isIntegrationActive(d, settings, env, status)).length;

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
      total: groupedIntegrations.reduce((sum, g) => sum + countActive(g.integrations), 0),
    };
  }, [env, groupedIntegrations, settings, status]);

  const stripeConnectHref = `${getApiBase()}/api/admin/stripe-connect`;

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
    notice,
    setNotice,
    clearNotice,
    toggle: credentials.toggle,
    saveStripe: credentials.saveStripe,
    saveResend: credentials.saveResend,
    saveUnsplash: credentials.saveUnsplash,
    savePexels: credentials.savePexels,
    saveAiProvider: credentials.saveAiProvider,
    saveOllama: credentials.saveOllama,
    saveLinkedIn: oauth.saveLinkedIn,
    saveTwitter: oauth.saveTwitter,
    saveMeta: oauth.saveMeta,
    saveBluesky: oauth.saveBluesky,
    saveBing: oauth.saveBing,
    saveGoogle: oauth.saveGoogle,
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
    savingAiProvider: credentials.savingAiProvider,
    savingLinkedIn: oauth.savingLinkedIn,
    savingTwitter: oauth.savingTwitter,
    savingMeta: oauth.savingMeta,
    savingBluesky: oauth.savingBluesky,
    savingBing: oauth.savingBing,
    savingGoogle: oauth.savingGoogle,
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
    stripeConnectHref,
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
    bedrockApiKey: form.bedrockApiKey,
    setBedrockApiKey: form.setBedrockApiKey,
    bedrockModel: form.bedrockModel,
    setBedrockModel: form.setBedrockModel,
    bedrockOrgSearch: form.bedrockOrgSearch,
    setBedrockOrgSearch: form.setBedrockOrgSearch,
    bedrockOrgOptions: form.bedrockOrgOptions,
    bedrockGrantedOrgIds: form.bedrockGrantedOrgIds,
    aiApiKey: form.aiApiKey,
    setAiApiKey: form.setAiApiKey,
    aiModel: form.aiModel,
    setAiModel: form.setAiModel,
    ollamaBaseUrl: form.ollamaBaseUrl,
    setOllamaBaseUrl: form.setOllamaBaseUrl,
  };
}

export type AdminIntegrationsController = ReturnType<typeof useAdminIntegrationsController>;
