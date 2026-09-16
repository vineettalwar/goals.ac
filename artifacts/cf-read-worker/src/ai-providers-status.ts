import { resolveProviderId, probeOllamaReachable } from "@workspace/ai-providers/config";
import {
  getOrgAiSettingsForUser,
  hasOrgAnthropicCredentials,
  hasOrgBedrockCredentials,
  hasOrgOpenAICredentials,
  hasOrgOpenRouterCredentials,
  hasOrgGroqCredentials,
  hasOrgNvidiaCredentials,
  toAiProviderOptionsFromOrg,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  isOrgGrantedPlatformBedrock,
  loadPlatformBedrockCredentials,
} from "@workspace/content-engine/support/ai/platform-bedrock";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function isActiveProviderReady(
  activeProvider: ReturnType<typeof resolveProviderId>,
  options: {
    hasUserGeminiKey: boolean;
    hasOrgBedrockKey: boolean;
    hasPlatformBedrock: boolean;
    hasOrgAnthropicKey: boolean;
    hasOrgOpenAIKey: boolean;
    hasOrgOpenRouterKey: boolean;
    hasOrgGroqKey: boolean;
    hasOrgNvidiaKey: boolean;
    ollamaReachable: boolean;
  },
): boolean {
  switch (activeProvider) {
    case "gemini":
      return Boolean(
        env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY") || options.hasUserGeminiKey,
      );
    case "bedrock":
      return options.hasOrgBedrockKey || options.hasPlatformBedrock;
    case "anthropic":
      return Boolean(env("ANTHROPIC_API_KEY") || options.hasOrgAnthropicKey);
    case "openai":
      return Boolean(env("OPENAI_API_KEY") || options.hasOrgOpenAIKey);
    case "openrouter":
      return Boolean(env("OPENROUTER_API_KEY") || options.hasOrgOpenRouterKey);
    case "groq":
      return Boolean(env("GROQ_API_KEY") || options.hasOrgGroqKey);
    case "nvidia":
      return Boolean(env("NVIDIA_API_KEY") || options.hasOrgNvidiaKey);
    case "ollama":
      return options.ollamaReachable;
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
  const hasOrgOpenRouterKey = hasOrgOpenRouterCredentials(orgSettings);
  const hasOrgGroqKey = hasOrgGroqCredentials(orgSettings);
  const hasOrgNvidiaKey = hasOrgNvidiaCredentials(orgSettings);

  const organizationId = orgSettings?.organizationId ?? null;
  const [hasPlatformBedrockGrant, platformBedrock] = await Promise.all([
    organizationId ? isOrgGrantedPlatformBedrock(organizationId) : Promise.resolve(false),
    loadPlatformBedrockCredentials(),
  ]);
  const hasPlatformBedrock = hasPlatformBedrockGrant && Boolean(platformBedrock);

  const ollamaBaseUrl =
    orgSettings?.ollamaBaseUrl ?? env("OLLAMA_BASE_URL") ?? "http://localhost:11434";
  const ollamaReachable = await probeOllamaReachable(ollamaBaseUrl);

  return {
    activeProvider,
    ready: isActiveProviderReady(activeProvider, {
      hasUserGeminiKey,
      hasOrgBedrockKey,
      hasPlatformBedrock,
      hasOrgAnthropicKey,
      hasOrgOpenAIKey,
      hasOrgOpenRouterKey,
      hasOrgGroqKey,
      hasOrgNvidiaKey,
      ollamaReachable,
    }),
    source: orgSettings?.aiProvider
      ? ("app" as const)
      : env("AI_PROVIDER")
        ? ("env" as const)
        : ("auto" as const),
    settings: {
      provider: orgSettings?.aiProvider ?? null,
      ollamaBaseUrl: orgSettings?.ollamaBaseUrl ?? null,
      ollamaModel: orgSettings?.ollamaModel ?? null,
      openrouterModel: orgSettings?.openrouterModel ?? null,
      nvidiaModel: orgSettings?.nvidiaModel ?? null,
    },
    gemini: {
      configured: Boolean(
        env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY") || hasUserGeminiKey,
      ),
      source: hasUserGeminiKey
        ? ("org-key" as const)
        : env("GEMINI_API_KEY")
          ? ("env-key" as const)
          : null,
    },
    bedrock: {
      configured: hasOrgBedrockKey || hasPlatformBedrock,
      region:
        orgSettings?.bedrockRegion ??
        platformBedrock?.region ??
        env("AWS_REGION") ??
        null,
      model:
        orgSettings?.bedrockModel ?? platformBedrock?.model ?? env("BEDROCK_MODEL") ?? null,
      source: hasOrgBedrockKey
        ? ("org-key" as const)
        : hasPlatformBedrock
          ? ("platform-grant" as const)
          : null,
    },
    anthropic: {
      configured: Boolean(env("ANTHROPIC_API_KEY") || hasOrgAnthropicKey),
      source: hasOrgAnthropicKey
        ? ("org-key" as const)
        : env("ANTHROPIC_API_KEY")
          ? ("env" as const)
          : null,
    },
    openai: {
      configured: Boolean(env("OPENAI_API_KEY") || hasOrgOpenAIKey),
      source: hasOrgOpenAIKey
        ? ("org-key" as const)
        : env("OPENAI_API_KEY")
          ? ("env" as const)
          : null,
    },
    openrouter: {
      configured: Boolean(env("OPENROUTER_API_KEY") || hasOrgOpenRouterKey),
      source: hasOrgOpenRouterKey
        ? ("org-key" as const)
        : env("OPENROUTER_API_KEY")
          ? ("env" as const)
          : null,
      model: orgSettings?.openrouterModel ?? env("OPENROUTER_MODEL") ?? null,
    },
    groq: {
      configured: Boolean(env("GROQ_API_KEY") || hasOrgGroqKey),
      source: hasOrgGroqKey
        ? ("org-key" as const)
        : env("GROQ_API_KEY")
          ? ("env" as const)
          : null,
    },
    nvidia: {
      configured: Boolean(env("NVIDIA_API_KEY") || hasOrgNvidiaKey),
      source: hasOrgNvidiaKey
        ? ("org-key" as const)
        : env("NVIDIA_API_KEY")
          ? ("env" as const)
          : null,
      model: orgSettings?.nvidiaModel ?? env("NVIDIA_MODEL") ?? null,
    },
    ollama: {
      configured: Boolean(orgSettings?.ollamaBaseUrl || env("OLLAMA_BASE_URL")),
      baseUrl: ollamaBaseUrl,
      model: orgSettings?.ollamaModel ?? env("OLLAMA_MODEL") ?? "llama3.2",
      reachable: ollamaReachable,
    },
  };
}
