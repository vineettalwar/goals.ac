import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, getApiBase } from "@/lib/api";
import {
  PLATFORM_INTEGRATION_CATEGORIES,
  type PlatformIntegrationCategoryId,
  type PlatformIntegrationDefinition,
  type PlatformIntegrationId,
  type PlatformIntegrationStatus,
  type PlatformSettingsResponse,
  type IntegrationEnvStatus,
} from "./types";
import {
  type AdminIntegrationsCounts,
  type ToggleKey,
  type ActiveDialog,
  isIntegrationActive,
} from "./helpers";

export type Notice = { type: "success" | "error"; message: string } | null;

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
  const [savingTwitter, setSavingTwitter] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingBluesky, setSavingBluesky] = useState(false);
  const [savingBedrock, setSavingBedrock] = useState(false);
  const [testingBedrock, setTestingBedrock] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [stripePriceGrowth, setStripePriceGrowth] = useState("");
  const [stripePriceScale, setStripePriceScale] = useState("");
  const [showStripeManualKey, setShowStripeManualKey] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("");
  const [unsplashAccessKey, setUnsplashAccessKey] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");
  const [linkedinClientId, setLinkedinClientId] = useState("");
  const [linkedinClientSecret, setLinkedinClientSecret] = useState("");
  const [twitterClientId, setTwitterClientId] = useState("");
  const [twitterClientSecret, setTwitterClientSecret] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [blueskyClientName, setBlueskyClientName] = useState("");
  const [blueskyPrivateKeyJwk, setBlueskyPrivateKeyJwk] = useState("");
  const [bedrockAccessKeyId, setBedrockAccessKeyId] = useState("");
  const [bedrockSecretAccessKey, setBedrockSecretAccessKey] = useState("");
  const [bedrockSessionToken, setBedrockSessionToken] = useState("");
  const [bedrockRegion, setBedrockRegion] = useState("");
  const [bedrockModel, setBedrockModel] = useState("");
  const [bedrockOrgSearch, setBedrockOrgSearch] = useState("");
  const [bedrockOrgOptions, setBedrockOrgOptions] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [bedrockGrantedOrgIds, setBedrockGrantedOrgIds] = useState<Set<number>>(new Set());

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
    } else if (dialog === "twitter") {
      setTwitterClientSecret("");
    } else if (dialog === "meta") {
      setMetaAppSecret("");
    } else if (dialog === "bluesky") {
      setBlueskyPrivateKeyJwk("");
    } else if (dialog === "bedrock") {
      setBedrockAccessKeyId("");
      setBedrockSecretAccessKey("");
      setBedrockSessionToken("");
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
      setStripePriceGrowth(statusData.stripe.priceGrowthMonthly.value ?? "");
      setStripePriceScale(statusData.stripe.priceScaleMonthly.value ?? "");
      setResendFromEmail(statusData.resend.fromEmail.value ?? "");
      setLinkedinClientId(statusData.linkedin.clientId.value ?? "");
      setTwitterClientId(statusData.twitter.clientId.value ?? "");
      setMetaAppId(statusData.meta.appId.value ?? "");
      setBlueskyClientName(statusData.bluesky.clientName.value ?? "");
      setBedrockRegion(statusData.bedrock.region.value ?? "");
      setBedrockModel(statusData.bedrock.model.value ?? "");
      setBedrockGrantedOrgIds(
        new Set(statusData.bedrock.grantedOrganizations.map((org) => org.id)),
      );
      setBedrockOrgOptions(orgsData.organizations ?? []);
    } catch {
      setLoadError(true);
      setNotice({ type: "error", message: "Could not load platform integrations" });
    } finally {
      setLoading(false);
    }
  }, []);

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

  async function toggle(key: ToggleKey, checked: boolean) {
    setSavingToggle(key);
    try {
      const data = await apiFetch<PlatformSettingsResponse>("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });
      setSettings(data);
      setEnv(data.env);
      setDefinitions(data.integrations);
      setNotice({ type: "success", message: "Integration setting updated" });
    } catch {
      setNotice({ type: "error", message: "Failed to save setting" });
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
      setNotice({ type: "error", message: "Enter at least one Stripe field to save" });
      return;
    }

    setSavingStripe(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "stripe", ...payload }),
        },
      );
      setStatus(data.status);
      setStripeSecretKey("");
      setStripeWebhookSecret("");
      setNotice({ type: "success", message: "Stripe credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Stripe credentials",
      });
    } finally {
      setSavingStripe(false);
    }
  }

  async function saveResend() {
    const payload: Record<string, string | null> = {};
    if (resendApiKey.trim()) payload.apiKey = resendApiKey.trim();
    if (resendFromEmail.trim()) payload.fromEmail = resendFromEmail.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter an API key or from address to save" });
      return;
    }

    setSavingResend(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "resend", ...payload }),
        },
      );
      setStatus(data.status);
      setResendApiKey("");
      setNotice({ type: "success", message: "Resend credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Resend credentials",
      });
    } finally {
      setSavingResend(false);
    }
  }

  async function saveUnsplash() {
    if (!unsplashAccessKey.trim()) {
      setNotice({ type: "error", message: "Enter an Unsplash access key to save" });
      return;
    }

    setSavingUnsplash(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "unsplash", accessKey: unsplashAccessKey.trim() }),
        },
      );
      setStatus(data.status);
      setUnsplashAccessKey("");
      setNotice({ type: "success", message: "Unsplash credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Unsplash credentials",
      });
    } finally {
      setSavingUnsplash(false);
    }
  }

  async function savePexels() {
    if (!pexelsApiKey.trim()) {
      setNotice({ type: "error", message: "Enter a Pexels API key to save" });
      return;
    }

    setSavingPexels(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "pexels", apiKey: pexelsApiKey.trim() }),
        },
      );
      setStatus(data.status);
      setPexelsApiKey("");
      setNotice({ type: "success", message: "Pexels credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Pexels credentials",
      });
    } finally {
      setSavingPexels(false);
    }
  }

  async function saveLinkedIn() {
    const payload: Record<string, string> = {};
    if (linkedinClientId.trim()) payload.clientId = linkedinClientId.trim();
    if (linkedinClientSecret.trim()) payload.clientSecret = linkedinClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter a Client ID or Client Secret to save" });
      return;
    }

    const alreadyConfigured =
      status?.linkedin.clientId.configured && status.linkedin.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      setNotice({
        type: "error",
        message: "Enter both Client ID and Client Secret for the first save",
      });
      return;
    }

    setSavingLinkedIn(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "linkedin", ...payload }),
        },
      );
      setStatus(data.status);
      setLinkedinClientId(data.status.linkedin.clientId.value ?? "");
      setLinkedinClientSecret("");
      setNotice({ type: "success", message: "LinkedIn credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save LinkedIn credentials",
      });
    } finally {
      setSavingLinkedIn(false);
    }
  }

  async function saveTwitter() {
    const payload: Record<string, string> = {};
    if (twitterClientId.trim()) payload.clientId = twitterClientId.trim();
    if (twitterClientSecret.trim()) payload.clientSecret = twitterClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter a Client ID or Client Secret to save" });
      return;
    }

    const alreadyConfigured =
      status?.twitter.clientId.configured && status.twitter.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      setNotice({
        type: "error",
        message: "Enter both Client ID and Client Secret for the first save",
      });
      return;
    }

    setSavingTwitter(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "twitter", ...payload }),
        },
      );
      setStatus(data.status);
      setTwitterClientId(data.status.twitter.clientId.value ?? "");
      setTwitterClientSecret("");
      setNotice({ type: "success", message: "X credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save X credentials",
      });
    } finally {
      setSavingTwitter(false);
    }
  }

  async function saveMeta() {
    const payload: Record<string, string> = {};
    if (metaAppId.trim()) payload.appId = metaAppId.trim();
    if (metaAppSecret.trim()) payload.appSecret = metaAppSecret.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter an App ID or App Secret to save" });
      return;
    }

    const alreadyConfigured =
      status?.meta.appId.configured && status.meta.appSecret.configured;
    if (!alreadyConfigured && (!payload.appId || !payload.appSecret)) {
      setNotice({
        type: "error",
        message: "Enter both App ID and App Secret for the first save",
      });
      return;
    }

    setSavingMeta(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "meta", ...payload }),
        },
      );
      setStatus(data.status);
      setMetaAppId(data.status.meta.appId.value ?? "");
      setMetaAppSecret("");
      setNotice({ type: "success", message: "Meta credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Meta credentials",
      });
    } finally {
      setSavingMeta(false);
    }
  }

  async function saveBluesky() {
    const payload: Record<string, string> = {};
    if (blueskyClientName.trim()) payload.clientName = blueskyClientName.trim();
    if (blueskyPrivateKeyJwk.trim()) payload.privateKeyJwk = blueskyPrivateKeyJwk.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter a client name or private key JWK to save" });
      return;
    }

    if (!status?.bluesky.privateKeyJwk.configured && !payload.privateKeyJwk) {
      setNotice({ type: "error", message: "Paste a private key JWK for the first save" });
      return;
    }

    setSavingBluesky(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "bluesky", ...payload }),
        },
      );
      setStatus(data.status);
      setBlueskyClientName(data.status.bluesky.clientName.value ?? "");
      setBlueskyPrivateKeyJwk("");
      setNotice({ type: "success", message: "Bluesky credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Bluesky credentials",
      });
    } finally {
      setSavingBluesky(false);
    }
  }

  function toggleBedrockGrantedOrg(organizationId: number) {
    setBedrockGrantedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(organizationId)) next.delete(organizationId);
      else next.add(organizationId);
      return next;
    });
  }

  async function saveBedrock() {
    const payload: Record<string, unknown> = {
      integration: "bedrock",
      organizationIds: [...bedrockGrantedOrgIds],
    };
    if (bedrockAccessKeyId.trim()) payload.accessKeyId = bedrockAccessKeyId.trim();
    if (bedrockSecretAccessKey.trim()) payload.secretAccessKey = bedrockSecretAccessKey.trim();
    if (bedrockSessionToken.trim()) payload.sessionToken = bedrockSessionToken.trim();
    if (bedrockRegion.trim()) payload.region = bedrockRegion.trim();
    if (bedrockModel.trim()) payload.model = bedrockModel.trim();

    const alreadyConfigured = Boolean(status?.bedrock.configured);
    const addingCreds = Boolean(payload.accessKeyId || payload.secretAccessKey);
    if (!alreadyConfigured && addingCreds) {
      if (!payload.accessKeyId || !payload.secretAccessKey || !payload.region || !payload.model) {
        setNotice({
          type: "error",
          message: "Access key, secret, region, and model are required for the first save",
        });
        return;
      }
    }
    if (!alreadyConfigured && !addingCreds && bedrockGrantedOrgIds.size > 0) {
      setNotice({
        type: "error",
        message: "Save Bedrock credentials before granting organizations",
      });
      return;
    }

    setSavingBedrock(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      setStatus(data.status);
      setBedrockAccessKeyId("");
      setBedrockSecretAccessKey("");
      setBedrockSessionToken("");
      setBedrockRegion(data.status.bedrock.region.value ?? "");
      setBedrockModel(data.status.bedrock.model.value ?? "");
      setBedrockGrantedOrgIds(
        new Set(data.status.bedrock.grantedOrganizations.map((org) => org.id)),
      );
      setNotice({ type: "success", message: "Bedrock settings saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Bedrock settings",
      });
    } finally {
      setSavingBedrock(false);
    }
  }

  async function testBedrock() {
    setTestingBedrock(true);
    try {
      const body = await apiFetch<{ ok?: boolean; error?: string }>(
        "/api/admin/platform-integrations/bedrock-test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessKeyId: bedrockAccessKeyId.trim() || undefined,
            secretAccessKey: bedrockSecretAccessKey.trim() || undefined,
            sessionToken: bedrockSessionToken.trim() || undefined,
            region: bedrockRegion.trim() || undefined,
            model: bedrockModel.trim() || undefined,
          }),
        },
      );
      if (!body?.ok) throw new Error(body?.error ?? "Bedrock test failed");
      setNotice({ type: "success", message: "Bedrock credentials work" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Bedrock test failed",
      });
    } finally {
      setTestingBedrock(false);
    }
  }

  async function disconnectStripeOAuth() {
    setDisconnectingStripe(true);
    try {
      await apiFetch("/api/admin/stripe-connect", { method: "DELETE" });
      await load();
      setNotice({ type: "success", message: "Stripe account disconnected" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to disconnect Stripe",
      });
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
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration }),
        },
      );
      setStatus(data.status);
      if (integration === "stripe") {
        setStripePriceGrowth(data.status.stripe.priceGrowthMonthly.value ?? "");
        setStripePriceScale(data.status.stripe.priceScaleMonthly.value ?? "");
      } else if (integration === "resend") {
        setResendFromEmail(data.status.resend.fromEmail.value ?? "");
      } else if (integration === "linkedin") {
        setLinkedinClientId("");
        setLinkedinClientSecret("");
      } else if (integration === "twitter") {
        setTwitterClientId("");
        setTwitterClientSecret("");
      } else if (integration === "meta") {
        setMetaAppId("");
        setMetaAppSecret("");
      } else if (integration === "bluesky") {
        setBlueskyClientName("");
        setBlueskyPrivateKeyJwk("");
      } else if (integration === "bedrock") {
        setBedrockAccessKeyId("");
        setBedrockSecretAccessKey("");
        setBedrockSessionToken("");
        setBedrockRegion("");
        setBedrockModel("");
      }
      setNotice({ type: "success", message: "Stored credentials removed" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove stored credentials",
      });
    }
  }

  const counts = useMemo<AdminIntegrationsCounts>(() => {
    if (!settings || !env || !status) {
      return { total: 0, billing: 0, email: 0, media: 0, social: 0, ai: 0 };
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
    toggle,
    saveStripe,
    saveResend,
    saveUnsplash,
    savePexels,
    saveLinkedIn,
    saveTwitter,
    saveMeta,
    saveBluesky,
    saveBedrock,
    testBedrock,
    toggleBedrockGrantedOrg,
    disconnectStripeOAuth,
    clearStored,
    savingToggle,
    savingStripe,
    savingResend,
    savingUnsplash,
    savingPexels,
    savingLinkedIn,
    savingTwitter,
    savingMeta,
    savingBluesky,
    savingBedrock,
    testingBedrock,
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
    stripeConnectHref,
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
    twitterClientId,
    setTwitterClientId,
    twitterClientSecret,
    setTwitterClientSecret,
    metaAppId,
    setMetaAppId,
    metaAppSecret,
    setMetaAppSecret,
    blueskyClientName,
    setBlueskyClientName,
    blueskyPrivateKeyJwk,
    setBlueskyPrivateKeyJwk,
    bedrockAccessKeyId,
    setBedrockAccessKeyId,
    bedrockSecretAccessKey,
    setBedrockSecretAccessKey,
    bedrockSessionToken,
    setBedrockSessionToken,
    bedrockRegion,
    setBedrockRegion,
    bedrockModel,
    setBedrockModel,
    bedrockOrgSearch,
    setBedrockOrgSearch,
    bedrockOrgOptions,
    bedrockGrantedOrgIds,
  };
}

export type AdminIntegrationsController = ReturnType<typeof useAdminIntegrationsController>;
