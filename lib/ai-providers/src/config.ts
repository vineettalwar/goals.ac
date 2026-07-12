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

/** True when backend env suggests Bedrock credentials are available. */
export function isBedrockEnvConfigured(): boolean {
  if (env("AI_PROVIDER") === "bedrock") return true;
  return !!(
    (env("AWS_ACCESS_KEY_ID") && env("AWS_SECRET_ACCESS_KEY")) ||
    env("AWS_PROFILE") ||
    env("AWS_ROLE_ARN") ||
    env("AWS_WEB_IDENTITY_TOKEN_FILE") ||
    env("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI") ||
    env("AWS_CONTAINER_CREDENTIALS_FULL_URI")
  );
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
  if (isBedrockEnvConfigured()) {
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
