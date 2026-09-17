"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-types";
import type { AdminIntegrationsFormState } from "./admin-integrations-form-state";

type StatusSetter = (status: PlatformIntegrationStatus) => void;

export function useAdminIntegrationsOauthActions(deps: {
  status: PlatformIntegrationStatus | null;
  setStatus: StatusSetter;
  form: AdminIntegrationsFormState;
}) {
  const { status, setStatus, form } = deps;

  const [savingLinkedIn, setSavingLinkedIn] = useState(false);
  const [savingTwitter, setSavingTwitter] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingBluesky, setSavingBluesky] = useState(false);
  const [savingBing, setSavingBing] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingDataforseo, setSavingDataforseo] = useState(false);
  const [savingBedrock, setSavingBedrock] = useState(false);
  const [testingBedrock, setTestingBedrock] = useState(false);

  async function saveLinkedIn() {
    const payload: Record<string, string> = {};
    if (form.linkedinClientId.trim()) payload.clientId = form.linkedinClientId.trim();
    if (form.linkedinClientSecret.trim()) payload.clientSecret = form.linkedinClientSecret.trim();

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
      form.setLinkedinClientId(data.status.linkedin.clientId.value ?? "");
      form.setLinkedinClientSecret("");
      toast.success("LinkedIn credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save LinkedIn credentials");
    } finally {
      setSavingLinkedIn(false);
    }
  }

  async function saveTwitter() {
    const payload: Record<string, string> = {};
    if (form.twitterClientId.trim()) payload.clientId = form.twitterClientId.trim();
    if (form.twitterClientSecret.trim()) payload.clientSecret = form.twitterClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter a Client ID or Client Secret to save");
      return;
    }

    const alreadyConfigured =
      status?.twitter.clientId.configured && status.twitter.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      toast.error("Enter both Client ID and Client Secret for the first save");
      return;
    }

    setSavingTwitter(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "twitter",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setTwitterClientId(data.status.twitter.clientId.value ?? "");
      form.setTwitterClientSecret("");
      toast.success("X credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save X credentials");
    } finally {
      setSavingTwitter(false);
    }
  }

  async function saveMeta() {
    const payload: Record<string, string> = {};
    if (form.metaAppId.trim()) payload.appId = form.metaAppId.trim();
    if (form.metaAppSecret.trim()) payload.appSecret = form.metaAppSecret.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter an App ID or App Secret to save");
      return;
    }

    const alreadyConfigured =
      status?.meta.appId.configured && status.meta.appSecret.configured;
    if (!alreadyConfigured && (!payload.appId || !payload.appSecret)) {
      toast.error("Enter both App ID and App Secret for the first save");
      return;
    }

    setSavingMeta(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "meta",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setMetaAppId(data.status.meta.appId.value ?? "");
      form.setMetaAppSecret("");
      toast.success("Meta credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Meta credentials");
    } finally {
      setSavingMeta(false);
    }
  }

  async function saveBluesky() {
    const payload: Record<string, string> = {};
    if (form.blueskyClientName.trim()) payload.clientName = form.blueskyClientName.trim();
    if (form.blueskyPrivateKeyJwk.trim()) payload.privateKeyJwk = form.blueskyPrivateKeyJwk.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter a client name or private key JWK to save");
      return;
    }

    if (!status?.bluesky.privateKeyJwk.configured && !payload.privateKeyJwk) {
      toast.error("Paste a private key JWK for the first save");
      return;
    }

    setSavingBluesky(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "bluesky",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setBlueskyClientName(data.status.bluesky.clientName.value ?? "");
      form.setBlueskyPrivateKeyJwk("");
      toast.success("Bluesky credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Bluesky credentials");
    } finally {
      setSavingBluesky(false);
    }
  }

  async function saveBing() {
    const payload: Record<string, string> = {};
    if (form.bingClientId.trim()) payload.clientId = form.bingClientId.trim();
    if (form.bingClientSecret.trim()) payload.clientSecret = form.bingClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter a Client ID or Client Secret to save");
      return;
    }

    const alreadyConfigured =
      status?.bing.clientId.configured && status.bing.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      toast.error("Enter both Client ID and Client Secret for the first save");
      return;
    }

    setSavingBing(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "bing",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setBingClientId(data.status.bing.clientId.value ?? "");
      form.setBingClientSecret("");
      toast.success("Bing Webmaster credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Bing Webmaster credentials");
    } finally {
      setSavingBing(false);
    }
  }

  async function saveGoogle() {
    const payload: Record<string, string> = {};
    if (form.googleClientId.trim()) payload.clientId = form.googleClientId.trim();
    if (form.googleClientSecret.trim()) payload.clientSecret = form.googleClientSecret.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter a Client ID or Client Secret to save");
      return;
    }

    const alreadyConfigured =
      status?.google.clientId.configured && status.google.clientSecret.configured;
    if (!alreadyConfigured && (!payload.clientId || !payload.clientSecret)) {
      toast.error("Enter both Client ID and Client Secret for the first save");
      return;
    }

    setSavingGoogle(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "google",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setGoogleClientId(data.status.google.clientId.value ?? "");
      form.setGoogleClientSecret("");
      toast.success("Google credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Google credentials");
    } finally {
      setSavingGoogle(false);
    }
  }

  async function saveDataforseo() {
    const payload: Record<string, string> = {};
    if (form.dataforseoLogin.trim()) payload.login = form.dataforseoLogin.trim();
    if (form.dataforseoPassword.trim()) payload.password = form.dataforseoPassword.trim();

    if (Object.keys(payload).length === 0) {
      toast.error("Enter a login or API password to save");
      return;
    }

    const alreadyConfigured =
      status?.dataforseo.login.configured && status.dataforseo.password.configured;
    if (!alreadyConfigured && (!payload.login || !payload.password)) {
      toast.error("Enter both login and API password for the first save");
      return;
    }

    setSavingDataforseo(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration: "dataforseo",
          ...payload,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setDataforseoLogin("");
      form.setDataforseoPassword("");
      toast.success("DataForSEO credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save DataForSEO credentials");
    } finally {
      setSavingDataforseo(false);
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
      if (form.bedrockGrantedOrgIds.size > 0) {
        toast.error("Save a Bedrock API key before granting organizations");
        return;
      }
      toast.error("Paste a Bedrock API key to save");
      return;
    }

    setSavingBedrock(true);
    try {
      const res = await fetch("/api/admin/platform-integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Save failed");
      }
      const data = (await res.json()) as { status: PlatformIntegrationStatus };
      setStatus(data.status);
      form.setBedrockApiKey("");
      form.setBedrockModel(data.status.bedrock.model.value ?? "");
      form.setBedrockGrantedOrgIds(
        new Set(data.status.bedrock.grantedOrganizations.map((org) => org.id)),
      );
      toast.success("Bedrock settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Bedrock settings");
    } finally {
      setSavingBedrock(false);
    }
  }

  async function testBedrock() {
    const model = form.bedrockModel.trim() || status?.bedrock.model.value?.trim() || undefined;
    setTestingBedrock(true);
    try {
      const res = await fetch("/api/admin/platform-integrations/bedrock-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: form.bedrockApiKey.trim() || undefined,
          model,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? "Bedrock test failed");
      }
      toast.success("Bedrock credentials work");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bedrock test failed");
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
    saveDataforseo,
    saveBedrock,
    testBedrock,
    toggleBedrockGrantedOrg,
    savingLinkedIn,
    savingTwitter,
    savingMeta,
    savingBluesky,
    savingBing,
    savingGoogle,
    savingDataforseo,
    savingBedrock,
    testingBedrock,
  };
}
