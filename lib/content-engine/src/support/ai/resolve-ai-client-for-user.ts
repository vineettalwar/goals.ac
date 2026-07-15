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
            region: platformCreds.region ?? aiProviderOptions.bedrock?.region,
            model: platformCreds.model ?? aiProviderOptions.bedrock?.model,
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

  const client = await resolveAiClient(userApiKey, aiProviderOptions);
  return { client, providerId, usingUserKey: false, source: "platform" };
}

/** True when the org's selected provider is backed by an org BYOK key/credential. */
export async function isByokActiveForUser(userId: number): Promise<boolean> {
  const resolved = await resolveAiClientForUser(userId);
  return resolved.usingUserKey;
}
