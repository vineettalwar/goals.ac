import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

export type BingWebmasterOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  source: "db" | "env";
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

export function isBingManagedByEnv(): boolean {
  return Boolean(envTrim("BING_WEBMASTER_CLIENT_ID") || envTrim("BING_WEBMASTER_CLIENT_SECRET"));
}

export async function resolveBingWebmasterOAuthCredentials(): Promise<BingWebmasterOAuthCredentials | null> {
  const envId = envTrim("BING_WEBMASTER_CLIENT_ID");
  const envSecret = envTrim("BING_WEBMASTER_CLIENT_SECRET");
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, source: "env" };
  }

  const [row] = await db
    .select({
      bingWebmasterClientId: platformSettingsTable.bingWebmasterClientId,
      encryptedBingWebmasterClientSecret: platformSettingsTable.encryptedBingWebmasterClientSecret,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const clientId = row?.bingWebmasterClientId?.trim() || null;
  const clientSecret = safeDecrypt(row?.encryptedBingWebmasterClientSecret);
  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: "db" };
  }
  return null;
}

export async function hasPlatformBingWebmasterCredentials(): Promise<boolean> {
  return Boolean(await resolveBingWebmasterOAuthCredentials());
}
