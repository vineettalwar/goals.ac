import type { PlatformStatus } from "./platform-settings";

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

export type PlatformIntegrationCategoryId = "billing" | "email" | "media" | "social";

export type PlatformIntegrationId =
  | "stripe"
  | "resend"
  | "unsplash"
  | "pexels"
  | "linkedin"
  | "twitter"
  | "meta"
  | "bluesky";

export type PlatformIntegrationSettingsKey =
  | "stripeBillingEnabled"
  | "emailEnabled"
  | "socialPublishingEnabled";

export type PlatformIntegrationKind = "credentials" | "env";

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

export function hasLinkedInCredentials(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() && process.env.LINKEDIN_CLIENT_SECRET?.trim(),
  );
}

export function hasTwitterCredentials(): boolean {
  return Boolean(
    process.env.TWITTER_CLIENT_ID?.trim() && process.env.TWITTER_CLIENT_SECRET?.trim(),
  );
}

export function hasMetaCredentials(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim());
}

export function hasBlueskyCredentials(): boolean {
  return Boolean(process.env.BLUESKY_OAUTH_PRIVATE_KEY_JWK?.trim());
}

export function hasUnsplashCredentials(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

export function hasPexelsCredentials(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

export function hasSocialCredentials(): boolean {
  return (
    hasLinkedInCredentials() ||
    hasTwitterCredentials() ||
    hasMetaCredentials() ||
    hasBlueskyCredentials()
  );
}

export function hasResendCredentials(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function hasStripeCredentials(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getIntegrationEnvStatus(): IntegrationEnvStatus {
  return {
    google: hasGoogleCredentials(),
    bing: hasBingCredentials(),
    social: hasSocialCredentials(),
    linkedin: hasLinkedInCredentials(),
    twitter: hasTwitterCredentials(),
    meta: hasMetaCredentials(),
    bluesky: hasBlueskyCredentials(),
    email: hasResendCredentials(),
    stripe: hasStripeCredentials(),
    unsplash: hasUnsplashCredentials(),
    pexels: hasPexelsCredentials(),
  };
}

export function googleIntegrationsAvailable(settings: PlatformStatus): boolean {
  return settings.googleIntegrationsEnabled && hasGoogleCredentials();
}

export function bingWebmasterAvailable(settings: PlatformStatus): boolean {
  return settings.bingWebmasterEnabled && hasBingCredentials();
}

export function socialPublishingAvailable(settings: PlatformStatus): boolean {
  return settings.socialPublishingEnabled && hasSocialCredentials();
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
  ];
}

export function integrationEnvReady(definition: PlatformIntegrationDefinition): boolean {
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
