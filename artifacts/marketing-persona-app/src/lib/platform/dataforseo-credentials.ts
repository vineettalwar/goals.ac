import "server-only";

import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { decryptStoredSecret, encryptSecret } from "@workspace/security/encryption";
import { eq } from "drizzle-orm";

export type DataForSeoCredentials = {
  login: string;
  password: string;
  source: "db" | "env";
};

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function isDataForSeoManagedByEnv(): boolean {
  return Boolean(envTrim("DATAFORSEO_LOGIN") || envTrim("DATAFORSEO_PASSWORD"));
}

export async function resolveDataForSeoCredentials(): Promise<DataForSeoCredentials | null> {
  const envLogin = envTrim("DATAFORSEO_LOGIN");
  const envPassword = envTrim("DATAFORSEO_PASSWORD");
  if (envLogin && envPassword) {
    return { login: envLogin, password: envPassword, source: "env" };
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

export async function hasPlatformDataForSeoCredentials(): Promise<boolean> {
  return Boolean(await resolveDataForSeoCredentials());
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
