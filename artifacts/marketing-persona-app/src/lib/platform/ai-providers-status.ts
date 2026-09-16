import {
  probeOllamaReachable,
  resolveProviderId,
  resolveOllamaConfig,
  resolveOllamaConfigAsync,
  type AiProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers/config";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export async function enrichOllamaStatus(
  status: AiProviderStatusPayload,
  aiProviderOptions: AiProviderOptions,
): Promise<AiProviderStatusPayload> {
  status.ollama.reachable = await probeOllamaReachable(status.ollama.baseUrl);
  if (status.ollama.reachable) {
    const resolved = await resolveOllamaConfigAsync(aiProviderOptions);
    status.ollama.model = resolved.model;
  }
  if (status.activeProvider === "ollama") {
    status.ready = status.ollama.reachable;
  }
  return status;
}

export function toAiProviderOptions(
  user: {
    aiProvider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
    openrouterModel?: string | null;
    nvidiaModel?: string | null;
  } | undefined,
): AiProviderOptions {
  return {
    providerId: user?.aiProvider as AiProviderId | null | undefined,
    ollamaBaseUrl: user?.ollamaBaseUrl,
    ollamaModel: user?.ollamaModel,
    openrouter: user?.openrouterModel ? { model: user.openrouterModel } : undefined,
    nvidia: user?.nvidiaModel ? { model: user.nvidiaModel } : undefined,
  };
}

export function buildAiProviderStatus(
  user: {
    aiProvider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
    openrouterModel?: string | null;
    nvidiaModel?: string | null;
  } | undefined,
) {
  const aiProviderOptions = toAiProviderOptions(user);

  const activeProvider = resolveProviderId(aiProviderOptions);
  const ollama = resolveOllamaConfig(aiProviderOptions);
  const envProvider = env("AI_PROVIDER") ?? null;

  const geminiConfigured = !!(env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY"));
  const geminiSource = env("AI_INTEGRATIONS_GEMINI_API_KEY")
    ? "replit-proxy"
    : env("GEMINI_API_KEY")
      ? "env-key"
      : null;

  // Env Bedrock alone is not org-available; grants are applied in finalizeAiProviderStatus.
  const anthropicConfigured = !!env("ANTHROPIC_API_KEY");
  const openaiConfigured = !!env("OPENAI_API_KEY");
  const openrouterConfigured = !!env("OPENROUTER_API_KEY");
  const groqConfigured = !!env("GROQ_API_KEY");
  const nvidiaConfigured = !!env("NVIDIA_API_KEY");

  return {
    activeProvider,
    ready: isActiveProviderReady(activeProvider, {
      geminiConfigured,
      bedrockConfigured: false,
      anthropicConfigured,
      openaiConfigured,
      openrouterConfigured,
      groqConfigured,
      nvidiaConfigured,
      ollamaConfigured: activeProvider === "ollama" || !!user?.ollamaBaseUrl || !!env("OLLAMA_BASE_URL"),
    }),
    source: user?.aiProvider ? "app" as const : envProvider ? "env" as const : "auto" as const,
    settings: {
      provider: user?.aiProvider ?? null,
      ollamaBaseUrl: user?.ollamaBaseUrl ?? null,
      ollamaModel: user?.ollamaModel ?? null,
      openrouterModel: user?.openrouterModel ?? null,
      nvidiaModel: user?.nvidiaModel ?? null,
    },
    envFallback: {
      provider: envProvider,
      ollamaBaseUrl: env("OLLAMA_BASE_URL") ?? null,
      ollamaModel: env("OLLAMA_MODEL") ?? null,
    },
    gemini: { configured: geminiConfigured, source: geminiSource },
    bedrock: {
      configured: false,
      region: env("AWS_REGION") ?? env("AWS_DEFAULT_REGION") ?? null,
      model: env("BEDROCK_MODEL") ?? null,
      source: null as "env" | "org-key" | "platform-grant" | null,
    },
    anthropic: {
      configured: anthropicConfigured,
      source: (anthropicConfigured ? "env" : null) as "env" | "org-key" | null,
    },
    openai: {
      configured: openaiConfigured,
      source: (openaiConfigured ? "env" : null) as "env" | "org-key" | null,
    },
    openrouter: {
      configured: openrouterConfigured,
      source: (openrouterConfigured ? "env" : null) as "env" | "org-key" | null,
      model: user?.openrouterModel ?? env("OPENROUTER_MODEL") ?? null,
    },
    groq: {
      configured: groqConfigured,
      source: (groqConfigured ? "env" : null) as "env" | "org-key" | null,
    },
    nvidia: {
      configured: nvidiaConfigured,
      source: (nvidiaConfigured ? "env" : null) as "env" | "org-key" | null,
      model: user?.nvidiaModel ?? env("NVIDIA_MODEL") ?? null,
    },
    ollama: {
      configured: activeProvider === "ollama" || !!user?.ollamaBaseUrl || !!env("OLLAMA_BASE_URL"),
      baseUrl: ollama.baseUrl,
      model: ollama.model,
      reachable: false as boolean,
    },
  };
}

export function isActiveProviderReady(
  activeProvider: AiProviderId,
  options: {
    geminiConfigured: boolean;
    bedrockConfigured: boolean;
    anthropicConfigured: boolean;
    openaiConfigured: boolean;
    openrouterConfigured: boolean;
    groqConfigured: boolean;
    nvidiaConfigured: boolean;
    ollamaConfigured: boolean;
    ollamaReachable?: boolean;
    hasUserGeminiKey?: boolean;
    hasOrgBedrockKey?: boolean;
    hasPlatformBedrockGrant?: boolean;
    hasOrgAnthropicKey?: boolean;
    hasOrgOpenAIKey?: boolean;
    hasOrgOpenRouterKey?: boolean;
    hasOrgGroqKey?: boolean;
    hasOrgNvidiaKey?: boolean;
    orgBedrockRegion?: string | null;
    orgBedrockModel?: string | null;
  },
): boolean {
  switch (activeProvider) {
    case "gemini":
      return options.geminiConfigured || Boolean(options.hasUserGeminiKey);
    case "bedrock":
      return (
        Boolean(options.hasOrgBedrockKey) ||
        (Boolean(options.hasPlatformBedrockGrant) && options.bedrockConfigured)
      );
    case "anthropic":
      return options.anthropicConfigured || Boolean(options.hasOrgAnthropicKey);
    case "openai":
      return options.openaiConfigured || Boolean(options.hasOrgOpenAIKey);
    case "openrouter":
      return options.openrouterConfigured || Boolean(options.hasOrgOpenRouterKey);
    case "groq":
      return options.groqConfigured || Boolean(options.hasOrgGroqKey);
    case "nvidia":
      return options.nvidiaConfigured || Boolean(options.hasOrgNvidiaKey);
    case "ollama":
      return Boolean(options.ollamaReachable);
    default:
      return false;
  }
}

export function aiProviderUnavailableMessage(activeProvider: AiProviderId): string {
  switch (activeProvider) {
    case "gemini":
      return "No Gemini API key configured. Add your key in Settings or set GEMINI_API_KEY in .env.local.";
    case "bedrock":
      return "AWS Bedrock is not configured. Add your AWS credentials in Settings or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local.";
    case "anthropic":
      return "No Anthropic API key configured. Add your key in Settings or set ANTHROPIC_API_KEY in .env.local.";
    case "openai":
      return "No OpenAI API key configured. Add your key in Settings or set OPENAI_API_KEY in .env.local.";
    case "openrouter":
      return "No OpenRouter API key configured. Add your key in Settings or set OPENROUTER_API_KEY in .env.local.";
    case "groq":
      return "No Groq API key configured. Add your key in Settings or set GROQ_API_KEY in .env.local.";
    case "nvidia":
      return "No NVIDIA API key configured. Add your key in Settings or set NVIDIA_API_KEY in .env.local.";
    case "ollama":
      return "Ollama is not reachable. Start Ollama locally, set OLLAMA_BASE_URL in .env.local, or update your Ollama URL in Settings.";
    default:
      return "No AI provider is configured. Check Settings or your .env.local environment variables.";
  }
}

export type AiProviderStatusPayload = ReturnType<typeof buildAiProviderStatus>;

export function finalizeAiProviderStatus(
  status: AiProviderStatusPayload,
  options?: {
    hasUserGeminiKey?: boolean;
    hasOrgBedrockKey?: boolean;
    hasPlatformBedrockGrant?: boolean;
    platformBedrockConfigured?: boolean;
    hasOrgAnthropicKey?: boolean;
    hasOrgOpenAIKey?: boolean;
    hasOrgOpenRouterKey?: boolean;
    hasOrgGroqKey?: boolean;
    hasOrgNvidiaKey?: boolean;
    orgBedrockRegion?: string | null;
    orgBedrockModel?: string | null;
    platformBedrockRegion?: string | null;
    platformBedrockModel?: string | null;
  },
): AiProviderStatusPayload {
  const platformBedrockReady =
    Boolean(options?.hasPlatformBedrockGrant) && Boolean(options?.platformBedrockConfigured);
  const bedrockConfigured = Boolean(options?.hasOrgBedrockKey) || platformBedrockReady;
  const anthropicConfigured = status.anthropic.configured || Boolean(options?.hasOrgAnthropicKey);
  const openaiConfigured = status.openai.configured || Boolean(options?.hasOrgOpenAIKey);
  const openrouterConfigured = status.openrouter.configured || Boolean(options?.hasOrgOpenRouterKey);
  const groqConfigured = status.groq.configured || Boolean(options?.hasOrgGroqKey);
  const nvidiaConfigured = status.nvidia.configured || Boolean(options?.hasOrgNvidiaKey);
  const bedrockSource = options?.hasOrgBedrockKey
    ? ("org-key" as const)
    : platformBedrockReady
      ? ("platform-grant" as const)
      : null;
  return {
    ...status,
    bedrock: {
      ...status.bedrock,
      configured: bedrockConfigured,
      region:
        options?.orgBedrockRegion ??
        options?.platformBedrockRegion ??
        status.bedrock.region,
      model:
        options?.orgBedrockModel ?? options?.platformBedrockModel ?? status.bedrock.model,
      source: bedrockSource,
    },
    anthropic: {
      ...status.anthropic,
      configured: anthropicConfigured,
      source: options?.hasOrgAnthropicKey ? "org-key" : status.anthropic.source,
    },
    openai: {
      ...status.openai,
      configured: openaiConfigured,
      source: options?.hasOrgOpenAIKey ? "org-key" : status.openai.source,
    },
    openrouter: {
      ...status.openrouter,
      configured: openrouterConfigured,
      source: options?.hasOrgOpenRouterKey ? "org-key" : status.openrouter.source,
    },
    groq: {
      ...status.groq,
      configured: groqConfigured,
      source: options?.hasOrgGroqKey ? "org-key" : status.groq.source,
    },
    nvidia: {
      ...status.nvidia,
      configured: nvidiaConfigured,
      source: options?.hasOrgNvidiaKey ? "org-key" : status.nvidia.source,
    },
    ready: isActiveProviderReady(status.activeProvider, {
      geminiConfigured: status.gemini.configured,
      bedrockConfigured: platformBedrockReady || Boolean(options?.hasOrgBedrockKey),
      anthropicConfigured,
      openaiConfigured,
      openrouterConfigured,
      groqConfigured,
      nvidiaConfigured,
      ollamaConfigured: status.ollama.configured,
      ollamaReachable: status.ollama.reachable,
      hasUserGeminiKey: options?.hasUserGeminiKey,
      hasOrgBedrockKey: options?.hasOrgBedrockKey,
      hasPlatformBedrockGrant: options?.hasPlatformBedrockGrant,
      hasOrgAnthropicKey: options?.hasOrgAnthropicKey,
      hasOrgOpenAIKey: options?.hasOrgOpenAIKey,
      hasOrgOpenRouterKey: options?.hasOrgOpenRouterKey,
      hasOrgGroqKey: options?.hasOrgGroqKey,
      hasOrgNvidiaKey: options?.hasOrgNvidiaKey,
      orgBedrockRegion: options?.orgBedrockRegion,
      orgBedrockModel: options?.orgBedrockModel,
    }),
  };
}
