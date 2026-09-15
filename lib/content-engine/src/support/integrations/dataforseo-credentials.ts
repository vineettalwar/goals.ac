import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { decryptStoredSecret } from "@workspace/security/encryption";
import { setDataForSeoCredentialsOverlay } from "@workspace/serp-provider";

function envTrim(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/** Decrypt platform DataForSEO creds into an in-memory overlay. Does not write process.env. */
export async function applyDataForSeoPlatformEnv(): Promise<void> {
  if (envTrim("DATAFORSEO_LOGIN") && envTrim("DATAFORSEO_PASSWORD")) return;

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
  if (!login || !password) {
    setDataForSeoCredentialsOverlay(null);
    return;
  }

  setDataForSeoCredentialsOverlay({ login, password });
}
