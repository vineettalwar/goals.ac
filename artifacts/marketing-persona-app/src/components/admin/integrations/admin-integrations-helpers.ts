import type { PlatformIntegrationStatus } from "@/lib/platform/platform-integration-secrets";
import {
  integrationEnvReady,
  type IntegrationEnvStatus,
  type PlatformIntegrationDefinition,
  type PlatformIntegrationId,
  type PlatformIntegrationSettingsKey,
} from "@/lib/platform/platform-features";

export interface PlatformSettingsResponse {
  stripeBillingEnabled: boolean;
  emailEnabled: boolean;
  socialPublishingEnabled: boolean;
}

export type ToggleKey = PlatformIntegrationSettingsKey;
export type ActiveDialog = PlatformIntegrationId | null;

export type AdminIntegrationsCounts = {
  total: number;
  billing: number;
  email: number;
  media: number;
  social: number;
};

export function integrationSummary(
  configured: boolean,
  enabled: boolean | undefined,
  active: boolean,
  lastFour?: string | null,
  managedByEnv?: boolean,
): string {
  if (managedByEnv) return lastFour ? `Env configured · ••••${lastFour}` : "Env configured";
  if (active) return lastFour ? `Active · ••••${lastFour}` : "Active";
  if (enabled && !configured) return "Enabled — needs credentials";
  if (configured) return lastFour ? `Configured · ••••${lastFour}` : "Configured";
  return "Not configured";
}

function isStripeApiConfigured(
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  return env.stripe || status.stripe.connect.connected || status.stripe.secretKey.configured;
}

export function isIntegrationConfigured(
  definition: PlatformIntegrationDefinition,
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  if (definition.kind === "env") {
    return integrationEnvReady(definition);
  }
  if (definition.id === "stripe") {
    return (
      isStripeApiConfigured(env, status) &&
      status.stripe.webhookSecret.configured &&
      status.stripe.priceGrowthMonthly.configured &&
      status.stripe.priceScaleMonthly.configured
    );
  }
  if (definition.id === "resend") return status.resend.apiKey.configured;
  if (definition.id === "unsplash") return status.unsplash.accessKey.configured;
  if (definition.id === "pexels") return status.pexels.apiKey.configured;
  if (definition.id === "linkedin") {
    return status.linkedin.clientId.configured && status.linkedin.clientSecret.configured;
  }
  return false;
}

export function isIntegrationEnabled(
  definition: PlatformIntegrationDefinition,
  settings: PlatformSettingsResponse,
): boolean | undefined {
  if (!definition.settingsKey) return undefined;
  return settings[definition.settingsKey];
}

export function isIntegrationActive(
  definition: PlatformIntegrationDefinition,
  settings: PlatformSettingsResponse,
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  const configured = isIntegrationConfigured(definition, env, status);
  if (!definition.settingsKey) {
    return configured;
  }
  const enabled = isIntegrationEnabled(definition, settings);
  return Boolean(enabled && configured);
}

export function isIntegrationPending(
  definition: PlatformIntegrationDefinition,
  settings: PlatformSettingsResponse,
  env: IntegrationEnvStatus,
  status: PlatformIntegrationStatus,
): boolean {
  const enabled = isIntegrationEnabled(definition, settings);
  if (enabled === undefined) return false;
  return enabled && !isIntegrationConfigured(definition, env, status);
}

export function getIntegrationLastFour(
  definition: PlatformIntegrationDefinition,
  status: PlatformIntegrationStatus,
): string | null {
  if (definition.id === "stripe") {
    if (status.stripe.connect.connected) return status.stripe.connect.lastFour;
    return status.stripe.secretKey.lastFour;
  }
  if (definition.id === "resend") return status.resend.apiKey.lastFour;
  if (definition.id === "unsplash") return status.unsplash.accessKey.lastFour;
  if (definition.id === "pexels") return status.pexels.apiKey.lastFour;
  if (definition.id === "linkedin") return status.linkedin.clientSecret.lastFour;
  return null;
}

export function isIntegrationManagedByEnv(
  definition: PlatformIntegrationDefinition,
  status: PlatformIntegrationStatus,
): boolean {
  if (definition.id === "stripe") return status.stripe.managedByEnv;
  if (definition.id === "resend") return status.resend.managedByEnv;
  if (definition.id === "unsplash") return status.unsplash.managedByEnv;
  if (definition.id === "pexels") return status.pexels.managedByEnv;
  if (definition.id === "linkedin") return status.linkedin.managedByEnv;
  return definition.kind === "env";
}
