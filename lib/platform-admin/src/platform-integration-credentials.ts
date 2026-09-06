import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { encryptSecret } from "@workspace/security/encryption";
import {
  invalidateStripeClientCache,
  resolvePlatformResendCredentials,
  resolvePlatformStripeCredentials,
} from "@workspace/billing";
import { eq } from "drizzle-orm";
import {
  isStripeManagedByEnv,
  isResendManagedByEnv,
  isLinkedInManagedByEnv,
  isTwitterManagedByEnv,
  isMetaManagedByEnv,
  isBlueskyManagedByEnv,
  isUnsplashManagedByEnv,
  isPexelsManagedByEnv,
} from "./platform-integration-defs";

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
