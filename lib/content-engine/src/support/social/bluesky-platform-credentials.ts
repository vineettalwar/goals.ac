import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

type CredentialSource = "db" | "env";

export type BlueskyOAuthCredentials = {
  privateKeyJwk: string;
  clientName: string;
  source: CredentialSource;
};

type StoredBlueskyCredentials = {
  blueskyClientName: string | null;
  encryptedBlueskyOauthPrivateKeyJwk: string | null;
};

let cache: { row: StoredBlueskyCredentials | null; expiresAt: number } | null = null;
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

export function invalidatePlatformBlueskyCredentialsCache(): void {
  cache = null;
}

/** Env owns the private JWK when set; client name alone does not lock admin saves. */
export function isBlueskyManagedByEnv(): boolean {
  return Boolean(envTrim("BLUESKY_OAUTH_PRIVATE_KEY_JWK"));
}

async function loadStoredCredentials(): Promise<StoredBlueskyCredentials | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.row;
  }

  const [row] = await db
    .select({
      blueskyClientName: platformSettingsTable.blueskyClientName,
      encryptedBlueskyOauthPrivateKeyJwk:
        platformSettingsTable.encryptedBlueskyOauthPrivateKeyJwk,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  cache = { row: row ?? null, expiresAt: Date.now() + CACHE_TTL_MS };
  return cache.row;
}

/**
 * Resolve Bluesky AT Protocol OAuth signing credentials. Env wins over encrypted DB values.
 * Client id is the hosted metadata URL (not stored).
 */
export async function resolveBlueskyOAuthCredentials(): Promise<BlueskyOAuthCredentials | null> {
  const envJwk = envTrim("BLUESKY_OAUTH_PRIVATE_KEY_JWK");
  const envName = envTrim("BLUESKY_CLIENT_NAME");
  if (envJwk) {
    return {
      privateKeyJwk: envJwk,
      clientName: envName || "goals.ac",
      source: "env",
    };
  }

  const row = await loadStoredCredentials();
  const privateKeyJwk = safeDecrypt(row?.encryptedBlueskyOauthPrivateKeyJwk);
  if (privateKeyJwk) {
    return {
      privateKeyJwk,
      clientName: row?.blueskyClientName?.trim() || envName || "goals.ac",
      source: "db",
    };
  }

  return null;
}

export async function hasPlatformBlueskyCredentials(): Promise<boolean> {
  return Boolean(await resolveBlueskyOAuthCredentials());
}
