import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import { envTrim, isBingManagedByEnv } from "./platform-integration-defs";

type CredentialSource = "db" | "env";

export type BingWebmasterOAuthCredentials = {
  clientId: string;
  clientSecret: string;
  source: CredentialSource;
};

export type BingWebmasterTokenEnv = {
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
};

function envFrom(env?: BingWebmasterTokenEnv): { clientId: string | null; clientSecret: string | null } {
  return {
    clientId: env?.BING_WEBMASTER_CLIENT_ID?.trim() || envTrim("BING_WEBMASTER_CLIENT_ID"),
    clientSecret: env?.BING_WEBMASTER_CLIENT_SECRET?.trim() || envTrim("BING_WEBMASTER_CLIENT_SECRET"),
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

export async function resolveBingWebmasterOAuthCredentials(
  env?: BingWebmasterTokenEnv,
): Promise<BingWebmasterOAuthCredentials | null> {
  const fromEnv = envFrom(env);
  if (fromEnv.clientId && fromEnv.clientSecret) {
    return { clientId: fromEnv.clientId, clientSecret: fromEnv.clientSecret, source: "env" };
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

export async function bingEnvBindings<T extends BingWebmasterTokenEnv = BingWebmasterTokenEnv>(
  env?: T,
): Promise<T> {
  const resolved = await resolveBingWebmasterOAuthCredentials(env);
  if (!resolved) return (env ?? {}) as T;
  return {
    ...env,
    BING_WEBMASTER_CLIENT_ID: resolved.clientId,
    BING_WEBMASTER_CLIENT_SECRET: resolved.clientSecret,
  } as T;
}

export async function hasBingWebmasterOAuthCredentials(env?: BingWebmasterTokenEnv): Promise<boolean> {
  return Boolean(await resolveBingWebmasterOAuthCredentials(env));
}

export type SaveBingWebmasterCredentialsInput = {
  clientId?: string | null;
  clientSecret?: string;
  updatedBy: number;
};

export async function saveBingWebmasterCredentials(
  input: SaveBingWebmasterCredentialsInput,
): Promise<void> {
  if (isBingManagedByEnv()) {
    throw new Error("Bing Webmaster credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.clientId !== undefined) {
    patch.bingWebmasterClientId = input.clientId?.trim() || null;
  }
  if (input.clientSecret !== undefined) {
    patch.encryptedBingWebmasterClientSecret = input.clientSecret
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

export async function clearStoredBingWebmasterCredentials(updatedBy: number): Promise<void> {
  if (isBingManagedByEnv()) {
    throw new Error("Bing Webmaster credentials are managed via server environment variables");
  }
  await saveBingWebmasterCredentials({ clientId: null, clientSecret: "", updatedBy });
}
