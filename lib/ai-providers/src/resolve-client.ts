import { getAiProviderClient, wrapGeminiClient, type AiProviderClient } from "./client";
import { createUserGeminiClient, isUserKeyError } from "./gemini";
import { isAnthropicUserKeyError } from "./anthropic";
import { isOpenAIUserKeyError } from "./openai";
import {
  resolveOllamaBaseUrl,
  resolveProviderId,
  type AiProviderOptions,
} from "./config";

/** Laptop Ollama URLs are unreachable from Cloudflare Workers / remote jobs. */
export function isLoopbackOllamaUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

export async function resolveAiClient(
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<AiProviderClient> {
  let providerId = resolveProviderId(aiProviderOptions);

  // Workers cannot dial the operator's laptop Ollama — use platform Gemini.
  if (providerId === "ollama" && isLoopbackOllamaUrl(resolveOllamaBaseUrl(aiProviderOptions))) {
    providerId = "gemini";
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
