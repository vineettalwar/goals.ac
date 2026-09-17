import { useCallback, useState } from "react";
import type { ActiveDialog } from "./helpers";

/** Form field state for admin integration credential dialogs. */
export function useAdminIntegrationsFormState() {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [stripePriceGrowth, setStripePriceGrowth] = useState("");
  const [stripePriceScale, setStripePriceScale] = useState("");
  const [showStripeManualKey, setShowStripeManualKey] = useState(false);

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
  const [bingClientId, setBingClientId] = useState("");
  const [bingClientSecret, setBingClientSecret] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [bedrockApiKey, setBedrockApiKey] = useState("");
  const [bedrockModel, setBedrockModel] = useState("");
  const [bedrockOrgSearch, setBedrockOrgSearch] = useState("");
  const [bedrockOrgOptions, setBedrockOrgOptions] = useState<Array<{ id: number; name: string }>>(
    [],
  );
  const [bedrockGrantedOrgIds, setBedrockGrantedOrgIds] = useState<Set<number>>(new Set());
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");

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
    } else if (dialog === "bing") {
      setBingClientSecret("");
    } else if (dialog === "google") {
      setGoogleClientSecret("");
    } else if (dialog === "bedrock") {
      setBedrockApiKey("");
    } else if (
      dialog === "gemini" ||
      dialog === "openai" ||
      dialog === "anthropic" ||
      dialog === "openrouter" ||
      dialog === "groq" ||
      dialog === "nvidia"
    ) {
      setAiApiKey("");
      setAiModel("");
    } else if (dialog === "ollama") {
      setOllamaBaseUrl("");
      setAiModel("");
    }
  }, []);

  return {
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
    bingClientId,
    setBingClientId,
    bingClientSecret,
    setBingClientSecret,
    googleClientId,
    setGoogleClientId,
    googleClientSecret,
    setGoogleClientSecret,
    bedrockApiKey,
    setBedrockApiKey,
    bedrockModel,
    setBedrockModel,
    bedrockOrgSearch,
    setBedrockOrgSearch,
    bedrockOrgOptions,
    setBedrockOrgOptions,
    bedrockGrantedOrgIds,
    setBedrockGrantedOrgIds,
    aiApiKey,
    setAiApiKey,
    aiModel,
    setAiModel,
    ollamaBaseUrl,
    setOllamaBaseUrl,
    resetFormFields,
  };
}

export type AdminIntegrationsFormState = ReturnType<typeof useAdminIntegrationsFormState>;
