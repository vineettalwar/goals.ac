import type { AiProviderClient, GenerateParams, GenerateResult } from "./client.js";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function buildMessages(params: GenerateParams) {
  return [{ role: "user" as const, content: [{ text: params.prompt }] }];
}

function buildSystem(params: GenerateParams) {
  if (!params.systemInstruction) return undefined;
  return [{ text: params.systemInstruction }];
}

function inferenceConfig(params: GenerateParams) {
  const cfg: Record<string, unknown> = {};
  if (params.temperature !== undefined) cfg.temperature = params.temperature;
  if (params.maxOutputTokens !== undefined) cfg.maxTokens = params.maxOutputTokens;
  if (params.responseMimeType === "application/json") {
    cfg.responseFormat = { type: "json" };
  }
  return Object.keys(cfg).length > 0 ? cfg : undefined;
}

async function loadBedrockModules() {
  try {
    const runtime = await import("@aws-sdk/client-bedrock-runtime");
    return runtime;
  } catch {
    throw new Error(
      "AWS Bedrock SDK not installed. Run: pnpm add -D @aws-sdk/client-bedrock-runtime"
    );
  }
}

export class BedrockClient implements AiProviderClient {
  id = "bedrock" as const;

  private runtime: typeof import("@aws-sdk/client-bedrock-runtime");
  private client: InstanceType<typeof import("@aws-sdk/client-bedrock-runtime").BedrockRuntimeClient>;
  private defaultModel: string;

  constructor(
    runtime: typeof import("@aws-sdk/client-bedrock-runtime"),
    client: InstanceType<typeof import("@aws-sdk/client-bedrock-runtime").BedrockRuntimeClient>,
    defaultModel: string,
  ) {
    this.runtime = runtime;
    this.client = client;
    this.defaultModel = defaultModel;
  }

  static async create(): Promise<BedrockClient> {
    const runtime = await loadBedrockModules();
    const region = env("AWS_REGION") ?? env("AWS_DEFAULT_REGION") ?? "us-east-1";
    const accessKeyId = env("AWS_ACCESS_KEY_ID");
    const secretAccessKey = env("AWS_SECRET_ACCESS_KEY");
    const sessionToken = env("AWS_SESSION_TOKEN");
    const profile = env("AWS_PROFILE");

    const clientConfig: ConstructorParameters<typeof runtime.BedrockRuntimeClient>[0] = { region };
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      };
    } else if (profile) {
      clientConfig.profile = profile;
    }

    const client = new runtime.BedrockRuntimeClient(clientConfig);
    const model = env("BEDROCK_MODEL") ?? "anthropic.claude-3-5-haiku-20241022-v1:0";
    return new BedrockClient(runtime, client, model);
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const command = new this.runtime.ConverseCommand({
      modelId: params.model ?? this.defaultModel,
      messages: buildMessages(params),
      system: buildSystem(params),
      inferenceConfig: inferenceConfig(params) as never,
    });

    const response = await this.client.send(command);
    const output = response.output;
    if (!output || !("message" in output) || !output.message?.content) {
      throw new Error("Empty response from Bedrock");
    }
    const textBlocks = output.message.content.filter((b): b is { text: string } => "text" in b);
    return { text: textBlocks.map((b) => b.text).join("") };
  }

  async *generateStream(params: GenerateParams): AsyncGenerator<string> {
    const command = new this.runtime.ConverseStreamCommand({
      modelId: params.model ?? this.defaultModel,
      messages: buildMessages(params),
      system: buildSystem(params),
      inferenceConfig: inferenceConfig(params) as never,
    });

    const response = await this.client.send(command);
    if (!response.stream) return;

    for await (const event of response.stream) {
      const delta = event.contentBlockDelta?.delta;
      if (delta && "text" in delta && delta.text) {
        yield delta.text;
      }
    }
  }
}
