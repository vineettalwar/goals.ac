import { getAiProviderClient, wrapGeminiClient, type AiProviderClient } from "./client";
import { createUserGeminiClient, isUserKeyError } from "./gemini";
import { isAnthropicUserKeyError } from "./anthropic";
import { isOpenAIUserKeyError } from "./openai";
import {
  assertOllamaReachableHere,
  resolveOllamaBaseUrl,
  resolveProviderId,
  type AiProviderOptions,
} from "./config";

export { isLoopbackOllamaUrl, assertOllamaReachableHere } from "./config";

export async function resolveAiClient(
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<AiProviderClient> {
  const providerId = resolveProviderId(aiProviderOptions);

  if (providerId === "ollama") {
    assertOllamaReachableHere(resolveOllamaBaseUrl(aiProviderOptions));
  }

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

  const anthropicKey = aiProviderOptions?.anthropic?.apiKey?.trim();
  if (anthropicKey && providerId === "anthropic") {
    try {
      const { AnthropicClient } = await import("./anthropic");
      return AnthropicClient.create({ apiKey: anthropicKey });
    } catch (err) {
      if (!isAnthropicUserKeyError(err)) {
        throw err;
      }
    }
  }

  const openaiKey = aiProviderOptions?.openai?.apiKey?.trim();
  if (openaiKey && providerId === "openai") {
    try {
      const { OpenAIClient } = await import("./openai");
      return OpenAIClient.create({ apiKey: openaiKey });
    } catch (err) {
      if (!isOpenAIUserKeyError(err)) {
        throw err;
      }
    }
  }

  if (providerId === "gemini") {
    return getAiProviderClient({ ...aiProviderOptions, providerId: "gemini" });
  }

  return getAiProviderClient(aiProviderOptions);
}

export type { AiProviderClient, AiProviderOptions };
