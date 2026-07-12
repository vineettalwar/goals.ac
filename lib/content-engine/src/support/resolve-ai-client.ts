import {
  createUserGeminiClient,
  getAiProviderClient,
  isUserKeyError,
  resolveProviderId,
  wrapGeminiClient,
  type AiProviderClient,
  type AiProviderOptions,
} from "@workspace/ai-providers";
import { logger } from "../logger";

export async function resolveAiClient(
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<AiProviderClient> {
  const providerId = resolveProviderId(aiProviderOptions);

  if (userApiKey && providerId === "gemini") {
    try {
      return wrapGeminiClient(await createUserGeminiClient(userApiKey));
    } catch (err) {
      if (isUserKeyError(err)) {
        logger.warn({ err }, "User Gemini key failed, falling back to platform provider");
      } else {
        throw err;
      }
    }
  }

  return getAiProviderClient(aiProviderOptions);
}
