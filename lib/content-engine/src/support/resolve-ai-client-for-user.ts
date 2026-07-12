import {
  createUserGeminiClient,
  resolveProviderId,
  wrapGeminiClient,
  type AiProviderClient,
  type AiProviderId,
} from "@workspace/ai-providers";
import { resolveAiClient } from "./resolve-ai-client";
import { getDecryptedUserGeminiKey } from "./user-api-key";
import { getUserAiProviderOptions } from "./user-ai-provider";

export type AiClientSource = "user-key" | "platform";

export interface ResolvedAiClientForUser {
  client: AiProviderClient;
  providerId: AiProviderId;
  usingUserKey: boolean;
  /** Legacy-compatible source label for UI responses */
  source: AiClientSource;
}

export async function resolveAiClientForUser(userId: number): Promise<ResolvedAiClientForUser> {
  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);

  const providerId = resolveProviderId(aiProviderOptions);
  const usingUserKey = Boolean(userApiKey && providerId === "gemini");

  if (usingUserKey && userApiKey) {
    try {
      const client = wrapGeminiClient(await createUserGeminiClient(userApiKey));
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return { client, providerId, usingUserKey: false, source: "platform" };
}
