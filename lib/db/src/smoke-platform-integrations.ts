import "./load-workspace-env.ts";
import { db } from "./index.ts";
import { platformSettingsTable } from "./schema/platform_settings.ts";
import { encryptSecret, decryptSecret } from "../../security/src/encryption.ts";
import { eq } from "drizzle-orm";

const TEST_KEY = "re_test_smoke_key_12345678";

async function main() {
  if (!process.env.GEMINI_KEY_ENCRYPTION_SECRET) {
    throw new Error("GEMINI_KEY_ENCRYPTION_SECRET is not set in .env");
  }

  const encrypted = encryptSecret(TEST_KEY);
  await db
    .insert(platformSettingsTable)
    .values({ id: 1, encryptedResendApiKey: encrypted, resendFromEmail: "noreply@goals.ac" })
    .onConflictDoUpdate({
      target: platformSettingsTable.id,
      set: { encryptedResendApiKey: encrypted, resendFromEmail: "noreply@goals.ac" },
    });

  const [row] = await db
    .select({ encryptedResendApiKey: platformSettingsTable.encryptedResendApiKey })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.id, 1))
    .limit(1);

  const decrypted = decryptSecret(row?.encryptedResendApiKey ?? "");
  if (decrypted !== TEST_KEY) throw new Error("Round-trip decrypt failed");

  await db
    .update(platformSettingsTable)
    .set({ encryptedResendApiKey: null, resendFromEmail: null })
    .where(eq(platformSettingsTable.id, 1));

  console.log("OK: migration applied, encryption works, test credential cleared");
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
