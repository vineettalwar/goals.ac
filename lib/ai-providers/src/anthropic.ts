import type { AiProviderClient, GenerateParams, GenerateResult } from "./client";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

interface AnthropicMessageResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  stop_reason?: string;
}

export function isAnthropicUserKeyError(err: unknown): boolean {
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
    msg.includes("invalid x-api-key") ||
    msg.includes("authentication") ||
    msg.includes("quota") ||
    msg.includes("rate limit")
  );
}

export class AnthropicClient implements AiProviderClient {
  id = "anthropic" as const;

  constructor(
    private apiKey: string,
    private defaultModel: string,
  ) {}

  static create(options?: { apiKey?: string | null; model?: string | null }): AnthropicClient {
    const apiKey = options?.apiKey?.trim() || env("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error(
        "Anthropic API key not configured. Set ANTHROPIC_API_KEY or pass a user key.",
      );
    }
    const model = options?.model?.trim() || env("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";
    return new AnthropicClient(apiKey, model);
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const body: Record<string, unknown> = {
      model: params.model ?? this.defaultModel,
      max_tokens: params.maxOutputTokens ?? 8192,
      messages: [{ role: "user", content: params.prompt }],
    };
    if (params.systemInstruction) {
      body.system = params.systemInstruction;
    }
    if (params.temperature !== undefined) {
      body.temperature = params.temperature;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const err = new Error(`Anthropic API error (${response.status}): ${errText.slice(0, 400)}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }

    const data = (await response.json()) as AnthropicMessageResponse;
    if (data.stop_reason === "refusal") {
      throw new Error("Anthropic refused this request — adjust the prompt and try again.");
    }

    const text =
      data.content
        ?.filter((block) => block.type === "text" && block.text)
        .map((block) => block.text)
        .join("") ?? "";

    const promptTokens = data.usage?.input_tokens;
    const outputTokens = data.usage?.output_tokens;

    return {
      text,
      usage:
        promptTokens != null || outputTokens != null
          ? {
              promptTokens,
              outputTokens,
              totalTokens: (promptTokens ?? 0) + (outputTokens ?? 0),
            }
          : undefined,
    };
  }
}
