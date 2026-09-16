export type AiProviderId = "gemini" | "bedrock" | "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "nvidia";

export interface BedrockCredentialOptions {
  /** Bedrock API key (bearer token). Prefer this over IAM access keys. */
  apiKey?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  sessionToken?: string | null;
  region?: string | null;
  model?: string | null;
}

export interface OpenAICredentialOptions {
  apiKey?: string | null;
}

export interface OpenRouterCredentialOptions {
  apiKey?: string | null;
  model?: string | null;
}

export interface AnthropicCredentialOptions {
  apiKey?: string | null;
}

export interface GroqCredentialOptions {
  apiKey?: string | null;
}

export interface NvidiaCredentialOptions {
  apiKey?: string | null;
  model?: string | null;
}

export interface AiProviderOptions {
  providerId?: AiProviderId | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
  bedrock?: BedrockCredentialOptions | null;
  openai?: OpenAICredentialOptions | null;
  openrouter?: OpenRouterCredentialOptions | null;
  anthropic?: AnthropicCredentialOptions | null;
  groq?: GroqCredentialOptions | null;
  nvidia?: NvidiaCredentialOptions | null;
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
  if (
    value === "gemini" ||
    value === "bedrock" ||
    value === "ollama" ||
    value === "anthropic" ||
    value === "openai" ||
    value === "openrouter" ||
    value === "groq" ||
    value === "nvidia"
  ) {
    return value;
  }
  return null;
}

/** True when backend env suggests Bedrock credentials are available. */
export function isBedrockEnvConfigured(): boolean {
  if (env("AI_PROVIDER") === "bedrock") return true;
  return !!(
    env("AWS_BEARER_TOKEN_BEDROCK") ||
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
  if (env("ANTHROPIC_API_KEY")) {
    return "anthropic";
  }
  if (env("OPENAI_API_KEY")) {
    return "openai";
  }
  if (env("OPENROUTER_API_KEY")) {
    return "openrouter";
  }
  if (env("GROQ_API_KEY")) {
    return "groq";
  }
  if (env("NVIDIA_API_KEY")) {
    return "nvidia";
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

function isPrivateOrLocalHostname(host: string): boolean {
  const hostname = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return true;
  }
  return (
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname)
  );
}

/** Laptop / LAN Ollama hosts that Cloudflare production cannot dial. */
export function isLoopbackOllamaUrl(baseUrl: string): boolean {
  try {
    return isPrivateOrLocalHostname(new URL(baseUrl).hostname);
  } catch {
    return true;
  }
}

export function isCloudflareWorkerRuntime(): boolean {
  try {
    return typeof navigator !== "undefined" && /Cloudflare-Workers/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/** Local Node/Next can use laptop Ollama; Cloudflare Workers cannot. */
export function assertOllamaReachableHere(
  baseUrl: string,
  remoteRuntime = isCloudflareWorkerRuntime(),
): void {
  if (!isLoopbackOllamaUrl(baseUrl) || !remoteRuntime) return;
  throw new Error(
    `Ollama at ${baseUrl} is not reachable from Cloudflare Workers. Point OLLAMA_BASE_URL at a public host, or run the app locally with AI_PROVIDER=ollama.`,
  );
}

function ollamaTagsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/tags`;
}

/** Live `/api/tags` check. Loopback URLs are unreachable on Cloudflare without fetching. */
export async function probeOllamaReachable(
  baseUrl: string,
  remoteRuntime = isCloudflareWorkerRuntime(),
): Promise<boolean> {
  if (!baseUrl.trim() || (isLoopbackOllamaUrl(baseUrl) && remoteRuntime)) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(ollamaTagsUrl(baseUrl), { signal: controller.signal });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

/** Throws when Ollama cannot serve this runtime (loopback on Workers, or dead `/api/tags`). */
export async function requireOllamaReachable(
  baseUrl: string,
  remoteRuntime = isCloudflareWorkerRuntime(),
): Promise<void> {
  const trimmed = baseUrl.trim() || "http://localhost:11434";
  assertOllamaReachableHere(trimmed, remoteRuntime);
  if (await probeOllamaReachable(trimmed, remoteRuntime)) return;
  throw new Error(
    `Ollama at ${trimmed} did not respond. Confirm the URL is reachable from this host.`,
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
  if (isLoopbackOllamaUrl(baseUrl) && isCloudflareWorkerRuntime()) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(ollamaTagsUrl(baseUrl), { signal: controller.signal });
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
