import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

type CredentialSource = "db" | "env";

export type TwitterOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  source: CredentialSource;
};

type StoredTwitterCredentials = {
  twitterClientId: string | null;
  encryptedTwitterClientSecret: string | null;
};

let cache: { row: StoredTwitterCredentials | null; expiresAt: number } | null = null;
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

export function invalidatePlatformTwitterCredentialsCache(): void {
  cache = null;
}

export function isTwitterManagedByEnv(): boolean {
  return Boolean(envTrim("TWITTER_CLIENT_ID") || envTrim("TWITTER_CLIENT_SECRET"));
}

async function loadStoredCredentials(): Promise<StoredTwitterCredentials | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.row;
  }

  const [row] = await db
    .select({
      twitterClientId: platformSettingsTable.twitterClientId,
      encryptedTwitterClientSecret: platformSettingsTable.encryptedTwitterClientSecret,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  cache = { row: row ?? null, expiresAt: Date.now() + CACHE_TTL_MS };
  return cache.row;
}

/**
 * Resolve X (Twitter) OAuth app credentials. Env wins over encrypted DB values.
 */
export async function resolveTwitterOAuthCredentials(): Promise<TwitterOAuthCredentials | null> {
  const envId = envTrim("TWITTER_CLIENT_ID");
  const envSecret = envTrim("TWITTER_CLIENT_SECRET");
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, source: "env" };
  }

  const row = await loadStoredCredentials();
  const clientId = row?.twitterClientId?.trim() || null;
  const clientSecret = safeDecrypt(row?.encryptedTwitterClientSecret);
  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: "db" };
  }

  return null;
}

export async function hasPlatformTwitterCredentials(): Promise<boolean> {
  return Boolean(await resolveTwitterOAuthCredentials());
}
