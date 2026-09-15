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
    if (form.bedrockAccessKeyId.trim()) payload.accessKeyId = form.bedrockAccessKeyId.trim();
    if (form.bedrockSecretAccessKey.trim()) payload.secretAccessKey = form.bedrockSecretAccessKey.trim();
    if (form.bedrockSessionToken.trim()) payload.sessionToken = form.bedrockSessionToken.trim();
    if (form.bedrockRegion.trim()) payload.region = form.bedrockRegion.trim();
    if (form.bedrockModel.trim()) payload.model = form.bedrockModel.trim();

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
    if (!alreadyConfigured && !addingCreds && form.bedrockGrantedOrgIds.size > 0) {
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
      form.setBedrockAccessKeyId("");
      form.setBedrockSecretAccessKey("");
      form.setBedrockSessionToken("");
      form.setBedrockRegion(data.status.bedrock.region.value ?? "");
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
    setTestingBedrock(true);
    try {
      const body = await apiFetch<{ ok?: boolean; error?: string }>(
        "/api/admin/platform-integrations/bedrock-test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessKeyId: form.bedrockAccessKeyId.trim() || undefined,
            secretAccessKey: form.bedrockSecretAccessKey.trim() || undefined,
            sessionToken: form.bedrockSessionToken.trim() || undefined,
            region: form.bedrockRegion.trim() || undefined,
            model: form.bedrockModel.trim() || undefined,
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
    saveBedrock,
    testBedrock,
    toggleBedrockGrantedOrg,
    savingLinkedIn,
    savingTwitter,
    savingMeta,
    savingBluesky,
    savingBing,
    savingBedrock,
    testingBedrock,
  };
}
