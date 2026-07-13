import type { AiProviderOptions } from "@workspace/ai-providers";
import { getAiProviderOptionsForUser } from "./org-ai-settings";

/** @deprecated Use getAiProviderOptionsForUser — settings are org-scoped with legacy user fallback */
export async function getUserAiProviderOptions(userId: number): Promise<AiProviderOptions> {
  return getAiProviderOptionsForUser(userId);
}
