import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

type CredentialSource = "db" | "env";

export type MetaOAuthCredentials = {
  appId: string;
  appSecret: string;
  source: CredentialSource;
};

type StoredMetaCredentials = {
  metaAppId: string | null;
  encryptedMetaAppSecret: string | null;
};

let cache: { row: StoredMetaCredentials | null; expiresAt: number } | null = null;
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

export function invalidatePlatformMetaCredentialsCache(): void {
  cache = null;
}

export function isMetaManagedByEnv(): boolean {
  return Boolean(envTrim("META_APP_ID") || envTrim("META_APP_SECRET"));
}

async function loadStoredCredentials(): Promise<StoredMetaCredentials | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.row;
  }

  const [row] = await db
    .select({
      metaAppId: platformSettingsTable.metaAppId,
      encryptedMetaAppSecret: platformSettingsTable.encryptedMetaAppSecret,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  cache = { row: row ?? null, expiresAt: Date.now() + CACHE_TTL_MS };
  return cache.row;
}

/**
 * Resolve Meta (Facebook / Instagram) OAuth app credentials. Env wins over encrypted DB values.
 */
export async function resolveMetaOAuthCredentials(): Promise<MetaOAuthCredentials | null> {
  const envId = envTrim("META_APP_ID");
  const envSecret = envTrim("META_APP_SECRET");
  if (envId && envSecret) {
    return { appId: envId, appSecret: envSecret, source: "env" };
  }

  const row = await loadStoredCredentials();
  const appId = row?.metaAppId?.trim() || null;
  const appSecret = safeDecrypt(row?.encryptedMetaAppSecret);
  if (appId && appSecret) {
    return { appId, appSecret, source: "db" };
  }

  return null;
}

export async function hasPlatformMetaCredentials(): Promise<boolean> {
  return Boolean(await resolveMetaOAuthCredentials());
}
