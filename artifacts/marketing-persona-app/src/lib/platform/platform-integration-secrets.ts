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
import {
  clearStripeConnectTokens,
  deauthorizeStripeConnectAccount,
  stripeConnectOAuthAvailable,
} from "@/lib/platform/stripe-connect-oauth";
import {
  invalidatePlatformLinkedInCredentialsCache,
  isLinkedInManagedByEnv,
} from "@workspace/content-engine/support/social/linkedin-platform-credentials";
import {
  invalidatePlatformTwitterCredentialsCache,
  isTwitterManagedByEnv,
} from "@workspace/content-engine/support/social/twitter-platform-credentials";
import {
  invalidatePlatformMetaCredentialsCache,
  isMetaManagedByEnv,
} from "@workspace/content-engine/support/social/meta-platform-credentials";
import { eq } from "drizzle-orm";

function isUnsplashManagedByEnv(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

function isPexelsManagedByEnv(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

function invalidatePlatformStockCredentialsCache(): void {
  // Platform stock keys are read from env in @workspace/stock-images; DB cache not used yet.
}

export type IntegrationFieldStatus = {
  configured: boolean;
  source: "db" | "env" | null;
  lastFour: string | null;
};

export type PlatformIntegrationStatus = {
  stripe: {
    managedByEnv: boolean;
    envVars: string[];
    connectAvailable: boolean;
    connect: {
      connected: boolean;
      accountId: string | null;
      livemode: boolean | null;
      connectedAt: string | null;
      lastFour: string | null;
    };
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
  unsplash: {
    managedByEnv: boolean;
    envVars: string[];
    accessKey: IntegrationFieldStatus;
  };
  pexels: {
    managedByEnv: boolean;
    envVars: string[];
    apiKey: IntegrationFieldStatus;
  };
  linkedin: {
    managedByEnv: boolean;
    envVars: string[];
    clientId: { configured: boolean; value: string | null; source: "db" | "env" | null };
    clientSecret: IntegrationFieldStatus;
  };
  twitter: {
    managedByEnv: boolean;
    envVars: string[];
    clientId: { configured: boolean; value: string | null; source: "db" | "env" | null };
    clientSecret: IntegrationFieldStatus;
  };
  meta: {
    managedByEnv: boolean;
    envVars: string[];
    appId: { configured: boolean; value: string | null; source: "db" | "env" | null };
    appSecret: IntegrationFieldStatus;
  };
};

const STRIPE_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_GROWTH_MONTHLY",
  "STRIPE_PRICE_SCALE_MONTHLY",
] as const;

const RESEND_ENV_VARS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"] as const;
const UNSPLASH_ENV_VARS = ["UNSPLASH_ACCESS_KEY"] as const;
const PEXELS_ENV_VARS = ["PEXELS_API_KEY"] as const;
const LINKEDIN_ENV_VARS = ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"] as const;
const TWITTER_ENV_VARS = ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"] as const;
const META_ENV_VARS = ["META_APP_ID", "META_APP_SECRET"] as const;

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
      encryptedStripeConnectAccessToken: platformSettingsTable.encryptedStripeConnectAccessToken,
      encryptedStripeWebhookSecret: platformSettingsTable.encryptedStripeWebhookSecret,
      stripePriceGrowthMonthly: platformSettingsTable.stripePriceGrowthMonthly,
      stripePriceScaleMonthly: platformSettingsTable.stripePriceScaleMonthly,
      stripeConnectAccountId: platformSettingsTable.stripeConnectAccountId,
      stripeConnectLivemode: platformSettingsTable.stripeConnectLivemode,
      stripeConnectConnectedAt: platformSettingsTable.stripeConnectConnectedAt,
      encryptedResendApiKey: platformSettingsTable.encryptedResendApiKey,
      resendFromEmail: platformSettingsTable.resendFromEmail,
      encryptedUnsplashAccessKey: platformSettingsTable.encryptedUnsplashAccessKey,
      encryptedPexelsApiKey: platformSettingsTable.encryptedPexelsApiKey,
      linkedinClientId: platformSettingsTable.linkedinClientId,
      encryptedLinkedinClientSecret: platformSettingsTable.encryptedLinkedinClientSecret,
      twitterClientId: platformSettingsTable.twitterClientId,
      encryptedTwitterClientSecret: platformSettingsTable.encryptedTwitterClientSecret,
      metaAppId: platformSettingsTable.metaAppId,
      encryptedMetaAppSecret: platformSettingsTable.encryptedMetaAppSecret,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const connectToken = safeDecrypt(row?.encryptedStripeConnectAccessToken);

  return {
    stripe: {
      managedByEnv: isStripeManagedByEnv(),
      envVars: activeEnvVars(STRIPE_ENV_VARS),
      connectAvailable: stripeConnectOAuthAvailable(),
      connect: {
        connected: Boolean(connectToken && row?.stripeConnectAccountId),
        accountId: row?.stripeConnectAccountId ?? null,
        livemode: row?.stripeConnectLivemode ?? null,
        connectedAt: row?.stripeConnectConnectedAt?.toISOString() ?? null,
        lastFour: lastFour(connectToken),
      },
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
    unsplash: {
      managedByEnv: isUnsplashManagedByEnv(),
      envVars: activeEnvVars(UNSPLASH_ENV_VARS),
      accessKey: fieldStatus(row?.encryptedUnsplashAccessKey, "UNSPLASH_ACCESS_KEY"),
    },
    pexels: {
      managedByEnv: isPexelsManagedByEnv(),
      envVars: activeEnvVars(PEXELS_ENV_VARS),
      apiKey: fieldStatus(row?.encryptedPexelsApiKey, "PEXELS_API_KEY"),
    },
    linkedin: {
      managedByEnv: isLinkedInManagedByEnv(),
      envVars: activeEnvVars(LINKEDIN_ENV_VARS),
      clientId: plainFieldStatus(row?.linkedinClientId, "LINKEDIN_CLIENT_ID"),
      clientSecret: fieldStatus(row?.encryptedLinkedinClientSecret, "LINKEDIN_CLIENT_SECRET"),
    },
    twitter: {
      managedByEnv: isTwitterManagedByEnv(),
      envVars: activeEnvVars(TWITTER_ENV_VARS),
      clientId: plainFieldStatus(row?.twitterClientId, "TWITTER_CLIENT_ID"),
      clientSecret: fieldStatus(row?.encryptedTwitterClientSecret, "TWITTER_CLIENT_SECRET"),
    },
    meta: {
      managedByEnv: isMetaManagedByEnv(),
      envVars: activeEnvVars(META_ENV_VARS),
      appId: plainFieldStatus(row?.metaAppId, "META_APP_ID"),
      appSecret: fieldStatus(row?.encryptedMetaAppSecret, "META_APP_SECRET"),
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

export type SaveUnsplashCredentialsInput = {
  accessKey?: string;
  updatedBy: number;
};

export type SavePexelsCredentialsInput = {
  apiKey?: string;
  updatedBy: number;
};

export type SaveLinkedInCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

export type SaveTwitterCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

export type SaveMetaCredentialsInput = {
  appId?: string | null;
  appSecret?: string;
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

export async function saveUnsplashCredentials(input: SaveUnsplashCredentialsInput): Promise<void> {
  if (isUnsplashManagedByEnv()) {
    throw new Error("Unsplash credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.accessKey !== undefined) {
    patch.encryptedUnsplashAccessKey = input.accessKey
      ? encryptSecret(input.accessKey.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformStockCredentialsCache();
}

export async function savePexelsCredentials(input: SavePexelsCredentialsInput): Promise<void> {
  if (isPexelsManagedByEnv()) {
    throw new Error("Pexels credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.apiKey !== undefined) {
    patch.encryptedPexelsApiKey = input.apiKey ? encryptSecret(input.apiKey.trim()) : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformStockCredentialsCache();
}

export async function saveLinkedInCredentials(input: SaveLinkedInCredentialsInput): Promise<void> {
  if (isLinkedInManagedByEnv()) {
    throw new Error("LinkedIn credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.linkedinClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedLinkedinClientSecret = input.clientSecret
      ? encryptSecret(input.clientSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformLinkedInCredentialsCache();
}

export async function clearStoredStripeCredentials(updatedBy: number): Promise<void> {
  if (isStripeManagedByEnv()) {
    throw new Error("Stripe credentials are managed via server environment variables");
  }

  const [row] = await db
    .select({
      stripeConnectAccountId: platformSettingsTable.stripeConnectAccountId,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  if (row?.stripeConnectAccountId) {
    await deauthorizeStripeConnectAccount(row.stripeConnectAccountId);
    await clearStripeConnectTokens(updatedBy);
  }

  await saveStripeCredentials({
    secretKey: "",
    webhookSecret: "",
    priceGrowthMonthly: null,
    priceScaleMonthly: null,
    updatedBy,
  });
}

export async function disconnectStripeConnect(updatedBy: number): Promise<void> {
  if (isStripeManagedByEnv()) {
    throw new Error("Stripe credentials are managed via server environment variables");
  }

  const [row] = await db
    .select({
      stripeConnectAccountId: platformSettingsTable.stripeConnectAccountId,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  if (row?.stripeConnectAccountId) {
    await deauthorizeStripeConnectAccount(row.stripeConnectAccountId);
  }

  await clearStripeConnectTokens(updatedBy);
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

export async function clearStoredUnsplashCredentials(updatedBy: number): Promise<void> {
  if (isUnsplashManagedByEnv()) {
    throw new Error("Unsplash credentials are managed via server environment variables");
  }
  await saveUnsplashCredentials({ accessKey: "", updatedBy });
}

export async function clearStoredPexelsCredentials(updatedBy: number): Promise<void> {
  if (isPexelsManagedByEnv()) {
    throw new Error("Pexels credentials are managed via server environment variables");
  }
  await savePexelsCredentials({ apiKey: "", updatedBy });
}

export async function clearStoredLinkedInCredentials(updatedBy: number): Promise<void> {
  if (isLinkedInManagedByEnv()) {
    throw new Error("LinkedIn credentials are managed via server environment variables");
  }
  await saveLinkedInCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export async function saveTwitterCredentials(input: SaveTwitterCredentialsInput): Promise<void> {
  if (isTwitterManagedByEnv()) {
    throw new Error("X credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.twitterClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedTwitterClientSecret = input.clientSecret
      ? encryptSecret(input.clientSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformTwitterCredentialsCache();
}

export async function clearStoredTwitterCredentials(updatedBy: number): Promise<void> {
  if (isTwitterManagedByEnv()) {
    throw new Error("X credentials are managed via server environment variables");
  }
  await saveTwitterCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export async function saveMetaCredentials(input: SaveMetaCredentialsInput): Promise<void> {
  if (isMetaManagedByEnv()) {
    throw new Error("Meta credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.appId !== undefined) {
    patch.metaAppId = input.appId?.trim() || null;
  }
  if (input.appSecret !== undefined) {
    patch.encryptedMetaAppSecret = input.appSecret
      ? encryptSecret(input.appSecret.trim())
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });

  invalidatePlatformMetaCredentialsCache();
}

export async function clearStoredMetaCredentials(updatedBy: number): Promise<void> {
  if (isMetaManagedByEnv()) {
    throw new Error("Meta credentials are managed via server environment variables");
  }
  await saveMetaCredentials({ appId: null, appSecret: "", updatedBy });
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
