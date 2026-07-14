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
  const usingGeminiKey = Boolean(userApiKey && providerId === "gemini");
  const usingBedrockKey = Boolean(
    providerId === "bedrock" &&
      aiProviderOptions.bedrock?.accessKeyId &&
      aiProviderOptions.bedrock?.secretAccessKey,
  );
  const usingAnthropicKey = Boolean(
    providerId === "anthropic" && aiProviderOptions.anthropic?.apiKey?.trim(),
  );
  const usingOpenAIKey = Boolean(
    providerId === "openai" && aiProviderOptions.openai?.apiKey?.trim(),
  );

  if (usingGeminiKey && userApiKey) {
    try {
      const client = wrapGeminiClient(await createUserGeminiClient(userApiKey));
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  if (usingBedrockKey) {
    try {
      const { BedrockClient } = await import("@workspace/ai-providers/bedrock");
      const client = await BedrockClient.create(aiProviderOptions.bedrock);
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  if (usingAnthropicKey) {
    try {
      const { AnthropicClient } = await import("@workspace/ai-providers/anthropic");
      const client = AnthropicClient.create({
        apiKey: aiProviderOptions.anthropic?.apiKey,
      });
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  if (usingOpenAIKey) {
    try {
      const { OpenAIClient } = await import("@workspace/ai-providers/openai");
      const client = OpenAIClient.create({
        apiKey: aiProviderOptions.openai?.apiKey,
      });
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return { client, providerId, usingUserKey: false, source: "platform" };
}
