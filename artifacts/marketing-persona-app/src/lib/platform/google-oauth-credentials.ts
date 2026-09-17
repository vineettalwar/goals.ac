import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

export type GoogleOAuthCredentials = {
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

export function isGoogleManagedByEnv(): boolean {
  return Boolean(envTrim("GOOGLE_CLIENT_ID") || envTrim("GOOGLE_CLIENT_SECRET"));
}

export async function resolveGoogleOAuthCredentials(): Promise<GoogleOAuthCredentials | null> {
  const envId = envTrim("GOOGLE_CLIENT_ID");
  const envSecret = envTrim("GOOGLE_CLIENT_SECRET");
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, source: "env" };
  }

  const [row] = await db
    .select({
      googleClientId: platformSettingsTable.googleClientId,
      encryptedGoogleClientSecret: platformSettingsTable.encryptedGoogleClientSecret,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const clientId = row?.googleClientId?.trim() || null;
  const clientSecret = safeDecrypt(row?.encryptedGoogleClientSecret);
  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: "db" };
  }
  return null;
}

export async function hasGoogleOAuthCredentials(): Promise<boolean> {
  return Boolean(await resolveGoogleOAuthCredentials());
}

export const hasPlatformGoogleCredentials = hasGoogleOAuthCredentials;
