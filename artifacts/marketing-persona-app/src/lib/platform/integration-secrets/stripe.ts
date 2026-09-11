import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { encryptSecret } from "@workspace/security/encryption";
import {
  invalidateStripeClientCache,
  resolvePlatformStripeCredentials,
} from "@workspace/billing";
import {
  clearStripeConnectTokens,
  deauthorizeStripeConnectAccount,
} from "@/lib/platform/stripe-connect-oauth";
import { eq } from "drizzle-orm";
import { isStripeManagedByEnv } from "./shared";
import type { SaveStripeCredentialsInput } from "./types";

export type { SaveStripeCredentialsInput } from "./types";

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

export async function isStripeIntegrationReady(): Promise<boolean> {
  const creds = await resolvePlatformStripeCredentials();
  return Boolean(
    creds?.secretKey &&
      creds.webhookSecret &&
      creds.priceGrowthMonthly &&
      creds.priceScaleMonthly,
  );
}
