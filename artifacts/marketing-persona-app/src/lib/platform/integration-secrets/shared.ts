import "server-only";

import { decryptSecret } from "@workspace/security/encryption";
import { lastFour } from "@workspace/billing";
import type { IntegrationFieldStatus } from "@/lib/platform/platform-integration-types";

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

export function isUnsplashManagedByEnv(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

export function isPexelsManagedByEnv(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

export function invalidatePlatformStockCredentialsCache(): void {
  // Platform stock keys are read from env in @workspace/stock-images; DB cache not used yet.
}

export function activeEnvVars(names: readonly string[]): string[] {
  return names.filter((name) => Boolean(process.env[name]?.trim()));
}

export function isStripeManagedByEnv(): boolean {
  return activeEnvVars(STRIPE_ENV_VARS).length > 0;
}

export function isResendManagedByEnv(): boolean {
  return activeEnvVars(RESEND_ENV_VARS).length > 0;
}

export function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
}

export function fieldStatus(
  dbEncrypted: string | null | undefined,
  envName: string,
): IntegrationFieldStatus {
  const fromEnv = envTrim(envName);
  if (fromEnv) {
    return { configured: true, source: "env", lastFour: lastFour(fromEnv) };
  }
  const fromDb = safeDecrypt(dbEncrypted);
  if (fromDb) {
    return { configured: true, source: "db", lastFour: lastFour(fromDb) };
  }
  return { configured: false, source: null, lastFour: null };
}

export function plainFieldStatus(
  dbValue: string | null | undefined,
  envName: string,
): { configured: boolean; value: string | null; source: "db" | "env" | null } {
  const fromEnv = envTrim(envName);
  if (fromEnv) {
    return { configured: true, value: fromEnv, source: "env" };
  }
  const trimmedDb = dbValue?.trim();
  if (trimmedDb) {
    return { configured: true, value: trimmedDb, source: "db" };
  }
  return { configured: false, value: null, source: null };
}
