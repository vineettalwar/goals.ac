import {
  resolveProviderId,
  resolveOllamaConfig,
  type AiProviderId,
} from "@workspace/ai-providers";

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

export function buildAiProviderStatus(
  user: {
    aiProvider: string | null;
    ollamaBaseUrl: string | null;
    ollamaModel: string | null;
  } | undefined,
) {
  const aiProviderOptions = {
    providerId: user?.aiProvider as AiProviderId | null | undefined,
    ollamaBaseUrl: user?.ollamaBaseUrl,
    ollamaModel: user?.ollamaModel,
  };

  const activeProvider = resolveProviderId(aiProviderOptions);
  const ollama = resolveOllamaConfig(aiProviderOptions);
  const envProvider = env("AI_PROVIDER") ?? null;

  const geminiConfigured = !!(env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY"));
  const geminiSource = env("AI_INTEGRATIONS_GEMINI_API_KEY")
    ? "replit-proxy"
    : env("GEMINI_API_KEY")
      ? "env-key"
      : null;

  const bedrockConfigured = !!(env("AWS_ACCESS_KEY_ID") || env("AWS_PROFILE"));

  return {
    activeProvider,
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
