import { db } from "./db";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { decryptStoredSecret, encryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";
import { envTrim } from "./platform-integration-defs";

type CredentialSource = "db" | "env";

export type DataForSeoCredentials = {
  login: string;
  password: string;
  source: CredentialSource;
};

export type DataForSeoTokenEnv = {
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
};

function envFrom(env?: DataForSeoTokenEnv): { login: string | null; password: string | null } {
  return {
    login: env?.DATAFORSEO_LOGIN?.trim() || envTrim("DATAFORSEO_LOGIN"),
    password: env?.DATAFORSEO_PASSWORD?.trim() || envTrim("DATAFORSEO_PASSWORD"),
  };
}

export function isDataForSeoManagedByEnv(env?: DataForSeoTokenEnv): boolean {
  const fromEnv = envFrom(env);
  return Boolean(fromEnv.login || fromEnv.password);
}

export async function resolveDataForSeoCredentials(
  env?: DataForSeoTokenEnv,
): Promise<DataForSeoCredentials | null> {
  const fromEnv = envFrom(env);
  if (fromEnv.login && fromEnv.password) {
    return { login: fromEnv.login, password: fromEnv.password, source: "env" };
  }

  const [row] = await db
    .select({
      encryptedDataforseoLogin: platformSettingsTable.encryptedDataforseoLogin,
      encryptedDataforseoPassword: platformSettingsTable.encryptedDataforseoPassword,
    })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const login = decryptStoredSecret(row?.encryptedDataforseoLogin);
  const password = decryptStoredSecret(row?.encryptedDataforseoPassword);
  if (login && password) {
    return { login, password, source: "db" };
  }

  return null;
}

/** Worker bindings only. DB secrets stay in the in-memory overlay, not on this object. */
export async function dataForSeoEnvBindings(env?: DataForSeoTokenEnv): Promise<DataForSeoTokenEnv> {
  return env ?? {};
}

export async function hasDataForSeoCredentials(env?: DataForSeoTokenEnv): Promise<boolean> {
  return Boolean(await resolveDataForSeoCredentials(env));
}

export type SaveDataForSeoCredentialsInput = {
  login?: string | null;
  password?: string;
  updatedBy: number;
};

export async function saveDataForSeoCredentials(input: SaveDataForSeoCredentialsInput): Promise<void> {
  if (isDataForSeoManagedByEnv()) {
    throw new Error("DataForSEO credentials are managed via server environment variables");
  }
  const patch: Partial<typeof platformSettingsTable.$inferInsert> = {
    updatedBy: input.updatedBy,
  };

  if (input.login !== undefined) {
    const trimmed = input.login?.trim() || null;
    patch.encryptedDataforseoLogin = trimmed ? encryptSecret(trimmed) : null;
  }
  if (input.password !== undefined) {
    const trimmed = input.password.trim();
    patch.encryptedDataforseoPassword = trimmed ? encryptSecret(trimmed) : null;
  }

  await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: patch,
    });
}

export async function clearStoredDataForSeoCredentials(updatedBy: number): Promise<void> {
  if (isDataForSeoManagedByEnv()) {
    throw new Error("DataForSEO credentials are managed via server environment variables");
  }
  await saveDataForSeoCredentials({ login: null, password: "", updatedBy });
}
