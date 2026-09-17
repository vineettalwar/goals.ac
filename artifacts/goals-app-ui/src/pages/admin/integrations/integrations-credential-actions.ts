import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  PlatformIntegrationDefinition,
  PlatformIntegrationStatus,
  PlatformSettingsResponse,
  IntegrationEnvStatus,
} from "./types";
import type { ToggleKey } from "./helpers";
import type { AdminIntegrationsFormState } from "./integrations-form-state";
type StatusSetter = (status: PlatformIntegrationStatus) => void;

type Notice = { type: "success" | "error"; message: string } | null;

export function useAdminIntegrationsCredentialActions(deps: {
  setStatus: StatusSetter;
  setSettings: (data: PlatformSettingsResponse) => void;
  setEnv: (env: IntegrationEnvStatus) => void;
  setDefinitions: (defs: PlatformIntegrationDefinition[]) => void;
  setNotice: (notice: Notice) => void;
  form: AdminIntegrationsFormState;
  load: () => Promise<void>;
}) {
  const { setStatus, setSettings, setEnv, setDefinitions, setNotice, form, load } = deps;

  const [savingToggle, setSavingToggle] = useState<ToggleKey | null>(null);
  const [savingStripe, setSavingStripe] = useState(false);
  const [savingResend, setSavingResend] = useState(false);
  const [savingUnsplash, setSavingUnsplash] = useState(false);
  const [savingPexels, setSavingPexels] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [savingAiProvider, setSavingAiProvider] = useState(false);

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
    if (form.stripeSecretKey.trim()) payload.secretKey = form.stripeSecretKey.trim();
    if (form.stripeWebhookSecret.trim()) payload.webhookSecret = form.stripeWebhookSecret.trim();
    if (form.stripePriceGrowth.trim()) payload.priceGrowthMonthly = form.stripePriceGrowth.trim();
    if (form.stripePriceScale.trim()) payload.priceScaleMonthly = form.stripePriceScale.trim();

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
      form.setStripeSecretKey("");
      form.setStripeWebhookSecret("");
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
    if (form.resendApiKey.trim()) payload.apiKey = form.resendApiKey.trim();
    if (form.resendFromEmail.trim()) payload.fromEmail = form.resendFromEmail.trim();

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
      form.setResendApiKey("");
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
    if (!form.unsplashAccessKey.trim()) {
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
          body: JSON.stringify({ integration: "unsplash", accessKey: form.unsplashAccessKey.trim() }),
        },
      );
      setStatus(data.status);
      form.setUnsplashAccessKey("");
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
    if (!form.pexelsApiKey.trim()) {
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
          body: JSON.stringify({ integration: "pexels", apiKey: form.pexelsApiKey.trim() }),
        },
      );
      setStatus(data.status);
      form.setPexelsApiKey("");
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

  async function saveAiProvider(
    integration: "gemini" | "openai" | "anthropic" | "openrouter" | "groq" | "nvidia",
  ) {
    const payload: Record<string, string | null> = {};
    if (form.aiApiKey.trim()) payload.apiKey = form.aiApiKey.trim();
    if (form.aiModel.trim()) payload.model = form.aiModel.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter an API key or model to save" });
      return;
    }

    setSavingAiProvider(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration, ...payload }),
        },
      );
      setStatus(data.status);
      form.setAiApiKey("");
      form.setAiModel("");
      setNotice({ type: "success", message: "AI provider credentials saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save AI provider credentials",
      });
    } finally {
      setSavingAiProvider(false);
    }
  }

  async function saveOllama() {
    const payload: Record<string, string | null> = {};
    if (form.ollamaBaseUrl.trim()) payload.baseUrl = form.ollamaBaseUrl.trim();
    if (form.aiModel.trim()) payload.model = form.aiModel.trim();

    if (Object.keys(payload).length === 0) {
      setNotice({ type: "error", message: "Enter a base URL or model to save" });
      return;
    }

    setSavingAiProvider(true);
    try {
      const data = await apiFetch<{ status: PlatformIntegrationStatus }>(
        "/api/admin/platform-integrations",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ integration: "ollama", ...payload }),
        },
      );
      setStatus(data.status);
      form.setOllamaBaseUrl("");
      form.setAiModel("");
      setNotice({ type: "success", message: "Ollama settings saved" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save Ollama settings",
      });
    } finally {
      setSavingAiProvider(false);
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
      | "bing"
      | "google"
      | "bedrock"
      | "gemini"
      | "openai"
      | "anthropic"
      | "openrouter"
      | "groq"
      | "nvidia"
      | "ollama",
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
      } else if (integration === "bing") {
        form.setBingClientId("");
        form.setBingClientSecret("");
      } else if (integration === "google") {
        form.setGoogleClientId("");
        form.setGoogleClientSecret("");
      } else if (integration === "bedrock") {
        form.setBedrockApiKey("");
        form.setBedrockModel("");
      } else if (
        integration === "gemini" ||
        integration === "openai" ||
        integration === "anthropic" ||
        integration === "openrouter" ||
        integration === "groq" ||
        integration === "nvidia" ||
        integration === "ollama"
      ) {
        form.setAiApiKey("");
        form.setAiModel("");
        form.setOllamaBaseUrl("");
      }
      setNotice({ type: "success", message: "Stored credentials removed" });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove stored credentials",
      });
    }
  }

  return {
    toggle,
    saveStripe,
    saveResend,
    saveUnsplash,
    savePexels,
    saveAiProvider,
    saveOllama,
    disconnectStripeOAuth,
    clearStored,
    savingToggle,
    savingStripe,
    savingResend,
    savingUnsplash,
    savingPexels,
    savingAiProvider,
    disconnectingStripe,
  };
}
