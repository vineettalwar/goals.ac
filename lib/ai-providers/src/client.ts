import type { GoogleGenAI } from "@google/genai";

export type AiProviderId = "gemini" | "bedrock" | "ollama";

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
    return { text: response.text ?? "" };
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

let _cached: AiProviderClient | null = null;

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

async function resolveProviderId(): Promise<AiProviderId> {
  const explicit = env("AI_PROVIDER");
  if (explicit === "bedrock" || explicit === "ollama" || explicit === "gemini") {
    return explicit;
  }

  // Auto-detect: first available provider wins
  if (env("GEMINI_API_KEY") || env("AI_INTEGRATIONS_GEMINI_API_KEY")) {
    return "gemini";
  }
  if (env("AWS_ACCESS_KEY_ID") || env("AWS_PROFILE")) {
    return "bedrock";
  }
  // Ollama is local — always check last
  return "ollama";
}

async function buildClient(providerId: AiProviderId): Promise<AiProviderClient> {
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
        return await BedrockClient.create();
      } catch (err) {
        throw new Error(
          `Bedrock provider failed to initialize: ${err instanceof Error ? err.message : err}. ` +
          "Install @aws-sdk/client-bedrock-runtime or switch to gemini/ollama via AI_PROVIDER."
        );
      }
    }

    case "ollama": {
      const { OllamaClient } = await import("./ollama");
      return OllamaClient.create();
    }
  }
}

/**
 * Get or create the singleton AI provider client.
 * Provider is selected via AI_PROVIDER env var, or auto-detected.
 */
export async function getAiProviderClient(): Promise<AiProviderClient> {
  if (_cached) return _cached;
  const id = await resolveProviderId();
  _cached = await buildClient(id);
  return _cached;
}

/** Reset the cached client (useful when switching providers at runtime). */
export function resetAiProviderClient(): void {
  _cached = null;
}

/**
 * Wrap an existing Gemini client as the unified interface.
 * Used by BYOK flows that already have a GoogleGenAI instance.
 */
export function wrapGeminiClient(client: GoogleGenAI): AiProviderClient {
  return new GeminiClient(client);
}
