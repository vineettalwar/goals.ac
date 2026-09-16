import type { AiProviderClient, GenerateParams, GenerateResult } from "./client";
import { generateOpenAICompatibleChat, isOpenAIUserKeyError } from "./openai";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const isOpenRouterUserKeyError = isOpenAIUserKeyError;

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_DEFAULT_MODEL = "openai/gpt-4.1-mini";

export class OpenRouterClient implements AiProviderClient {
  id = "openrouter" as const;

  constructor(
    private apiKey: string,
    private defaultModel: string,
  ) {}

  static create(options?: { apiKey?: string | null; model?: string | null }): OpenRouterClient {
    const apiKey = options?.apiKey?.trim() || env("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error(
        "OpenRouter API key not configured. Set OPENROUTER_API_KEY or pass a user key.",
      );
    }
    const model = options?.model?.trim() || env("OPENROUTER_MODEL") || OPENROUTER_DEFAULT_MODEL;
    return new OpenRouterClient(apiKey, model);
  }

  generate(params: GenerateParams): Promise<GenerateResult> {
    return generateOpenAICompatibleChat(
      {
        apiKey: this.apiKey,
        defaultModel: this.defaultModel,
        baseUrl: OPENROUTER_BASE_URL,
        extraHeaders: {
          "HTTP-Referer": "https://goals.ac",
          "X-Title": "goals.ac",
        },
        errorLabel: "OpenRouter",
      },
      params,
    );
  }
}
