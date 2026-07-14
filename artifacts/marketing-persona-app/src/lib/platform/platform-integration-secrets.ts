import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import {
  invalidateStripeClientCache,
  lastFour,
  resolvePlatformResendCredentials,
  resolvePlatformStripeCredentials,
} from "@workspace/billing";
import { eq } from "drizzle-orm";

export type IntegrationFieldStatus = {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour: string | null;
};

export type PlatformIntegrationStatus = {
  stripe: {
    managedByEnv: boolean;
    envVars: string[];
    secretKey: IntegrationFieldStatus;
    webhookSecret: IntegrationFieldStatus;
    priceGrowthMonthly: { configured: boolean; value: string | null; source: "db" | "env" | null };
    priceScaleMonthly: { configured: boolean; value: string | null; source: "db" | "env" | null };
  };
  resend: {
    managedByEnv: boolean;
    envVars: string[];
    apiKey: IntegrationFieldStatus;
    fromEmail: { configured: boolean; value: string | null; source: "db" | "env" | null };
  };
};

const STRIPE_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_SCALE_MONTHLY",
] as const;

const RESEND_ENV_VARS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] as const;

function activeEnvVars(names: readonly string[]): string[] {
  return names.filter((name) => Boolean(process.env[name]?.trim()));
}

export function isStripeManagedByEnv(): boolean {
  return activeEnvVars(STRIPE_ENV_VARS).length > 0;
}

export function isResendManagedByEnv(): boolean {
  return activeEnvVars(RESEND_ENV_VARS).length > 0;
}

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

function fieldStatus(
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

function plainFieldStatus(
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

export async function getPlatformIntegrationStatus(): Promise<PlatformIntegrationStatus> {
  const [row] = await db
    .select({
      encryptedStripeSecretKey: platformSettingsTable.encryptedStripeSecretKey,
      encryptedStripeWebhookSecret: platformSettingsTable.encryptedStripeWebhookSecret,
      stripePriceGrowthMonthly: platformSettingsTable.stripePriceGrowthMonthly,
      stripePriceScaleMonthly: platformSettingsTable.stripePriceScaleMonthly,
      encryptedResendApiKey: platformSettingsTable.encryptedResendApiKey,
      resendFromEmail: platformSettingsTable.resendFromEmail,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  return {
    stripe: {
      managedByEnv: isStripeManagedByEnv(),
      envVars: activeEnvVars(STRIPE_ENV_VARS),
      secretKey: fieldStatus(row?.encryptedStripeSecretKey, "STRIPE_SECRET_KEY"),
      webhookSecret: fieldStatus(row?.encryptedStripeWebhookSecret, "STRIPE_WEBHOOK_SECRET"),
      priceGrowthMonthly: plainFieldStatus(
        row?.stripePriceGrowthMonthly,
        "STRIPE_PRICE_GROWTH_MONTHLY",
      ),
      priceScaleMonthly: plainFieldStatus(row?.stripePriceScaleMonthly, "STRIPE_PRICE_SCALE_MONTHLY"),
    },
    resend: {
      managedByEnv: isResendManagedByEnv(),
      envVars: activeEnvVars(RESEND_ENV_VARS),
      apiKey: fieldStatus(row?.encryptedResendApiKey, "RESEND_API_KEY"),
      fromEmail: plainFieldStatus(row?.resendFromEmail, "RESEND_FROM_EMAIL"),
    },
  };
}

export type SaveStripeCredentialsInput = {
  secretKey?: string;
  webhookSecret?: string;
  priceGrowthMonthly?: string | null;
  priceScaleMonthly?: string | null;
  updatedBy: number;
};

export type SaveResendCredentialsInput = {
  apiKey?: string;
  fromEmail?: string | null;
  updatedBy: number;
};

export async function saveStripeCredentials(input: SaveStripeCredentialsInput): Promise<void> {
  if (isStripeManagedByEnv()) {
    throw new Error("Stripe credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.secretKey !== undefined) {
    patch.encryptedStripeSecretKey = input.secretKey
      ? encryptSecret(input.secretKey.trim())
      : null;
  }
  if (input.webhookSecret !== undefined) {
    patch.encryptedStripeWebhookSecret = input.webhookSecret
      ? encryptSecret(input.webhookSecret.trim())
      : null;
  }
  if (input.priceGrowthMonthly !== undefined) {
    patch.stripePriceGrowthMonthly = input.priceGrowthMonthly?.trim() || null;
  }
  if (input.priceScaleMonthly !== undefined) {
    patch.stripePriceScaleMonthly = input.priceScaleMonthly?.trim() || null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidateStripeClientCache();
}

export async function saveResendCredentials(input: SaveResendCredentialsInput): Promise<void> {
  if (isResendManagedByEnv()) {
    throw new Error("Resend credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.apiKey !== undefined) {
    patch.encryptedResendApiKey = input.apiKey ? encryptSecret(input.apiKey.trim()) : null;
  }
  if (input.fromEmail !== undefined) {
    patch.resendFromEmail = input.fromEmail?.trim() || null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidateStripeClientCache();
}

export async function clearStoredStripeCredentials(updatedBy: number): Promise<void> {
  if (isStripeManagedByEnv()) {
    throw new Error("Stripe credentials are managed via server environment variables");
  }
  await saveStripeCredentials({
    secretKey: "",
    webhookSecret: "",
    priceGrowthMonthly: null,
    priceScaleMonthly: null,
    updatedBy,
  });
}

export async function clearStoredResendCredentials(updatedBy: number): Promise<void> {
  if (isResendManagedByEnv()) {
    throw new Error("Resend credentials are managed via server environment variables");
  }
  await saveResendCredentials({
    apiKey: "",
    fromEmail: null,
    updatedBy,
  });
}

export async function isStripeIntegrationReady(): Promise<boolean> {
  const creds = await resolvePlatformStripeCredentials();
  return Boolean(
    creds?.secretKey &&
      creds.webhookSecret &&
      creds.priceGrowthMonthly &&
      creds.priceScaleMonthly,
  );
}

export async function isResendIntegrationReady(): Promise<boolean> {
  return Boolean((await resolvePlatformResendCredentials())?.apiKey);
}
