import type { AiProviderClient, GenerateParams, GenerateResult } from "./client.js";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

interface OllamaGenerateStreamLine {
  response?: string;
  done?: boolean;
}

export class OllamaClient implements AiProviderClient {
  id = "ollama" as const;

  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl: string, defaultModel: string) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  static create(): OllamaClient {
    const baseUrl = env("OLLAMA_BASE_URL") ?? "http://localhost:11434";
    const model = env("OLLAMA_MODEL") ?? "llama3.1";
    return new OllamaClient(baseUrl, model);
  }

  private buildBody(params: GenerateParams, stream: boolean): OllamaGenerateRequest {
    const body: OllamaGenerateRequest = {
      model: params.model ?? this.defaultModel,
      prompt: params.prompt,
      stream,
    };
    if (params.systemInstruction) {
      body.system = params.systemInstruction;
    }
    if (params.temperature !== undefined || params.maxOutputTokens !== undefined) {
      body.options = {};
      if (params.temperature !== undefined) body.options.temperature = params.temperature;
      if (params.maxOutputTokens !== undefined) body.options.num_predict = params.maxOutputTokens;
    }
    return body;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const resp = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(params, false)),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Ollama error ${resp.status}: ${text}`);
    }

    const data = (await resp.json()) as OllamaGenerateResponse;
    return { text: data.response ?? "" };
  }

  async *generateStream(params: GenerateParams): AsyncGenerator<string> {
    const resp = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(params, true)),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Ollama error ${resp.status}: ${text}`);
    }

    if (!resp.body) return;

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as OllamaGenerateStreamLine;
            if (parsed.response) yield parsed.response;
            if (parsed.done) return;
          } catch {
            // skip malformed lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer) as OllamaGenerateStreamLine;
          if (parsed.response) yield parsed.response;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
