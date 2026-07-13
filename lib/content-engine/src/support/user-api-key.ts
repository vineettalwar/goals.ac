import { getDecryptedGeminiKeyForUser } from "./org-ai-settings";

/** @deprecated Use getDecryptedGeminiKeyForUser — keys are org-scoped with legacy user fallback */
export async function getDecryptedUserGeminiKey(userId: number): Promise<string | null> {
  return getDecryptedGeminiKeyForUser(userId);
}
