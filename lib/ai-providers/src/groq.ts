import type { AiProviderClient, GenerateParams, GenerateResult } from "./client";
import { generateOpenAICompatibleChat, isOpenAIUserKeyError } from "./openai";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const isGroqUserKeyError = isOpenAIUserKeyError;

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

export class GroqClient implements AiProviderClient {
  id = "groq" as const;

  constructor(
    private apiKey: string,
    private defaultModel: string,
  ) {}

  static create(options?: { apiKey?: string | null; model?: string | null }): GroqClient {
    const apiKey = options?.apiKey?.trim() || env("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Groq API key not configured. Set GROQ_API_KEY or pass a user key.",
      );
    }
    const model = options?.model?.trim() || env("GROQ_MODEL") || GROQ_DEFAULT_MODEL;
    return new GroqClient(apiKey, model);
  }

  generate(params: GenerateParams): Promise<GenerateResult> {
    return generateOpenAICompatibleChat(
      {
        apiKey: this.apiKey,
        defaultModel: this.defaultModel,
        baseUrl: GROQ_BASE_URL,
        errorLabel: "Groq",
      },
      params,
    );
  }
}
