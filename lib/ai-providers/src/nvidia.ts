import type { AiProviderClient, GenerateParams, GenerateResult } from "./client";
import { generateOpenAICompatibleChat, isOpenAIUserKeyError } from "./openai";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const isNvidiaUserKeyError = isOpenAIUserKeyError;

export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NVIDIA_DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

export class NvidiaClient implements AiProviderClient {
  id = "nvidia" as const;

  constructor(
    private apiKey: string,
    private defaultModel: string,
  ) {}

  static create(options?: { apiKey?: string | null; model?: string | null }): NvidiaClient {
    const apiKey = options?.apiKey?.trim() || env("NVIDIA_API_KEY");
    if (!apiKey) {
      throw new Error(
        "NVIDIA API key not configured. Set NVIDIA_API_KEY or pass a user key.",
      );
    }
    const model = options?.model?.trim() || env("NVIDIA_MODEL") || NVIDIA_DEFAULT_MODEL;
    return new NvidiaClient(apiKey, model);
  }

  generate(params: GenerateParams): Promise<GenerateResult> {
    return generateOpenAICompatibleChat(
      {
        apiKey: this.apiKey,
        defaultModel: this.defaultModel,
        baseUrl: NVIDIA_BASE_URL,
        errorLabel: "NVIDIA",
        skipJsonResponseFormat: true,
      },
      params,
    );
  }
}
