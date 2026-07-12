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

  return {
    activeProvider,
    ready: isActiveProviderReady(activeProvider, {
      geminiConfigured,
      bedrockConfigured,
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
    ollamaConfigured: boolean;
    ollamaReachable?: boolean;
    hasUserGeminiKey?: boolean;
  },
): boolean {
  switch (activeProvider) {
    case "gemini":
      return options.geminiConfigured || Boolean(options.hasUserGeminiKey);
    case "bedrock":
      return options.bedrockConfigured;
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
      return "AWS Bedrock is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or AWS_PROFILE) in .env.local, or choose a different AI provider in Settings.";
    case "ollama":
      return "Ollama is not reachable. Start Ollama locally, set OLLAMA_BASE_URL in .env.local, or update your Ollama URL in Settings.";
    default:
      return "No AI provider is configured. Check Settings or your .env.local environment variables.";
  }
}

export type AiProviderStatusPayload = ReturnType<typeof buildAiProviderStatus>;

export function finalizeAiProviderStatus(
  status: AiProviderStatusPayload,
  options?: { hasUserGeminiKey?: boolean },
): AiProviderStatusPayload {
  return {
    ...status,
    ready: isActiveProviderReady(status.activeProvider, {
      geminiConfigured: status.gemini.configured,
      bedrockConfigured: status.bedrock.configured,
      ollamaConfigured: status.ollama.configured,
      ollamaReachable: status.ollama.reachable,
      hasUserGeminiKey: options?.hasUserGeminiKey,
    }),
  };
}
