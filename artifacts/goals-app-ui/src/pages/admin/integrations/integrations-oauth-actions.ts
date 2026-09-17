import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PlatformIntegrationStatus } from "./types";
import type { AdminIntegrationsFormState } from "./integrations-form-state";
type StatusSetter = (status: PlatformIntegrationStatus) => void;

type Notice = { type: "success" | "error"; message: string } | null;

export function useAdminIntegrationsOauthActions(deps: {
  status: PlatformIntegrationStatus | null;
  setStatus: StatusSetter;
  setNotice: (notice: Notice) => void;
  form: AdminIntegrationsFormState;
}) {
  const { status, setStatus, setNotice, form } = deps;

  const [savingLinkedIn, setSavingLinkedIn] = useState(false);
  const [savingTwitter, setSavingTwitter] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingBluesky, setSavingBluesky] = useState(false);
  const [savingBing, setSavingBing] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingBedrock, setSavingBedrock] = useState(false);
  const [testingBedrock, setTestingBedrock] = useState(false);

  async function saveLinkedIn() {
    const payload: Record<string, string> = {};
    if (form.linkedinClientId.trim()) payload.clientId = form.linkedinClientId.trim();
    if (form.linkedinClientSecret.trim()) payload.clientSecret = form.linkedinClientSecret.trim();

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
      form.setLinkedinClientId(data.status.linkedin.clientId.value ?? "");
      form.setLinkedinClientSecret("");
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
    if (form.twitterClientId.trim()) payload.clientId = form.twitterClientId.trim();
    if (form.twitterClientSecret.trim()) payload.clientSecret = form.twitterClientSecret.trim();

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
      form.setTwitterClientId(data.status.twitter.clientId.value ?? "");
      form.setTwitterClientSecret("");
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
    if (form.metaAppId.trim()) payload.appId = form.metaAppId.trim();
    if (form.metaAppSecret.trim()) payload.appSecret = form.metaAppSecret.trim();

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
      form.setMetaAppId(data.status.meta.appId.value ?? "");
      form.setMetaAppSecret("");
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
    if (form.blueskyClientName.trim()) payload.clientName = form.blueskyClientName.trim();
    if (form.blueskyPrivateKeyJwk.trim()) payload.privateKeyJwk = form.blueskyPrivateKeyJwk.trim();

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
      form.setBlueskyClientName(data.status.bluesky.clientName.value ?? "");
      form.setBlueskyPrivateKeyJwk("");
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

  async function saveBing() {
    const payload: Record<string, string> = {};
    if (form.bingClientId.trim()) payload.clientId = form.bingClientId.trim();
    if (form.bingClientSecret.trim()) payload.clientSecret = form.bingClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter a Client ID or Client Secret to save" });
      return;
    }

    const alreadyConfigured =
      status?.bing.clientId.configured && status.bing.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      setNotice({
        type: "error",
        message: "Enter both Client ID and Client Secret for the first save",
      });
      return;
    }

    setSavingBing(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "bing", ...payload }),
        },
      );
      setStatus(data.status);
      form.setBingClientId(data.status.bing.clientId.value ?? "");
      form.setBingClientSecret("");
      setNotice({ type: "success", message: "Bing Webmaster credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Bing Webmaster credentials",
      });
    } finally {
      setSavingBing(false);
    }
  }

  async function saveGoogle() {
    const payload: Record<string, string> = {};
    if (form.googleClientId.trim()) payload.clientId = form.googleClientId.trim();
    if (form.googleClientSecret.trim()) payload.clientSecret = form.googleClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter a Client ID or Client Secret to save" });
      return;
    }

    const alreadyConfigured =
      status?.google.clientId.configured && status.google.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      setNotice({
        type: "error",
        message: "Enter both Client ID and Client Secret for the first save",
      });
      return;
    }

    setSavingGoogle(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "google", ...payload }),
        },
      );
      setStatus(data.status);
      form.setGoogleClientId(data.status.google.clientId.value ?? "");
      form.setGoogleClientSecret("");
      setNotice({ type: "success", message: "Google credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Google credentials",
      });
    } finally {
      setSavingGoogle(false);
    }
  }

  function toggleBedrockGrantedOrg(organizationId: number) {
    form.setBedrockGrantedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(organizationId)) next.delete(organizationId);
      else next.add(organizationId);
      return next;
    });
  }

  async function saveBedrock() {
    const payload: Record<string, unknown> = {
      integration: "bedrock",
      organizationIds: [...form.bedrockGrantedOrgIds],
    };
    if (form.bedrockApiKey.trim()) payload.apiKey = form.bedrockApiKey.trim();
    if (form.bedrockModel.trim()) payload.model = form.bedrockModel.trim();

    const alreadyConfigured = Boolean(status?.bedrock.configured);
    const addingCreds = Boolean(payload.apiKey);
    if (!alreadyConfigured && !addingCreds) {
      setNotice({
        type: "error",
        message:
          form.bedrockGrantedOrgIds.size > 0
            ? "Save a Bedrock API key before granting organizations"
            : "Paste a Bedrock API key to save",
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
      form.setBedrockApiKey("");
      form.setBedrockModel(data.status.bedrock.model.value ?? "");
      form.setBedrockGrantedOrgIds(
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
    const model = form.bedrockModel.trim() || status?.bedrock.model.value?.trim() || undefined;
    setTestingBedrock(true);
    try {
      const body = await apiFetch<{ ok?: boolean; error?: string }>(
        "/api/admin/platform-integrations/bedrock-test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: form.bedrockApiKey.trim() || undefined,
            model,
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

  return {
    saveLinkedIn,
    saveTwitter,
    saveMeta,
    saveBluesky,
    saveBing,
    saveGoogle,
    saveBedrock,
    testBedrock,
    toggleBedrockGrantedOrg,
    savingLinkedIn,
    savingTwitter,
    savingMeta,
    savingBluesky,
    savingBing,
    savingGoogle,
    savingBedrock,
    testingBedrock,
  };
}
