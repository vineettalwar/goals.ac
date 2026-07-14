import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import type { StockProviderId } from "./providers";

type CredentialSource = "db" | "env";

type StoredPlatformStockCredentials = {
  encryptedUnsplashAccessKey: string | null;
  encryptedPexelsApiKey: string | null;
};

let cache: { row: StoredPlatformStockCredentials | null; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

const ENV_BY_PROVIDER: Record<"unsplash" | "pexels", string> = {
  unsplash: "UNSPLASH_ACCESS_KEY",
  pexels: "PEXELS_API_KEY",
};

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

export function invalidatePlatformStockCredentialsCache(): void {
  cache = null;
}

async function loadStoredCredentials(): Promise<StoredPlatformStockCredentials | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.row;
  }

  const [row] = await db
    .select({
      encryptedUnsplashAccessKey: platformSettingsTable.encryptedUnsplashAccessKey,
      encryptedPexelsApiKey: platformSettingsTable.encryptedPexelsApiKey,
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

export async function resolvePlatformStockApiKey(
  provider: Extract<StockProviderId, "unsplash" | "pexels">,
): Promise<{ value: string | null; source: CredentialSource | null }> {
  const row = await loadStoredCredentials();
  const envName = ENV_BY_PROVIDER[provider];
  const dbValue =
    provider === "unsplash"
      ? row?.encryptedUnsplashAccessKey
      : row?.encryptedPexelsApiKey;
  return pickSecret(dbValue, envName);
}

export async function getDecryptedPlatformStockCredentials(): Promise<
  Partial<Record<"unsplash" | "pexels", string>>
> {
  const row = await loadStoredCredentials();
  const out: Partial<Record<"unsplash" | "pexels", string>> = {};

  for (const provider of ["unsplash", "pexels"] as const) {
    const envName = ENV_BY_PROVIDER[provider];
    const dbValue =
      provider === "unsplash"
        ? row?.encryptedUnsplashAccessKey
        : row?.encryptedPexelsApiKey;
    const resolved = pickSecret(dbValue, envName);
    if (resolved.value) out[provider] = resolved.value;
  }

  return out;
}

export function isUnsplashManagedByEnv(): boolean {
  return Boolean(envTrim(ENV_BY_PROVIDER.unsplash));
}

export function isPexelsManagedByEnv(): boolean {
  return Boolean(envTrim(ENV_BY_PROVIDER.pexels));
}

export function lastFour(value: string | null | undefined): string | null {
  if (!value || value.length < 4) return null;
  return value.slice(-4);
}
