import {
  isBedrockEnvConfigured,
  resolveProviderId,
} from "@workspace/ai-providers/config";
import {
  getOrgAiSettingsForUser,
  hasOrgAnthropicCredentials,
  hasOrgBedrockCredentials,
  hasOrgOpenAICredentials,
  toAiProviderOptionsFromOrg,
} from "@workspace/content-engine/support/ai/org-ai-settings";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function isActiveProviderReady(
  activeProvider: ReturnType<typeof resolveProviderId>,
  options: {
    hasUserGeminiKey: boolean;
    hasOrgBedrockKey: boolean;
    hasOrgAnthropicKey: boolean;
    hasOrgOpenAIKey: boolean;
  },
): boolean {
  switch (activeProvider) {
    case "gemini":
      return Boolean(env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY") || options.hasUserGeminiKey);
    case "bedrock":
      return isBedrockEnvConfigured() || options.hasOrgBedrockKey;
    case "anthropic":
      return Boolean(env("ANTHROPIC_API_KEY") || options.hasOrgAnthropicKey);
    case "openai":
      return Boolean(env("OPENAI_API_KEY") || options.hasOrgOpenAIKey);
    case "ollama":
      return Boolean(env("OLLAMA_BASE_URL"));
    default:
      return false;
  }
}

export async function getAiProviderStatusForUser(userId: number) {
  const orgSettings = await getOrgAiSettingsForUser(userId);
  const aiProviderOptions = toAiProviderOptionsFromOrg(orgSettings);
  const activeProvider = resolveProviderId(aiProviderOptions);

  const hasUserGeminiKey = Boolean(orgSettings?.encryptedGeminiKey);
  const hasOrgBedrockKey = hasOrgBedrockCredentials(orgSettings);
  const hasOrgAnthropicKey = hasOrgAnthropicCredentials(orgSettings);
  const hasOrgOpenAIKey = hasOrgOpenAICredentials(orgSettings);

  return {
    activeProvider,
    ready: isActiveProviderReady(activeProvider, {
      hasUserGeminiKey,
      hasOrgBedrockKey,
      hasOrgAnthropicKey,
      hasOrgOpenAIKey,
    }),
    source: orgSettings?.aiProvider ? ("app" as const) : env("AI_PROVIDER") ? ("env" as const) : ("auto" as const),
    settings: {
      provider: orgSettings?.aiProvider ?? null,
      ollamaBaseUrl: orgSettings?.ollamaBaseUrl ?? null,
      ollamaModel: orgSettings?.ollamaModel ?? null,
    },
    gemini: {
      configured: Boolean(env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY") || hasUserGeminiKey),
      source: hasUserGeminiKey ? ("org-key" as const) : env("GEMINI_API_KEY") ? ("env-key" as const) : null,
    },
    bedrock: {
      configured: isBedrockEnvConfigured() || hasOrgBedrockKey,
      region: orgSettings?.bedrockRegion ?? env("AWS_REGION") ?? null,
      model: orgSettings?.bedrockModel ?? env("BEDROCK_MODEL") ?? null,
      source: hasOrgBedrockKey ? ("org-key" as const) : isBedrockEnvConfigured() ? ("env" as const) : null,
    },
    anthropic: {
      configured: Boolean(env("ANTHROPIC_API_KEY") || hasOrgAnthropicKey),
      source: hasOrgAnthropicKey ? ("org-key" as const) : env("ANTHROPIC_API_KEY") ? ("env" as const) : null,
    },
    openai: {
      configured: Boolean(env("OPENAI_API_KEY") || hasOrgOpenAIKey),
      source: hasOrgOpenAIKey ? ("org-key" as const) : env("OPENAI_API_KEY") ? ("env" as const) : null,
    },
    ollama: {
      configured: Boolean(orgSettings?.ollamaBaseUrl || env("OLLAMA_BASE_URL")),
      baseUrl: orgSettings?.ollamaBaseUrl ?? env("OLLAMA_BASE_URL") ?? "http://localhost:11434",
      model: orgSettings?.ollamaModel ?? env("OLLAMA_MODEL") ?? "llama3.2",
      reachable: false,
    },
  };
}
