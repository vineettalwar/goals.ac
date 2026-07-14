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
      throw new Error(`Anthropic API error (${response.status}): ${errText.slice(0, 400)}`);
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
