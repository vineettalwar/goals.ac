import {
  resolveProviderId,
  resolveOllamaConfig,
  resolveOllamaConfigAsync,
  isBedrockEnvConfigured,
  type AiProviderId,
  type AiProviderOptions,
} from "@workspace/ai-providers/config";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export async function probeOllama(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

export async function enrichOllamaStatus(
  status: AiProviderStatusPayload,
  aiProviderOptions: AiProviderOptions,
): Promise<AiProviderStatusPayload> {
  status.ollama.reachable = await probeOllama(status.ollama.baseUrl);
  if (status.ollama.reachable) {
    const resolved = await resolveOllamaConfigAsync(aiProviderOptions);
    status.ollama.model = resolved.model;
  }
  return status;
}

export function toAiProviderOptions(
  user: {
    aiProvider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
  } | undefined,
): AiProviderOptions {
  return {
    providerId: user?.aiProvider as AiProviderId | null | undefined,
    ollamaBaseUrl: user?.ollamaBaseUrl,
    ollamaModel: user?.ollamaModel,
  };
}

export function buildAiProviderStatus(
  user: {
    aiProvider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
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

  const bedrockConfigured = isBedrockEnvConfigured();
  const anthropicConfigured = !!env("ANTHROPIC_API_KEY");
  const openaiConfigured = !!env("OPENAI_API_KEY");

  return {
    activeProvider,
    ready: isActiveProviderReady(activeProvider, {
      geminiConfigured,
      bedrockConfigured,
      anthropicConfigured,
      openaiConfigured,
      ollamaConfigured: activeProvider === "ollama" || !!user?.ollamaBaseUrl || !!env("OLLAMA_BASE_URL"),
    }),
    source: user?.aiProvider ? "app" as const : envProvider ? "env" as const : "auto" as const,
    settings: {
      provider: user?.aiProvider ?? null,
      ollamaBaseUrl: user?.ollamaBaseUrl ?? null,
      ollamaModel: user?.ollamaModel ?? null,
    },
    envFallback: {
      provider: envProvider,
      ollamaBaseUrl: env("OLLAMA_BASE_URL") ?? null,
      ollamaModel: env("OLLAMA_MODEL") ?? null,
    },
    gemini: { configured: geminiConfigured, source: geminiSource },
    bedrock: {
      configured: bedrockConfigured,
      region: env("AWS_REGION") ?? env("AWS_DEFAULT_REGION") ?? (bedrockConfigured ? "us-east-1" : null),
      model: env("BEDROCK_MODEL") ?? null,
      source: (bedrockConfigured ? "env" : null) as "env" | "org-key" | null,
    },
    anthropic: {
      configured: anthropicConfigured,
      source: (anthropicConfigured ? "env" : null) as "env" | "org-key" | null,
    },
    openai: {
      configured: openaiConfigured,
      source: (openaiConfigured ? "env" : null) as "env" | "org-key" | null,
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
    ollamaConfigured: boolean;
    ollamaReachable?: boolean;
    hasUserGeminiKey?: boolean;
    hasOrgBedrockKey?: boolean;
    hasOrgAnthropicKey?: boolean;
    hasOrgOpenAIKey?: boolean;
    orgBedrockRegion?: string | null;
    orgBedrockModel?: string | null;
  },
): boolean {
  switch (activeProvider) {
    case "gemini":
      return options.geminiConfigured || Boolean(options.hasUserGeminiKey);
    case "bedrock":
      return options.bedrockConfigured || Boolean(options.hasOrgBedrockKey);
    case "anthropic":
      return options.anthropicConfigured || Boolean(options.hasOrgAnthropicKey);
    case "openai":
      return options.openaiConfigured || Boolean(options.hasOrgOpenAIKey);
    case "ollama":
      return options.ollamaReachable ?? options.ollamaConfigured;
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
    hasOrgAnthropicKey?: boolean;
    hasOrgOpenAIKey?: boolean;
    orgBedrockRegion?: string | null;
    orgBedrockModel?: string | null;
  },
): AiProviderStatusPayload {
  const bedrockConfigured = status.bedrock.configured || Boolean(options?.hasOrgBedrockKey);
  const anthropicConfigured = status.anthropic.configured || Boolean(options?.hasOrgAnthropicKey);
  const openaiConfigured = status.openai.configured || Boolean(options?.hasOrgOpenAIKey);
  return {
    ...status,
    bedrock: {
      ...status.bedrock,
      configured: bedrockConfigured,
      region: options?.orgBedrockRegion ?? status.bedrock.region,
      model: options?.orgBedrockModel ?? status.bedrock.model,
      source: options?.hasOrgBedrockKey ? "org-key" : status.bedrock.source,
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
    ready: isActiveProviderReady(status.activeProvider, {
      geminiConfigured: status.gemini.configured,
      bedrockConfigured,
      anthropicConfigured,
      openaiConfigured,
      ollamaConfigured: status.ollama.configured,
      ollamaReachable: status.ollama.reachable,
      hasUserGeminiKey: options?.hasUserGeminiKey,
      hasOrgBedrockKey: options?.hasOrgBedrockKey,
      hasOrgAnthropicKey: options?.hasOrgAnthropicKey,
      hasOrgOpenAIKey: options?.hasOrgOpenAIKey,
      orgBedrockRegion: options?.orgBedrockRegion,
      orgBedrockModel: options?.orgBedrockModel,
    }),
  };
}
