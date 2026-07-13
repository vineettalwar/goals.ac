export type AiProviderId = "gemini" | "bedrock" | "ollama";

export interface BedrockCredentialOptions {
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  sessionToken?: string | null;
  region?: string | null;
  model?: string | null;
}

export interface AiProviderOptions {
  providerId?: AiProviderId | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
  bedrock?: BedrockCredentialOptions | null;
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

export function resolveOllamaBaseUrl(options?: AiProviderOptions): string {
  return (
    options?.ollamaBaseUrl?.trim() ||
    env("OLLAMA_BASE_URL") ||
    "http://localhost:11434"
  );
}

/** Ordered model candidates: per-user setting, then OLLAMA_MODEL env. */
export function resolveOllamaModelCandidates(options?: AiProviderOptions): string[] {
  const candidates: string[] = [];
  const userModel = options?.ollamaModel?.trim();
  const envModel = env("OLLAMA_MODEL");
  if (userModel) candidates.push(userModel);
  if (envModel && envModel !== userModel) candidates.push(envModel);
  return candidates;
}

export async function listOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return [];
    const data = (await resp.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}

function pickInstalledOllamaModel(
  requested: string,
  installed: string[],
): string | null {
  if (installed.includes(requested)) return requested;
  const base = requested.split(":")[0];
  return installed.find((m) => m === base || m.startsWith(`${base}:`)) ?? null;
}

/** Sync snapshot for status UI — may differ from the model actually used at runtime. */
export function resolveOllamaConfig(options?: AiProviderOptions): ResolvedOllamaConfig {
  const baseUrl = resolveOllamaBaseUrl(options);
  const candidates = resolveOllamaModelCandidates(options);
  return { baseUrl, model: candidates[0] ?? "" };
}

/**
 * Resolve Ollama config against installed models.
 * Falls back: user model → OLLAMA_MODEL env → first installed model.
 */
export async function resolveOllamaConfigAsync(
  options?: AiProviderOptions,
): Promise<ResolvedOllamaConfig> {
  const baseUrl = resolveOllamaBaseUrl(options);
  const installed = await listOllamaModels(baseUrl);
  const candidates = resolveOllamaModelCandidates(options);

  for (const candidate of candidates) {
    const match = pickInstalledOllamaModel(candidate, installed);
    if (match) return { baseUrl, model: match };
  }

  if (installed.length > 0) {
    return { baseUrl, model: installed[0] };
  }

  return { baseUrl, model: candidates[0] ?? "" };
}

export function buildAiProviderCacheKey(options?: AiProviderOptions): string {
  const id = resolveProviderId(options);
  const ollama = resolveOllamaConfig(options);
  return `${id}:${ollama.baseUrl}:${ollama.model}`;
}
