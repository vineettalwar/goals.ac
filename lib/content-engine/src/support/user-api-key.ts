import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@workspace/security/encryption";
import { logger } from "../logger";

export async function getDecryptedUserGeminiKey(userId: number): Promise<string | null> {
  try {
    const [user] = await db
      .select({ encryptedGeminiKey: usersTable.encryptedGeminiKey })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user?.encryptedGeminiKey) return null;
    return decryptSecret(user.encryptedGeminiKey);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to decrypt user Gemini key");
    return null;
  }
}
