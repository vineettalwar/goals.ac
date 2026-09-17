import type { PlatformStatus } from "./platform-status";

export type IntegrationEnvStatus = {
  google: boolean;
  bing: boolean;
  social: boolean;
  linkedin: boolean;
  twitter: boolean;
  meta: boolean;
  bluesky: boolean;
  email: boolean;
  stripe: boolean;
  unsplash: boolean;
  pexels: boolean;
  dataforseo: boolean;
};

export type PlatformIntegrationCategoryId = "billing" | "email" | "media" | "social" | "ai" | "search";

export type PlatformIntegrationId =
  | "stripe"
  | "resend"
  | "unsplash"
  | "pexels"
  | "linkedin"
  | "twitter"
  | "meta"
  | "bluesky"
  | "mastodon"
  | "bedrock"
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "nvidia"
  | "ollama"
  | "bing"
  | "dataforseo"
  | "google";

export type PlatformIntegrationSettingsKey =
  | "stripeBillingEnabled"
  | "emailEnabled"
  | "socialPublishingEnabled"
  | "bingWebmasterEnabled"
  | "googleIntegrationsEnabled";

export type PlatformIntegrationKind = "credentials" | "env" | "info";

export type PlatformIntegrationEnvVar = {
  name: string;
  configured: boolean;
  required: boolean;
};

export type PlatformIntegrationDefinition = {
  id: PlatformIntegrationId;
  label: string;
  description: string;
  category: PlatformIntegrationCategoryId;
  kind: PlatformIntegrationKind;
  settingsKey?: PlatformIntegrationSettingsKey;
  envVars: PlatformIntegrationEnvVar[];
  docsUrl?: string;
};

export const PLATFORM_INTEGRATION_CATEGORIES: {
  id: PlatformIntegrationCategoryId;
  label: string;
  description: string;
}[] = [
  {
    id: "billing",
    label: "Billing",
    description: "Checkout, subscriptions, and customer portal.",
  },
  {
    id: "email",
    label: "Email",
    description: "Transactional email for password resets and notifications.",
  },
  {
    id: "media",
    label: "Stock Images",
    description: "Unsplash and Pexels keys for featured images.",
  },
  {
    id: "social",
    label: "Social publishing",
    description: "OAuth apps so projects can connect LinkedIn and other networks.",
  },
  {
    id: "ai",
    label: "AI providers",
    description:
      "Platform AI keys (Gemini, OpenAI, Anthropic, OpenRouter, Groq, NVIDIA, Ollama) and Bedrock credentials for organizations without BYOK.",
  },
  {
    id: "search",
    label: "Search",
    description: "Google OAuth, Bing Webmaster, and DataForSEO LLM Mentions.",
  },
];

function envConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function hasGoogleCredentials(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function hasBingCredentials(): boolean {
  return Boolean(
    process.env.BING_WEBMASTER_CLIENT_ID?.trim() &&
      process.env.BING_WEBMASTER_CLIENT_SECRET?.trim(),
  );
}

export function hasDataForSeoCredentials(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN?.trim() && process.env.DATAFORSEO_PASSWORD?.trim());
}

export function hasUnsplashCredentials(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

export function hasPexelsCredentials(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

export function hasResendCredentials(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function hasStripeCredentials(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function googleIntegrationsAvailable(settings: PlatformStatus): boolean {
  return settings.googleIntegrationsEnabled && hasGoogleCredentials();
}

export function bingWebmasterAvailable(settings: PlatformStatus): boolean {
  return settings.bingWebmasterEnabled && hasBingCredentials();
}

export function emailDeliveryAvailable(settings: PlatformStatus): boolean {
  return settings.emailEnabled && hasResendCredentials();
}

export function stripeBillingAvailable(settings: PlatformStatus): boolean {
  return settings.stripeBillingEnabled && hasStripeCredentials();
}

export function publicSignupsAvailable(settings: PlatformStatus): boolean {
  return settings.signupsEnabled;
}

export function getPlatformIntegrationDefinitions(): PlatformIntegrationDefinition[] {
  return [
    {
      id: "stripe",
      category: "billing",
      kind: "credentials",
      label: "Stripe",
      description: "Connect with Stripe OAuth or API keys for checkout and subscriptions.",
      settingsKey: "stripeBillingEnabled",
      docsUrl: "https://dashboard.stripe.com/apikeys",
      envVars: [
        { name: "STRIPE_SECRET_KEY", configured: envConfigured("STRIPE_SECRET_KEY"), required: true },
        {
          name: "STRIPE_WEBHOOK_SECRET",
          configured: envConfigured("STRIPE_WEBHOOK_SECRET"),
          required: true,
        },
        {
          name: "STRIPE_PRICE_GROWTH_MONTHLY",
          configured: envConfigured("STRIPE_PRICE_GROWTH_MONTHLY"),
          required: true,
        },
        {
          name: "STRIPE_PRICE_SCALE_MONTHLY",
          configured: envConfigured("STRIPE_PRICE_SCALE_MONTHLY"),
          required: true,
        },
      ],
    },
    {
      id: "resend",
      category: "email",
      kind: "credentials",
      label: "Resend",
      description: "Transactional email for password resets, invites, and notifications.",
      settingsKey: "emailEnabled",
      docsUrl: "https://resend.com/api-keys",
      envVars: [
        { name: "RESEND_API_KEY", configured: envConfigured("RESEND_API_KEY"), required: true },
        { name: "RESEND_FROM_EMAIL", configured: envConfigured("RESEND_FROM_EMAIL"), required: false },
      ],
    },
    {
      id: "unsplash",
      category: "media",
      kind: "credentials",
      label: "Unsplash",
      description: "Unsplash API key for featured images.",
      docsUrl: "https://unsplash.com/developers",
      envVars: [
        {
          name: "UNSPLASH_ACCESS_KEY",
          configured: envConfigured("UNSPLASH_ACCESS_KEY"),
          required: true,
        },
      ],
    },
    {
      id: "pexels",
      category: "media",
      kind: "credentials",
      label: "Pexels",
      description: "Pexels API key for featured images.",
      docsUrl: "https://www.pexels.com/api/",
      envVars: [
        { name: "PEXELS_API_KEY", configured: envConfigured("PEXELS_API_KEY"), required: true },
      ],
    },
    {
      id: "linkedin",
      category: "social",
      kind: "credentials",
      label: "LinkedIn",
      description: "OAuth app for project LinkedIn connect and publishing.",
      settingsKey: "socialPublishingEnabled",
      docsUrl: "https://www.linkedin.com/developers/",
      envVars: [
        {
          name: "LINKEDIN_CLIENT_ID",
          configured: envConfigured("LINKEDIN_CLIENT_ID"),
          required: true,
        },
        {
          name: "LINKEDIN_CLIENT_SECRET",
          configured: envConfigured("LINKEDIN_CLIENT_SECRET"),
          required: true,
        },
      ],
    },
    {
      id: "twitter",
      category: "social",
      kind: "credentials",
      label: "X",
      description: "OAuth app for project X (Twitter) connect and publishing.",
      settingsKey: "socialPublishingEnabled",
      docsUrl: "https://developer.x.com/",
      envVars: [
        {
          name: "TWITTER_CLIENT_ID",
          configured: envConfigured("TWITTER_CLIENT_ID"),
          required: true,
        },
        {
          name: "TWITTER_CLIENT_SECRET",
          configured: envConfigured("TWITTER_CLIENT_SECRET"),
          required: true,
        },
      ],
    },
    {
      id: "meta",
      category: "social",
      kind: "credentials",
      label: "Meta",
      description: "OAuth app for Facebook Page and Instagram publishing.",
      settingsKey: "socialPublishingEnabled",
      docsUrl: "https://developers.facebook.com/",
      envVars: [
        {
          name: "META_APP_ID",
          configured: envConfigured("META_APP_ID"),
          required: true,
        },
        {
          name: "META_APP_SECRET",
          configured: envConfigured("META_APP_SECRET"),
          required: true,
        },
      ],
    },
    {
      id: "bluesky",
      category: "social",
      kind: "credentials",
      label: "Bluesky",
      description: "AT Protocol OAuth signing key for project Bluesky connect.",
      settingsKey: "socialPublishingEnabled",
      docsUrl: "https://docs.bsky.app/docs/advanced-guides/oauth-client",
      envVars: [
        {
          name: "BLUESKY_OAUTH_PRIVATE_KEY_JWK",
          configured: envConfigured("BLUESKY_OAUTH_PRIVATE_KEY_JWK"),
          required: true,
        },
        {
          name: "BLUESKY_CLIENT_NAME",
          configured: envConfigured("BLUESKY_CLIENT_NAME"),
          required: false,
        },
      ],
    },
    {
      id: "mastodon",
      category: "social",
      kind: "info",
      label: "Mastodon",
      description:
        "Instance OAuth only — each project registers with its own Mastodon instance. No platform-wide app credentials.",
      settingsKey: "socialPublishingEnabled",
      docsUrl: "https://docs.joinmastodon.org/client/token/",
      envVars: [],
    },
    {
      id: "google",
      category: "search",
      kind: "credentials",
      label: "Google",
      description: "OAuth client for Google login, Search Console, Analytics, and Sheets.",
      settingsKey: "googleIntegrationsEnabled",
      docsUrl: "https://console.cloud.google.com/apis/credentials",
      envVars: [
        { name: "GOOGLE_CLIENT_ID", configured: envConfigured("GOOGLE_CLIENT_ID"), required: true },
        {
          name: "GOOGLE_CLIENT_SECRET",
          configured: envConfigured("GOOGLE_CLIENT_SECRET"),
          required: true,
        },
      ],
    },
    {
      id: "bing",
      category: "search",
      kind: "credentials",
      label: "Bing Webmaster Tools",
      description: "OAuth client so projects can connect Bing Webmaster for Copilot citation reports.",
      settingsKey: "bingWebmasterEnabled",
      docsUrl: "https://learn.microsoft.com/en-us/bingwebmaster/oauth2",
      envVars: [
        {
          name: "BING_WEBMASTER_CLIENT_ID",
          configured: envConfigured("BING_WEBMASTER_CLIENT_ID"),
          required: true,
        },
        {
          name: "BING_WEBMASTER_CLIENT_SECRET",
          configured: envConfigured("BING_WEBMASTER_CLIENT_SECRET"),
          required: true,
        },
      ],
    },
    {
      id: "dataforseo",
      category: "search",
      kind: "credentials",
      label: "DataForSEO",
      description:
        "LLM Mentions API for live ChatGPT and Google AI Overview citation checks on Search → Visibility.",
      docsUrl: "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/overview/",
      envVars: [
        {
          name: "DATAFORSEO_LOGIN",
          configured: envConfigured("DATAFORSEO_LOGIN"),
          required: true,
        },
        {
          name: "DATAFORSEO_PASSWORD",
          configured: envConfigured("DATAFORSEO_PASSWORD"),
          required: true,
        },
      ],
    },
    {
      id: "gemini",
      category: "ai",
      kind: "env",
      label: "Google Gemini",
      description:
        "Platform Gemini key used when organizations do not bring their own. Set GEMINI_API_KEY as a Worker secret.",
      docsUrl: "https://aistudio.google.com/apikey",
      envVars: [
        {
          name: "GEMINI_API_KEY",
          configured: envConfigured("GEMINI_API_KEY"),
          required: true,
        },
        {
          name: "AI_INTEGRATIONS_GEMINI_API_KEY",
          configured: envConfigured("AI_INTEGRATIONS_GEMINI_API_KEY"),
          required: false,
        },
      ],
    },
    {
      id: "openai",
      category: "ai",
      kind: "env",
      label: "OpenAI",
      description:
        "Platform OpenAI key used when organizations do not bring their own. Set OPENAI_API_KEY as a Worker secret.",
      docsUrl: "https://platform.openai.com/api-keys",
      envVars: [
        { name: "OPENAI_API_KEY", configured: envConfigured("OPENAI_API_KEY"), required: true },
      ],
    },
    {
      id: "anthropic",
      category: "ai",
      kind: "env",
      label: "Anthropic",
      description:
        "Platform Anthropic key used when organizations do not bring their own. Set ANTHROPIC_API_KEY as a Worker secret.",
      docsUrl: "https://console.anthropic.com/settings/keys",
      envVars: [
        {
          name: "ANTHROPIC_API_KEY",
          configured: envConfigured("ANTHROPIC_API_KEY"),
          required: true,
        },
      ],
    },
    {
      id: "openrouter",
      category: "ai",
      kind: "env",
      label: "OpenRouter",
      description:
        "Platform OpenRouter key used when organizations do not bring their own. Set OPENROUTER_API_KEY as a Worker secret.",
      docsUrl: "https://openrouter.ai/keys",
      envVars: [
        {
          name: "OPENROUTER_API_KEY",
          configured: envConfigured("OPENROUTER_API_KEY"),
          required: true,
        },
        {
          name: "OPENROUTER_MODEL",
          configured: envConfigured("OPENROUTER_MODEL"),
          required: false,
        },
      ],
    },
    {
      id: "groq",
      category: "ai",
      kind: "env",
      label: "Groq",
      description:
        "Platform Groq key used when organizations do not bring their own. Set GROQ_API_KEY as a Worker secret.",
      docsUrl: "https://console.groq.com/keys",
      envVars: [
        { name: "GROQ_API_KEY", configured: envConfigured("GROQ_API_KEY"), required: true },
        { name: "GROQ_MODEL", configured: envConfigured("GROQ_MODEL"), required: false },
      ],
    },
    {
      id: "nvidia",
      category: "ai",
      kind: "env",
      label: "NVIDIA NIM",
      description:
        "Platform NVIDIA NIM key used when organizations do not bring their own. Set NVIDIA_API_KEY as a Worker secret.",
      docsUrl: "https://build.nvidia.com/settings",
      envVars: [
        { name: "NVIDIA_API_KEY", configured: envConfigured("NVIDIA_API_KEY"), required: true },
        { name: "NVIDIA_MODEL", configured: envConfigured("NVIDIA_MODEL"), required: false },
      ],
    },
    {
      id: "ollama",
      category: "ai",
      kind: "env",
      label: "Ollama",
      description:
        "Local or self-hosted Ollama for platform fallback. Point OLLAMA_BASE_URL at a reachable host (not loopback in production Workers).",
      docsUrl: "https://ollama.com/",
      envVars: [
        {
          name: "OLLAMA_BASE_URL",
          configured: envConfigured("OLLAMA_BASE_URL"),
          required: false,
        },
        { name: "OLLAMA_MODEL", configured: envConfigured("OLLAMA_MODEL"), required: false },
      ],
    },
    {
      id: "bedrock",
      category: "ai",
      kind: "credentials",
      label: "AWS Bedrock",
      description: "Platform Bedrock API key granted to selected organizations.",
      docsUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html",
      envVars: [
        {
          name: "AWS_BEARER_TOKEN_BEDROCK",
          configured: envConfigured("AWS_BEARER_TOKEN_BEDROCK"),
          required: false,
        },
        {
          name: "AWS_ACCESS_KEY_ID",
          configured: envConfigured("AWS_ACCESS_KEY_ID"),
          required: false,
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          configured: envConfigured("AWS_SECRET_ACCESS_KEY"),
          required: false,
        },
        {
          name: "AWS_REGION",
          configured: envConfigured("AWS_REGION") || envConfigured("AWS_DEFAULT_REGION"),
          required: false,
        },
        {
          name: "BEDROCK_MODEL",
          configured: envConfigured("BEDROCK_MODEL"),
          required: false,
        },
      ],
    },
  ];
}

export function integrationEnvReady(definition: PlatformIntegrationDefinition): boolean {
  if (definition.kind === "info") return true;
  const required = definition.envVars.filter((v) => v.required);
  if (required.length === 0) {
    return definition.envVars.some((v) => v.configured);
  }
  return required.every((v) => v.configured);
}

export function getPlatformIntegrationsByCategory(): {
  category: (typeof PLATFORM_INTEGRATION_CATEGORIES)[number];
  integrations: PlatformIntegrationDefinition[];
}[] {
  const definitions = getPlatformIntegrationDefinitions();
  return PLATFORM_INTEGRATION_CATEGORIES.map((category) => ({
    category,
    integrations: definitions.filter((integration) => integration.category === category.id),
  })).filter((group) => group.integrations.length > 0);
}
