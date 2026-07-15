import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

type CredentialSource = "db" | "env";

export type LinkedInOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  source: CredentialSource;
};

type StoredLinkedInCredentials = {
  linkedinClientId: string | null;
  encryptedLinkedinClientSecret: string | null;
};

let cache: { row: StoredLinkedInCredentials | null; expiresAt: number } | null = null;
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

export function invalidatePlatformLinkedInCredentialsCache(): void {
  cache = null;
}

export function isLinkedInManagedByEnv(): boolean {
  return Boolean(envTrim("LINKEDIN_CLIENT_ID") || envTrim("LINKEDIN_CLIENT_SECRET"));
}

async function loadStoredCredentials(): Promise<StoredLinkedInCredentials | null> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.row;
  }

  const [row] = await db
    .select({
      linkedinClientId: platformSettingsTable.linkedinClientId,
      encryptedLinkedinClientSecret: platformSettingsTable.encryptedLinkedinClientSecret,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  cache = { row: row ?? null, expiresAt: Date.now() + CACHE_TTL_MS };
  return cache.row;
}

/**
 * Resolve LinkedIn OAuth app credentials. Env wins over encrypted DB values.
 */
export async function resolveLinkedInOAuthCredentials(): Promise<LinkedInOAuthCredentials | null> {
  const envId = envTrim("LINKEDIN_CLIENT_ID");
  const envSecret = envTrim("LINKEDIN_CLIENT_SECRET");
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, source: "env" };
  }

  const row = await loadStoredCredentials();
  const clientId = row?.linkedinClientId?.trim() || null;
  const clientSecret = safeDecrypt(row?.encryptedLinkedinClientSecret);
  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: "db" };
  }

  return null;
}

export async function hasPlatformLinkedInCredentials(): Promise<boolean> {
  return Boolean(await resolveLinkedInOAuthCredentials());
}
