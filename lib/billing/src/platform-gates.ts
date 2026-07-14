import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

let cache: { stripeBillingEnabled: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

import {
  hasPlatformStripeSecretKey,
  invalidatePlatformCredentialsCache,
} from "./platform-credentials";

export function invalidatePlatformGatesCache(): void {
  cache = null;
  invalidatePlatformCredentialsCache();
}

async function loadStripeBillingFlag(): Promise<boolean> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.stripeBillingEnabled;
  }

  const [row] = await db
    .select({ stripeBillingEnabled: platformSettingsTable.stripeBillingEnabled })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const stripeBillingEnabled = row?.stripeBillingEnabled ?? false;
  cache = { stripeBillingEnabled, expiresAt: Date.now() + CACHE_TTL_MS };
  return stripeBillingEnabled;
}

/** @deprecated Use hasPlatformStripeSecretKey() — sync env-only check remains for legacy callers. */
export function hasStripeCredentials(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Admin toggle + stored/env credentials — used for live billing operations. */
export async function isStripeBillingActive(): Promise<boolean> {
  if (!(await hasPlatformStripeSecretKey())) return false;
  return loadStripeBillingFlag();
}
