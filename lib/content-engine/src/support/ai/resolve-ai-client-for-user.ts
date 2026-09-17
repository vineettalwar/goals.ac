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
import { resolveOrganizationIdForUser } from "./org-ai-settings";
import { resolvePlatformBedrockCredentialsForOrg } from "./platform-bedrock";
import { loadPlatformAiCredentials } from "./platform-ai";

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
      (aiProviderOptions.bedrock?.apiKey ||
        (aiProviderOptions.bedrock?.accessKeyId && aiProviderOptions.bedrock?.secretAccessKey) ||
        aiProviderOptions.bedrock?.secretAccessKey),
  );
  const usingAnthropicKey = Boolean(
    providerId === "anthropic" && aiProviderOptions.anthropic?.apiKey?.trim(),
  );
  const usingOpenAIKey = Boolean(
    providerId === "openai" && aiProviderOptions.openai?.apiKey?.trim(),
  );
  const usingOpenRouterKey = Boolean(
    providerId === "openrouter" && aiProviderOptions.openrouter?.apiKey?.trim(),
  );
  const usingGroqKey = Boolean(
    providerId === "groq" && aiProviderOptions.groq?.apiKey?.trim(),
  );
  const usingNvidiaKey = Boolean(
    providerId === "nvidia" && aiProviderOptions.nvidia?.apiKey?.trim(),
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
      // Fall through to platform-grant / error below.
    }
  }

  if (providerId === "bedrock") {
    const organizationId = await resolveOrganizationIdForUser(userId);
    if (organizationId) {
      const platformCreds = await resolvePlatformBedrockCredentialsForOrg(organizationId);
      if (platformCreds) {
        try {
          const { BedrockClient } = await import("@workspace/ai-providers/bedrock");
          const client = await BedrockClient.create({
            ...platformCreds,
            region: aiProviderOptions.bedrock?.region ?? platformCreds.region,
            model: aiProviderOptions.bedrock?.model ?? platformCreds.model,
          });
          return { client, providerId, usingUserKey: false, source: "platform" };
        } catch {
          // Fall through to error below.
        }
      }
    }
    throw new Error(
      "AWS Bedrock is not available for this organization. Add org credentials or ask a platform admin for access.",
    );
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

  if (usingOpenRouterKey) {
    try {
      const { OpenRouterClient } = await import("@workspace/ai-providers/openrouter");
      const client = OpenRouterClient.create({
        apiKey: aiProviderOptions.openrouter?.apiKey,
        model: aiProviderOptions.openrouter?.model,
      });
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  if (usingGroqKey) {
    try {
      const { GroqClient } = await import("@workspace/ai-providers/groq");
      const client = GroqClient.create({
        apiKey: aiProviderOptions.groq?.apiKey,
      });
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  if (usingNvidiaKey) {
    try {
      const { NvidiaClient } = await import("@workspace/ai-providers/nvidia");
      const client = NvidiaClient.create({
        apiKey: aiProviderOptions.nvidia?.apiKey,
        model: aiProviderOptions.nvidia?.model,
      });
      return { client, providerId, usingUserKey: true, source: "user-key" };
    } catch {
      // Fall through to platform provider below.
    }
  }

  if (providerId === "ollama") {
    const platform = await loadPlatformAiCredentials("ollama");
    const merged = {
      ...aiProviderOptions,
      ollamaBaseUrl: aiProviderOptions.ollamaBaseUrl || platform?.baseUrl,
      ollamaModel: aiProviderOptions.ollamaModel || platform?.model,
    };
    const client = await resolveAiClient(userApiKey, merged);
    return {
      client,
      providerId,
      usingUserKey: Boolean(aiProviderOptions.ollamaBaseUrl),
      source: aiProviderOptions.ollamaBaseUrl ? "user-key" : "platform",
    };
  }

  // Platform DB/env fallback for key-based providers (when org has no BYOK).
  if (
    providerId === "gemini" ||
    providerId === "openai" ||
    providerId === "anthropic" ||
    providerId === "openrouter" ||
    providerId === "groq" ||
    providerId === "nvidia"
  ) {
    const platform = await loadPlatformAiCredentials(providerId);
    if (platform?.apiKey) {
      try {
        if (providerId === "gemini") {
          const client = wrapGeminiClient(await createUserGeminiClient(platform.apiKey));
          return { client, providerId, usingUserKey: false, source: "platform" };
        }
        if (providerId === "openai") {
          const { OpenAIClient } = await import("@workspace/ai-providers/openai");
          return {
            client: OpenAIClient.create({ apiKey: platform.apiKey }),
            providerId,
            usingUserKey: false,
            source: "platform",
          };
        }
        if (providerId === "anthropic") {
          const { AnthropicClient } = await import("@workspace/ai-providers/anthropic");
          return {
            client: AnthropicClient.create({ apiKey: platform.apiKey }),
            providerId,
            usingUserKey: false,
            source: "platform",
          };
        }
        if (providerId === "openrouter") {
          const { OpenRouterClient } = await import("@workspace/ai-providers/openrouter");
          return {
            client: OpenRouterClient.create({
              apiKey: platform.apiKey,
              model: aiProviderOptions.openrouter?.model || platform.model,
            }),
            providerId,
            usingUserKey: false,
            source: "platform",
          };
        }
        if (providerId === "groq") {
          const { GroqClient } = await import("@workspace/ai-providers/groq");
          return {
            client: GroqClient.create({ apiKey: platform.apiKey }),
            providerId,
            usingUserKey: false,
            source: "platform",
          };
        }
        if (providerId === "nvidia") {
          const { NvidiaClient } = await import("@workspace/ai-providers/nvidia");
          return {
            client: NvidiaClient.create({
              apiKey: platform.apiKey,
              model: aiProviderOptions.nvidia?.model || platform.model,
            }),
            providerId,
            usingUserKey: false,
            source: "platform",
          };
        }
      } catch {
        // Fall through to resolveAiClient (env-only path).
      }
    }
  }

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return { client, providerId, usingUserKey: false, source: "platform" };
}

/** True when the org's selected provider is backed by an org BYOK key/credential. */
export async function isByokActiveForUser(userId: number): Promise<boolean> {
  const resolved = await resolveAiClientForUser(userId);
  return resolved.usingUserKey;
}
