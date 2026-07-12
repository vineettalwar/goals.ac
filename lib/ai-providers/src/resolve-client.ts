import { getAiProviderClient, wrapGeminiClient, type AiProviderClient } from "./client";
import { createUserGeminiClient, isUserKeyError } from "./gemini";
import { resolveProviderId, type AiProviderOptions } from "./config";

export async function resolveAiClient(
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<AiProviderClient> {
  const providerId = resolveProviderId(aiProviderOptions);

  if (userApiKey && providerId === "gemini") {
    try {
      return wrapGeminiClient(await createUserGeminiClient(userApiKey));
    } catch (err) {
      if (!isUserKeyError(err)) {
        throw err;
      }
      // Fall back to platform provider below.
    }
  }

  return getAiProviderClient(aiProviderOptions);
}

export type { AiProviderClient, AiProviderOptions };
