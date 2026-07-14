import type { PlatformStatus } from "./platform-settings";

export type IntegrationEnvStatus = {
  google: boolean;
  bing: boolean;
  social: boolean;
  email: boolean;
  stripe: boolean;
};

export type PlatformIntegrationEnvVar = {
  name: string;
  configured: boolean;
  required: boolean;
};

export type PlatformIntegrationDefinition = {
  id: "stripe" | "resend";
  label: string;
  description: string;
  settingsKey: "stripeBillingEnabled" | "emailEnabled";
  envVars: PlatformIntegrationEnvVar[];
  docsUrl?: string;
};

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

export function hasSocialCredentials(): boolean {
  return Boolean(
    (process.env.LINKEDIN_CLIENT_ID?.trim() && process.env.LINKEDIN_CLIENT_SECRET?.trim()) ||
      (process.env.TWITTER_CLIENT_ID?.trim() && process.env.TWITTER_CLIENT_SECRET?.trim()) ||
      (process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()),
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
    email: hasResendCredentials(),
    stripe: hasStripeCredentials(),
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
      label: "Stripe",
      description: "Self-serve checkout, subscriptions, and customer billing portal.",
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
      label: "Resend",
      description: "Transactional email for password resets, invites, and notifications.",
      settingsKey: "emailEnabled",
      docsUrl: "https://resend.com/api-keys",
      envVars: [
        { name: "RESEND_API_KEY", configured: envConfigured("RESEND_API_KEY"), required: true },
        { name: "RESEND_FROM_EMAIL", configured: envConfigured("RESEND_FROM_EMAIL"), required: false },
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
