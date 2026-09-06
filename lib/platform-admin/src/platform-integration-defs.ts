// ── Env helpers ───────────────────────────────────────────────────────────────

export function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function envConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function activeEnvVars(names: readonly string[]): string[] {
  return names.filter((name) => Boolean(process.env[name]?.trim()));
}

// ── Env credential checks ─────────────────────────────────────────────────────

export function hasGoogleCredentials(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function hasBingCredentials(): boolean {
  return Boolean(
    process.env.BING_WEBMASTER_CLIENT_ID?.trim() &&
      process.env.BING_WEBMASTER_CLIENT_SECRET?.trim(),
  );
}

export function isLinkedInManagedByEnv(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() || process.env.LINKEDIN_CLIENT_SECRET?.trim(),
  );
}

export function isTwitterManagedByEnv(): boolean {
  return Boolean(
    process.env.TWITTER_CLIENT_ID?.trim() || process.env.TWITTER_CLIENT_SECRET?.trim(),
  );
}

export function isMetaManagedByEnv(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() || process.env.META_APP_SECRET?.trim());
}

export function isBlueskyManagedByEnv(): boolean {
  return Boolean(process.env.BLUESKY_OAUTH_PRIVATE_KEY_JWK?.trim());
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

// ── Integration env status ────────────────────────────────────────────────────

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
};

// ── Platform integration definitions ─────────────────────────────────────────

export type PlatformIntegrationCategoryId = "billing" | "email" | "media" | "social" | "ai";

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
  | "bedrock";

export type PlatformIntegrationSettingsKey =
  | "stripeBillingEnabled"
  | "emailEnabled"
  | "socialPublishingEnabled";

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
    description: "Free platform-wide API keys for keyword-matched article featured images.",
  },
  {
    id: "social",
    label: "Social publishing",
    description: "OAuth apps so projects can connect LinkedIn and other networks.",
  },
  {
    id: "ai",
    label: "AI providers",
    description: "Platform AI credentials shared with selected organizations.",
  },
];

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
      description: "Free stock photos for article featured images.",
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
      description: "Free stock photos for article featured images.",
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
      id: "bedrock",
      category: "ai",
      kind: "credentials",
      label: "AWS Bedrock",
      description: "Platform Bedrock credentials granted to selected organizations.",
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

// ── Integration env var arrays ────────────────────────────────────────────────

export const STRIPE_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_SCALE_MONTHLY",
] as const;

export const RESEND_ENV_VARS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] as const;
export const UNSPLASH_ENV_VARS = ["UNSPLASH_ACCESS_KEY"] as const;
export const PEXELS_ENV_VARS = ["PEXELS_API_KEY"] as const;
export const LINKEDIN_ENV_VARS = ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"] as const;
export const TWITTER_ENV_VARS = ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"] as const;
export const META_ENV_VARS = ["META_APP_ID", "META_APP_SECRET"] as const;
export const BLUESKY_ENV_VARS = ["BLUESKY_OAUTH_PRIVATE_KEY_JWK", "BLUESKY_CLIENT_NAME"] as const;

export function isStripeManagedByEnv(): boolean {
  return activeEnvVars(STRIPE_ENV_VARS).length > 0;
}

export function isResendManagedByEnv(): boolean {
  return activeEnvVars(RESEND_ENV_VARS).length > 0;
}

export function isUnsplashManagedByEnv(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

export function isPexelsManagedByEnv(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

export function stripeConnectOAuthAvailable(): boolean {
  return Boolean(process.env.STRIPE_CONNECT_CLIENT_ID?.trim());
}
