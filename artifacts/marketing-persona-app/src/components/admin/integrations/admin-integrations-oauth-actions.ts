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
    if (!form.bedrockModel.trim() && !status?.bedrock.model.value) {
      toast.error("Choose a Bedrock model");
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
    const model = form.bedrockModel.trim() || status?.bedrock.model.value?.trim() || "";
    if (!model) {
      toast.error("Choose a Bedrock model to test");
      return;
    }
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
    saveBedrock,
    testBedrock,
    toggleBedrockGrantedOrg,
    savingLinkedIn,
    savingTwitter,
    savingMeta,
    savingBluesky,
    savingBedrock,
    testingBedrock,
  };
}
