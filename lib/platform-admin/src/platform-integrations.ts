import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { encryptSecret, decryptSecret } from "@workspace/security/encryption";
import {
  invalidateStripeClientCache,
  lastFour,
  resolvePlatformResendCredentials,
  resolvePlatformStripeCredentials,
} from "@workspace/billing";
import { eq } from "drizzle-orm";
import { toIsoStringOrNull } from "./dates";
import type { PlatformBedrockStatus } from "./platform-bedrock";

// ── Env helpers ───────────────────────────────────────────────────────────────

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function envConfigured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function activeEnvVars(names: readonly string[]): string[] {
  return names.filter((name) => Boolean(process.env[name]?.trim()));
}

function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
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

function isLinkedInManagedByEnv(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() || process.env.LINKEDIN_CLIENT_SECRET?.trim(),
  );
}

function isTwitterManagedByEnv(): boolean {
  return Boolean(
    process.env.TWITTER_CLIENT_ID?.trim() || process.env.TWITTER_CLIENT_SECRET?.trim(),
  );
}

function isMetaManagedByEnv(): boolean {
  return Boolean(process.env.META_APP_ID?.trim() || process.env.META_APP_SECRET?.trim());
}

function isBlueskyManagedByEnv(): boolean {
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
  | "bedrock";

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
      id: "bedrock",
      category: "ai",
      kind: "credentials",
      label: "AWS Bedrock",
      description: "Platform Bedrock credentials granted to selected organizations.",
      docsUrl: "https://docs.aws.amazon.com/bedrock/",
      envVars: [
        {
          name: "AWS_ACCESS_KEY_ID",
          configured: envConfigured("AWS_ACCESS_KEY_ID"),
          required: true,
        },
        {
          name: "AWS_SECRET_ACCESS_KEY",
          configured: envConfigured("AWS_SECRET_ACCESS_KEY"),
          required: true,
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

// ── Integration secrets / DB credentials ─────────────────────────────────────

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
const BLUESKY_ENV_VARS = ["BLUESKY_OAUTH_PRIVATE_KEY_JWK", "BLUESKY_CLIENT_NAME"] as const;

export function isStripeManagedByEnv(): boolean {
  return activeEnvVars(STRIPE_ENV_VARS).length > 0;
}

export function isResendManagedByEnv(): boolean {
  return activeEnvVars(RESEND_ENV_VARS).length > 0;
}

function isUnsplashManagedByEnv(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
}

function isPexelsManagedByEnv(): boolean {
  return Boolean(process.env.PEXELS_API_KEY?.trim());
}

export function stripeConnectOAuthAvailable(): boolean {
  return Boolean(process.env.STRIPE_CONNECT_CLIENT_ID?.trim());
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

// ── Credential save / clear mutations ────────────────────────────────────────

export type SaveStripeCredentialsInput = {
  secretKey?: string;
  webhookSecret?: string;
  priceGrowthMonthly?: string | null;
  priceScaleMonthly?: string | null;
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

export type SaveResendCredentialsInput = {
  apiKey?: string;
  fromEmail?: string | null;
  updatedBy: number;
};

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
}

export type SaveUnsplashCredentialsInput = {
  accessKey?: string;
  updatedBy: number;
};

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
}

export type SavePexelsCredentialsInput = {
  apiKey?: string;
  updatedBy: number;
};

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
}

/** Clears Stripe Connect tokens from the DB (caller must handle Stripe API deauthorization). */
export async function clearStripeConnectTokens(updatedBy: number): Promise<void> {
  const patch = {
    stripeConnectAccountId: null,
    stripeConnectLivemode: null,
    stripeConnectConnectedAt: null,
    encryptedStripeConnectAccessToken: null,
    updatedBy,
  };

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

  await clearStripeConnectTokens(updatedBy);
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
  await saveResendCredentials({ apiKey: "", fromEmail: null, updatedBy });
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

export type SaveLinkedInCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

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
}

export async function clearStoredLinkedInCredentials(updatedBy: number): Promise<void> {
  if (isLinkedInManagedByEnv()) {
    throw new Error("LinkedIn credentials are managed via server environment variables");
  }
  await saveLinkedInCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export type SaveTwitterCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

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
}

export async function clearStoredTwitterCredentials(updatedBy: number): Promise<void> {
  if (isTwitterManagedByEnv()) {
    throw new Error("X credentials are managed via server environment variables");
  }
  await saveTwitterCredentials({ clientId: null, clientSecret: "", updatedBy });
}

export type SaveMetaCredentialsInput = {
  appId?: string | null;
  appSecret?: string;
  updatedBy: number;
};

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
}

export async function clearStoredMetaCredentials(updatedBy: number): Promise<void> {
  if (isMetaManagedByEnv()) {
    throw new Error("Meta credentials are managed via server environment variables");
  }
  await saveMetaCredentials({ appId: null, appSecret: "", updatedBy });
}

export type SaveBlueskyCredentialsInput = {
  clientName?: string | null;
  privateKeyJwk?: string;
  updatedBy: number;
};

function parseBlueskyPrivateKeyJwk(raw: string): string {
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Bluesky private key must be valid JSON JWK");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("kty" in parsed) ||
    typeof (parsed as { kty: unknown }).kty !== "string"
  ) {
    throw new Error("Bluesky private key JWK must include a kty field");
  }
  return trimmed;
}

export async function saveBlueskyCredentials(input: SaveBlueskyCredentialsInput): Promise<void> {
  if (isBlueskyManagedByEnv()) {
    throw new Error("Bluesky credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientName !== undefined) {
    patch.blueskyClientName = input.clientName?.trim() || null;
  }
  if (input.privateKeyJwk !== undefined) {
    patch.encryptedBlueskyOauthPrivateKeyJwk = input.privateKeyJwk
      ? encryptSecret(parseBlueskyPrivateKeyJwk(input.privateKeyJwk))
      : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredBlueskyCredentials(updatedBy: number): Promise<void> {
  if (isBlueskyManagedByEnv()) {
    throw new Error("Bluesky credentials are managed via server environment variables");
  }
  await saveBlueskyCredentials({ clientName: null, privateKeyJwk: "", updatedBy });
}

export async function isStripeIntegrationReady(): Promise<boolean> {
  const creds = await resolvePlatformStripeCredentials();
  return Boolean(
    creds?.secretKey && creds.webhookSecret && creds.priceGrowthMonthly && creds.priceScaleMonthly,
  );
}

export async function isResendIntegrationReady(): Promise<boolean> {
  return Boolean((await resolvePlatformResendCredentials())?.apiKey);
}
