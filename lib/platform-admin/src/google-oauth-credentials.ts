import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import { envTrim, isGoogleManagedByEnv } from "./platform-integration-defs";

type CredentialSource = "db" | "env";

export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  source: CredentialSource;
};

export type GoogleTokenEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

function envFrom(env?: GoogleTokenEnv): { clientId: string | null; clientSecret: string | null } {
  return {
    clientId: env?.GOOGLE_CLIENT_ID?.trim() || envTrim("GOOGLE_CLIENT_ID"),
    clientSecret: env?.GOOGLE_CLIENT_SECRET?.trim() || envTrim("GOOGLE_CLIENT_SECRET"),
  };
}

function safeDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch {
    return null;
  }
}

export async function resolveGoogleOAuthCredentials(
  env?: GoogleTokenEnv,
): Promise<GoogleOAuthCredentials | null> {
  const fromEnv = envFrom(env);
  if (fromEnv.clientId && fromEnv.clientSecret) {
    return { clientId: fromEnv.clientId, clientSecret: fromEnv.clientSecret, source: "env" };
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

export async function googleEnvBindings<T extends object>(
  env?: T,
): Promise<T & GoogleTokenEnv> {
  const resolved = await resolveGoogleOAuthCredentials(env as GoogleTokenEnv | undefined);
  if (!resolved) return { ...(env ?? ({} as T)) };
  return {
    ...(env as T),
    GOOGLE_CLIENT_ID: resolved.clientId,
    GOOGLE_CLIENT_SECRET: resolved.clientSecret,
  };
}

export async function hasGoogleOAuthCredentials(env?: GoogleTokenEnv): Promise<boolean> {
  return Boolean(await resolveGoogleOAuthCredentials(env));
}

export type SaveGoogleOAuthCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

export async function saveGoogleOAuthCredentials(
  input: SaveGoogleOAuthCredentialsInput,
): Promise<void> {
  if (isGoogleManagedByEnv()) {
    throw new Error("Google credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.googleClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedGoogleClientSecret = input.clientSecret
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

export async function clearStoredGoogleOAuthCredentials(updatedBy: number): Promise<void> {
  if (isGoogleManagedByEnv()) {
    throw new Error("Google credentials are managed via server environment variables");
  }
  await saveGoogleOAuthCredentials({ clientId: null, clientSecret: "", updatedBy });
}
