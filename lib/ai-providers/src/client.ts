import type { GoogleGenAI } from "@google/genai";
import {
  buildAiProviderCacheKey,
  resolveProviderId,
  resolveOllamaConfigAsync,
  type AiProviderId,
  type AiProviderOptions,
  type ResolvedOllamaConfig,
} from "./config";

export type { AiProviderId, AiProviderOptions } from "./config";
export { resolveProviderId, resolveOllamaConfig, resolveOllamaConfigAsync } from "./config";

export interface GenerateParams {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  thinkingBudget?: number;
}

export interface GenerateResult {
  text: string;
  usage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AiProviderClient {
  id: AiProviderId;
  generate(params: GenerateParams): Promise<GenerateResult>;
  generateStream?(params: GenerateParams): AsyncGenerator<string, void, unknown>;
}

// ── Gemini adapter ──────────────────────────────────────────────────────────

class GeminiClient implements AiProviderClient {
  id = "gemini" as const;

  constructor(private client: GoogleGenAI) {}

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const response = await this.client.models.generateContent({
      model: params.model ?? "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature,
        maxOutputTokens: params.maxOutputTokens,
        responseMimeType: params.responseMimeType,
        thinkingConfig:
          params.thinkingBudget !== undefined
            ? { thinkingBudget: params.thinkingBudget }
            : undefined,
      },
    });
    const usageMeta = (response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;
    const promptTokens = usageMeta?.promptTokenCount;
    const outputTokens = usageMeta?.candidatesTokenCount;
    return {
      text: response.text ?? "",
      usage:
        promptTokens != null || outputTokens != null
          ? {
              promptTokens,
              outputTokens,
              totalTokens: usageMeta?.totalTokenCount ?? (promptTokens ?? 0) + (outputTokens ?? 0),
            }
          : undefined,
    };
  }

  async *generateStream(params: GenerateParams): AsyncGenerator<string> {
    const stream = await this.client.models.generateContentStream({
      model: params.model ?? "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature,
        maxOutputTokens: params.maxOutputTokens,
        responseMimeType: params.responseMimeType,
        thinkingConfig:
          params.thinkingBudget !== undefined
            ? { thinkingBudget: params.thinkingBudget }
            : undefined,
      },
    });
    for await (const chunk of stream) {
      const text = chunk.text ?? "";
      if (text) yield text;
    }
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

const _cache = new Map<string, AiProviderClient>();

async function buildClient(
  providerId: AiProviderId,
  options?: AiProviderOptions,
  resolvedOllama?: ResolvedOllamaConfig,
): Promise<AiProviderClient> {
  switch (providerId) {
    case "gemini": {
      const { getPlatformGeminiClient } = await import("./gemini");
      const client = await getPlatformGeminiClient();
      if (!client) {
        throw new Error(
          "Gemini API key not configured. Set GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY, or switch to bedrock/ollama via AI_PROVIDER.",
        );
      }
      return new GeminiClient(client);
    }

    case "bedrock": {
      try {
        const { BedrockClient } = await import("./bedrock");
        return await BedrockClient.create(options?.bedrock);
      } catch (err) {
        throw new Error(
          `Bedrock provider failed to initialize: ${err instanceof Error ? err.message : err}. ` +
          "Install @aws-sdk/client-bedrock-runtime or switch to gemini/ollama via AI_PROVIDER."
        );
      }
    }

    case "ollama": {
      const { OllamaClient } = await import("./ollama");
      const ollama = resolvedOllama ?? (await resolveOllamaConfigAsync(options));
      if (!ollama.model) {
        throw new Error(
          "No Ollama model configured. Set OLLAMA_MODEL in .env.local, choose a model in Settings, or run `ollama pull <model>`.",
        );
      }
      return OllamaClient.create(ollama);
    }

    case "anthropic": {
      const { AnthropicClient } = await import("./anthropic");
      return AnthropicClient.create({
        apiKey: options?.anthropic?.apiKey,
      });
    }

    case "openai": {
      const { OpenAIClient } = await import("./openai");
      return OpenAIClient.create({
        apiKey: options?.openai?.apiKey,
      });
    }
  }
}

/**
 * Get or create an AI provider client.
 * Resolution order: in-app options → AI_PROVIDER env → auto-detect.
 */
export async function getAiProviderClient(options?: AiProviderOptions): Promise<AiProviderClient> {
  const id = resolveProviderId(options);
  const resolvedOllama = id === "ollama" ? await resolveOllamaConfigAsync(options) : undefined;
  const cacheKey =
    id === "ollama" && resolvedOllama
      ? `ollama:${resolvedOllama.baseUrl}:${resolvedOllama.model}`
      : id === "bedrock" && options?.bedrock?.accessKeyId
        ? `bedrock:${options.bedrock.accessKeyId}:${options.bedrock.region ?? ""}:${options.bedrock.model ?? ""}`
        : id === "openai" && options?.openai?.apiKey
          ? `openai:${options.openai.apiKey.slice(-8)}`
          : id === "anthropic" && options?.anthropic?.apiKey
            ? `anthropic:${options.anthropic.apiKey.slice(-8)}`
            : buildAiProviderCacheKey(options);

  const cached = _cache.get(cacheKey);
  if (cached) return cached;

  const client = await buildClient(id, options, resolvedOllama);
  _cache.set(cacheKey, client);
  return client;
}

/** Reset cached clients (useful when switching providers at runtime). */
export function resetAiProviderClient(): void {
  _cache.clear();
}

/**
 * Wrap an existing Gemini client as the unified interface.
 * Used by BYOK flows that already have a GoogleGenAI instance.
 */
export function wrapGeminiClient(client: GoogleGenAI): AiProviderClient {
  return new GeminiClient(client);
}
