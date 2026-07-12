export type AiProviderId = "gemini" | "bedrock" | "ollama";

export interface AiProviderOptions {
  providerId?: AiProviderId | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
}

export interface ResolvedOllamaConfig {
  baseUrl: string;
  model: string;
}

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function normalizeProviderId(value: string | null | undefined): AiProviderId | null {
  if (value === "gemini" || value === "bedrock" || value === "ollama") return value;
  return null;
}

/** App preference first, then AI_PROVIDER env, then auto-detect. */
export function resolveProviderId(options?: AiProviderOptions): AiProviderId {
  const fromApp = normalizeProviderId(options?.providerId ?? undefined);
  if (fromApp) return fromApp;

  const fromEnv = normalizeProviderId(env("AI_PROVIDER"));
  if (fromEnv) return fromEnv;

  if (env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY")) {
    return "gemini";
  }
  if (env("AWS_ACCESS_KEY_ID") || env("AWS_PROFILE")) {
    return "bedrock";
  }
  return "ollama";
}

export function resolveOllamaConfig(options?: AiProviderOptions): ResolvedOllamaConfig {
  const baseUrl =
    options?.ollamaBaseUrl?.trim() ||
    env("OLLAMA_BASE_URL") ||
    "http://localhost:11434";
  const model =
    options?.ollamaModel?.trim() ||
    env("OLLAMA_MODEL") ||
    "llama3.1";
  return { baseUrl, model };
}

export function buildAiProviderCacheKey(options?: AiProviderOptions): string {
  const id = resolveProviderId(options);
  const ollama = resolveOllamaConfig(options);
  return `${id}:${ollama.baseUrl}:${ollama.model}`;
}
