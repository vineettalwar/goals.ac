import type { AiProviderClient, GenerateParams, GenerateResult } from "./client";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
}

export function isOpenAIUserKeyError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = typeof e["status"] === "number" ? e["status"] : null;
    if (status === 401 || status === 403 || status === 429) return true;
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("429") ||
    msg.includes("invalid_api_key") ||
    msg.includes("incorrect api key") ||
    msg.includes("quota") ||
    msg.includes("insufficient_quota") ||
    msg.includes("rate limit")
  );
}

export class OpenAIClient implements AiProviderClient {
  id = "openai" as const;

  constructor(
    private apiKey: string,
    private defaultModel: string,
  ) {}

  static create(options?: { apiKey?: string | null; model?: string | null }): OpenAIClient {
    const apiKey = options?.apiKey?.trim() || env("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY or pass a user key.",
      );
    }
    const model = options?.model?.trim() || env("OPENAI_MODEL") || "gpt-4.1-mini";
    return new OpenAIClient(apiKey, model);
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const messages: Array<{ role: string; content: string }> = [];
    if (params.systemInstruction) {
      messages.push({ role: "system", content: params.systemInstruction });
    }
    messages.push({ role: "user", content: params.prompt });

    const body: Record<string, unknown> = {
      model: params.model ?? this.defaultModel,
      messages,
    };
    if (params.temperature !== undefined) {
      body.temperature = params.temperature;
    }
    if (params.maxOutputTokens !== undefined) {
      body.max_tokens = params.maxOutputTokens;
    }
    if (params.responseMimeType === "application/json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const err = new Error(`OpenAI API error (${response.status}): ${errText.slice(0, 400)}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }

    const data = (await response.json()) as OpenAIChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content ?? "";
    const promptTokens = data.usage?.prompt_tokens;
    const outputTokens = data.usage?.completion_tokens;

    return {
      text,
      usage:
        promptTokens != null || outputTokens != null
          ? {
              promptTokens,
              outputTokens,
              totalTokens: data.usage?.total_tokens ?? (promptTokens ?? 0) + (outputTokens ?? 0),
            }
          : undefined,
    };
  }
}
