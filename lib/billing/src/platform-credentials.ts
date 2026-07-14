import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import type { PlanId } from "./plans";

type CredentialSource = "db" | "env";

export interface PlatformStripeCredentials {
  secretKey: string;
  webhookSecret: string | null;
  priceGrowthMonthly: string | null;
  priceScaleMonthly: string | null;
  source: CredentialSource;
}

export interface PlatformResendCredentials {
  apiKey: string;
  fromEmail: string;
  source: CredentialSource;
}

type StoredPlatformCredentials = {
  encryptedStripeSecretKey: string | null;
  encryptedStripeConnectAccessToken: string | null;
  encryptedStripeWebhookSecret: string | null;
  stripePriceGrowthMonthly: string | null;
  stripePriceScaleMonthly: string | null;
  encryptedResendApiKey: string | null;
  resendFromEmail: string | null;
};

let cache: { row: StoredPlatformCredentials | null; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
}

export function invalidatePlatformCredentialsCache(): void {
  cache = null;
}

async function loadStoredCredentials(): Promise<StoredPlatformCredentials | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.row;
  }

  const [row] = await db
    .select({
      encryptedStripeSecretKey: platformSettingsTable.encryptedStripeSecretKey,
      encryptedStripeConnectAccessToken: platformSettingsTable.encryptedStripeConnectAccessToken,
      encryptedStripeWebhookSecret: platformSettingsTable.encryptedStripeWebhookSecret,
      stripePriceGrowthMonthly: platformSettingsTable.stripePriceGrowthMonthly,
      stripePriceScaleMonthly: platformSettingsTable.stripePriceScaleMonthly,
      encryptedResendApiKey: platformSettingsTable.encryptedResendApiKey,
      resendFromEmail: platformSettingsTable.resendFromEmail,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  cache = { row: row ?? null, expiresAt: Date.now() + CACHE_TTL_MS };
  return cache.row;
}

function pickSecret(
  dbValue: string | null | undefined,
  envName: string,
): { value: string | null; source: CredentialSource | null } {
  const fromEnv = envTrim(envName);
  if (fromEnv) return { value: fromEnv, source: "env" };
  const fromDb = safeDecrypt(dbValue);
  if (fromDb) return { value: fromDb, source: "db" };
  return { value: null, source: null };
}

function pickPlain(
  dbValue: string | null | undefined,
  envName: string,
): { value: string | null; source: CredentialSource | null } {
  const fromEnv = envTrim(envName);
  if (fromEnv) return { value: fromEnv, source: "env" };
  const trimmedDb = dbValue?.trim();
  if (trimmedDb) return { value: trimmedDb, source: "db" };
  return { value: null, source: null };
}

function pickStripeSecretKey(row: StoredPlatformCredentials | null): {
  value: string | null;
  source: CredentialSource | null;
} {
  const fromEnv = envTrim("STRIPE_SECRET_KEY");
  if (fromEnv) return { value: fromEnv, source: "env" };

  const fromConnect = safeDecrypt(row?.encryptedStripeConnectAccessToken);
  if (fromConnect) return { value: fromConnect, source: "db" };

  const fromDb = safeDecrypt(row?.encryptedStripeSecretKey);
  if (fromDb) return { value: fromDb, source: "db" };

  return { value: null, source: null };
}

export async function resolvePlatformStripeCredentials(): Promise<PlatformStripeCredentials | null> {
  const row = await loadStoredCredentials();
  const secret = pickStripeSecretKey(row);
  if (!secret.value) return null;

  const webhook = pickSecret(row?.encryptedStripeWebhookSecret, "STRIPE_WEBHOOK_SECRET");
  const growth = pickPlain(row?.stripePriceGrowthMonthly, "STRIPE_PRICE_GROWTH_MONTHLY");
  const scale = pickPlain(row?.stripePriceScaleMonthly, "STRIPE_PRICE_SCALE_MONTHLY");

  const source =
    secret.source === "env" ||
    webhook.source === "env" ||
    growth.source === "env" ||
    scale.source === "env"
      ? "env"
      : "db";

  return {
    secretKey: secret.value,
    webhookSecret: webhook.value,
    priceGrowthMonthly: growth.value,
    priceScaleMonthly: scale.value,
    source,
  };
}

export async function resolvePlatformResendCredentials(): Promise<PlatformResendCredentials | null> {
  const row = await loadStoredCredentials();
  const apiKey = pickSecret(row?.encryptedResendApiKey, "RESEND_API_KEY");
  if (!apiKey.value) return null;

  const fromEmail = pickPlain(row?.resendFromEmail, "RESEND_FROM_EMAIL");
  return {
    apiKey: apiKey.value,
    fromEmail: fromEmail.value ?? "noreply@goals.ac",
    source: apiKey.source === "env" || fromEmail.source === "env" ? "env" : "db",
  };
}

export async function hasPlatformStripeSecretKey(): Promise<boolean> {
  return Boolean((await resolvePlatformStripeCredentials())?.secretKey);
}

export async function hasPlatformResendApiKey(): Promise<boolean> {
  return Boolean((await resolvePlatformResendCredentials())?.apiKey);
}

export async function getStripePriceIdForPlanResolved(plan: PlanId): Promise<string | null> {
  const creds = await resolvePlatformStripeCredentials();
  if (!creds) return null;
  if (plan === "growth") return creds.priceGrowthMonthly;
  if (plan === "scale") return creds.priceScaleMonthly;
  return null;
}

export async function planFromStripePriceIdResolved(
  priceId: string | null | undefined,
): Promise<PlanId | null> {
  if (!priceId) return null;
  const creds = await resolvePlatformStripeCredentials();
  if (!creds) return null;
  if (creds.priceGrowthMonthly && priceId === creds.priceGrowthMonthly) return "growth";
  if (creds.priceScaleMonthly && priceId === creds.priceScaleMonthly) return "scale";
  return null;
}

export function lastFour(value: string | null | undefined): string | null {
  if (!value || value.length < 4) return null;
  return value.slice(-4);
}
