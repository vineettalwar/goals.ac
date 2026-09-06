import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { decryptSecret } from "@workspace/security/encryption";
import { lastFour } from "@workspace/billing";
import { eq } from "drizzle-orm";
import { toIsoStringOrNull } from "./dates";
import type { PlatformBedrockStatus } from "./platform-bedrock";
import {
  envTrim,
  activeEnvVars,
  isStripeManagedByEnv,
  isResendManagedByEnv,
  isLinkedInManagedByEnv,
  isTwitterManagedByEnv,
  isMetaManagedByEnv,
  isBlueskyManagedByEnv,
  isUnsplashManagedByEnv,
  isPexelsManagedByEnv,
  stripeConnectOAuthAvailable,
  STRIPE_ENV_VARS,
  RESEND_ENV_VARS,
  UNSPLASH_ENV_VARS,
  PEXELS_ENV_VARS,
  LINKEDIN_ENV_VARS,
  TWITTER_ENV_VARS,
  META_ENV_VARS,
  BLUESKY_ENV_VARS,
  hasGoogleCredentials,
  hasBingCredentials,
  hasUnsplashCredentials,
  hasPexelsCredentials,
  hasResendCredentials,
  hasStripeCredentials,
  type IntegrationEnvStatus,
} from "./platform-integration-defs";

function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
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
  bluesky: {
    managedByEnv: boolean;
    envVars: string[];
    clientName: { configured: boolean; value: string | null; source: "db" | "env" | null };
    privateKeyJwk: IntegrationFieldStatus;
  };
  bedrock: PlatformBedrockStatus;
};

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
  const { getPlatformBedrockStatus } = await import("./platform-bedrock");
  const [row, bedrock] = await Promise.all([
    db
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
        blueskyClientName: platformSettingsTable.blueskyClientName,
        encryptedBlueskyOauthPrivateKeyJwk:
          platformSettingsTable.encryptedBlueskyOauthPrivateKeyJwk,
      })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1))
      .limit(1)
      .then((rows) => rows[0]),
    getPlatformBedrockStatus(),
  ]);

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
        connectedAt: toIsoStringOrNull(row?.stripeConnectConnectedAt),
        lastFour: lastFour(connectToken),
      },
      secretKey: fieldStatus(row?.encryptedStripeSecretKey, "STRIPE_SECRET_KEY"),
      webhookSecret: fieldStatus(row?.encryptedStripeWebhookSecret, "STRIPE_WEBHOOK_SECRET"),
      priceGrowthMonthly: plainFieldStatus(
        row?.stripePriceGrowthMonthly,
        "STRIPE_PRICE_GROWTH_MONTHLY",
      ),
      priceScaleMonthly: plainFieldStatus(
        row?.stripePriceScaleMonthly,
        "STRIPE_PRICE_SCALE_MONTHLY",
      ),
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
    bluesky: {
      managedByEnv: isBlueskyManagedByEnv(),
      envVars: activeEnvVars(BLUESKY_ENV_VARS),
      clientName: plainFieldStatus(row?.blueskyClientName, "BLUESKY_CLIENT_NAME"),
      privateKeyJwk: fieldStatus(
        row?.encryptedBlueskyOauthPrivateKeyJwk,
        "BLUESKY_OAUTH_PRIVATE_KEY_JWK",
      ),
    },
    bedrock,
  };
}

/** Env or admin DB — same presence rules as getPlatformIntegrationStatus. */
export async function hasLinkedInCredentials(): Promise<boolean> {
  const status = await getPlatformIntegrationStatus();
  return status.linkedin.clientId.configured && status.linkedin.clientSecret.configured;
}

export async function hasTwitterCredentials(): Promise<boolean> {
  const status = await getPlatformIntegrationStatus();
  return status.twitter.clientId.configured && status.twitter.clientSecret.configured;
}

export async function hasMetaCredentials(): Promise<boolean> {
  const status = await getPlatformIntegrationStatus();
  return status.meta.appId.configured && status.meta.appSecret.configured;
}

export async function hasBlueskyCredentials(): Promise<boolean> {
  const status = await getPlatformIntegrationStatus();
  return status.bluesky.privateKeyJwk.configured;
}

export async function hasSocialCredentials(): Promise<boolean> {
  const status = await getPlatformIntegrationStatus();
  return (
    (status.linkedin.clientId.configured && status.linkedin.clientSecret.configured) ||
    (status.twitter.clientId.configured && status.twitter.clientSecret.configured) ||
    (status.meta.appId.configured && status.meta.appSecret.configured) ||
    status.bluesky.privateKeyJwk.configured
  );
}

export async function getIntegrationEnvStatus(): Promise<IntegrationEnvStatus> {
  const status = await getPlatformIntegrationStatus();
  const linkedin =
    status.linkedin.clientId.configured && status.linkedin.clientSecret.configured;
  const twitter =
    status.twitter.clientId.configured && status.twitter.clientSecret.configured;
  const meta = status.meta.appId.configured && status.meta.appSecret.configured;
  const bluesky = status.bluesky.privateKeyJwk.configured;
  return {
    google: hasGoogleCredentials(),
    bing: hasBingCredentials(),
    social: linkedin || twitter || meta || bluesky,
    linkedin,
    twitter,
    meta,
    bluesky,
    email: hasResendCredentials(),
    stripe: hasStripeCredentials(),
    unsplash: hasUnsplashCredentials(),
    pexels: hasPexelsCredentials(),
  };
}
