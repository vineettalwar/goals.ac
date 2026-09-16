import type { AiProviderClient, GenerateParams, GenerateResult } from "./client";
import type { BedrockCredentialOptions } from "./config";
import {
  FALLBACK_BEDROCK_MODEL,
  defaultBedrockModelId,
  toBedrockModelChoices,
  type BedrockModelChoice,
} from "./bedrock-models";

export const DEFAULT_BEDROCK_REGION = "us-east-1";

/** @deprecated No hardcoded model — set BEDROCK_MODEL, platform/org model, or pass model per request. */
export const DEFAULT_BEDROCK_MODEL = "";

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

type ResolvedBedrockAuth =
  | {
      mode: "bearer";
      apiKey: string;
      region: string;
      model?: string;
    }
  | {
      mode: "iam";
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
      region: string;
      model?: string;
    };

function resolveRegion(explicit?: string | null): string {
  return (
    explicit?.trim() ||
    env("AWS_REGION") ||
    env("AWS_DEFAULT_REGION") ||
    DEFAULT_BEDROCK_REGION
  );
}

/** Configured model only — never a hardcoded EOL id. */
export function resolveModel(explicit?: string | null): string | undefined {
  return explicit?.trim() || env("BEDROCK_MODEL") || undefined;
}

/** Map AWS Bedrock auth failures to copy that won't be confused with app login. */
export function formatBedrockAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("session has expired") ||
    lower.includes("please reauthenticate") ||
    lower.includes("expiredtoken") ||
    lower.includes("token has expired")
  ) {
    return (
      "AWS Bedrock authentication failed (not your goals.ac login). " +
      "Use a long-term Bedrock API key from the Bedrock console, or clear expired AWS CLI/SSO credentials on this machine."
    );
  }
  if (lower.includes("end of its life") || lower.includes("end of life")) {
    return (
      "Configured Bedrock model is retired. Set BEDROCK_MODEL (or platform/org model) to a current model id from the Bedrock console."
    );
  }
  if (lower.includes("marked by provider as legacy") || lower.includes("legacy and you have not been actively using")) {
    return (
      "Configured Bedrock model is marked Legacy for this account. " +
      "Pick a current model in Settings (Amazon Nova Lite/Pro work well for content generation)."
    );
  }
  if (lower.includes("unknownoperation") || lower.includes("unknown operation")) {
    return (
      "Bedrock rejected this API call (unsupported operation for this endpoint/key). " +
      "Set BEDROCK_MODEL to a model id from the console, then Test again."
    );
  }
  return msg;
}

/**
 * Prefer Bedrock API key (bearer). Fall back to IAM access keys.
 * Secret-only stored credentials are treated as an API key (no schema migration).
 */
export function resolveBedrockAuth(
  credentials?: BedrockCredentialOptions | null,
): ResolvedBedrockAuth | null {
  const region = resolveRegion(credentials?.region);
  const model = resolveModel(credentials?.model);

  const apiKey = credentials?.apiKey?.trim() || undefined;
  if (apiKey) {
    return { mode: "bearer", apiKey, region, model };
  }

  const accessKeyId = credentials?.accessKeyId?.trim() || undefined;
  const secretAccessKey = credentials?.secretAccessKey?.trim() || undefined;
  if (secretAccessKey && !accessKeyId) {
    return { mode: "bearer", apiKey: secretAccessKey, region, model };
  }
  if (accessKeyId && secretAccessKey) {
    return {
      mode: "iam",
      accessKeyId,
      secretAccessKey,
      sessionToken: credentials?.sessionToken?.trim() || undefined,
      region,
      model,
    };
  }

  const envBearer = env("AWS_BEARER_TOKEN_BEDROCK");
  if (envBearer) {
    return { mode: "bearer", apiKey: envBearer, region, model };
  }

  const envAccessKeyId = env("AWS_ACCESS_KEY_ID");
  const envSecretAccessKey = env("AWS_SECRET_ACCESS_KEY");
  if (envAccessKeyId && envSecretAccessKey) {
    return {
      mode: "iam",
      accessKeyId: envAccessKeyId,
      secretAccessKey: envSecretAccessKey,
      sessionToken: env("AWS_SESSION_TOKEN"),
      region,
      model,
    };
  }

  return null;
}

function awsErrorMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as {
      message?: string;
      Message?: string;
      __type?: string;
    };
    const msg = parsed.message || parsed.Message;
    if (msg) return msg;
    if (parsed.__type?.includes("UnknownOperation")) {
      return "UnknownOperationException";
    }
    return `Bedrock request failed (${status})`;
  } catch {
    return body.trim() || `Bedrock request failed (${status})`;
  }
}

async function fetchJson(
  url: string,
  headers: Record<string, string>,
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: awsErrorMessage(text, res.status) };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "Invalid JSON from Bedrock" };
  }
}

function modelIdsFromFoundationList(body: unknown): string[] {
  const summaries = (body as { modelSummaries?: Array<{ modelId?: string; modelLifecycle?: { status?: string } }> })
    .modelSummaries;
  return (summaries ?? [])
    .filter((m) => m.modelLifecycle?.status !== "LEGACY")
    .map((m) => m.modelId?.trim())
    .filter((id): id is string => Boolean(id));
}

function modelIdsFromOpenAiList(body: unknown): string[] {
  const data = (body as { data?: Array<{ id?: string }> }).data;
  return (data ?? []).map((m) => m.id?.trim()).filter((id): id is string => Boolean(id));
}

function modelIdsFromInferenceProfiles(body: unknown): string[] {
  const summaries = (body as {
    inferenceProfileSummaries?: Array<{ inferenceProfileId?: string; inferenceProfileArn?: string }>;
  }).inferenceProfileSummaries;
  return (summaries ?? [])
    .map((s) => s.inferenceProfileId?.trim() || s.inferenceProfileArn?.trim())
    .filter((id): id is string => Boolean(id));
}

function modelIdsFromMarketplaceEndpoints(body: unknown): string[] {
  const endpoints = (body as {
    marketplaceModelEndpoints?: Array<{ endpointArn?: string }>;
  }).marketplaceModelEndpoints;
  return (endpoints ?? [])
    .map((e) => e.endpointArn?.trim())
    .filter((id): id is string => Boolean(id));
}

/** Merge every catalog that answers — first-wins hid Claude/GPT/DeepSeek behind Amazon-only OpenAI lists. */
async function mergeListedModelIds(
  attempts: Array<{ url: string; parse: (body: unknown) => string[] }>,
  headers: Record<string, string>,
): Promise<string[]> {
  const seen = new Set<string>();
  const ids: string[] = [];
  let lastError = "No Bedrock models listed for this API key.";
  for (const attempt of attempts) {
    const result = await fetchJson(attempt.url, headers);
    if (!result.ok) {
      lastError = result.error;
      continue;
    }
    for (const id of attempt.parse(result.body)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  if (ids.length === 0) throw new Error(lastError);
  return ids;
}

/** List model ids available to these credentials (no hardcoded default). */
export async function listBedrockModelIds(
  credentials?: BedrockCredentialOptions | null,
): Promise<string[]> {
  const auth = resolveBedrockAuth(credentials);
  if (!auth) throw new Error("No Bedrock credentials configured");

  if (auth.mode === "bearer") {
    const headers = {
      Authorization: `Bearer ${auth.apiKey}`,
      Accept: "application/json",
    };
    // Merge catalogs: OpenAI-compat is Amazon-heavy; Claude/GPT/DeepSeek live on
    // inference profiles + foundation models (marketplace is not ON_DEMAND-only).
    return mergeListedModelIds(
      [
        {
          url: `https://bedrock-runtime.${auth.region}.amazonaws.com/openai/v1/models`,
          parse: modelIdsFromOpenAiList,
        },
        {
          url: `https://bedrock.${auth.region}.amazonaws.com/inference-profiles?maxResults=1000`,
          parse: modelIdsFromInferenceProfiles,
        },
        {
          url: `https://bedrock.${auth.region}.amazonaws.com/foundation-models?byOutputModality=TEXT`,
          parse: modelIdsFromFoundationList,
        },
        {
          url: `https://bedrock.${auth.region}.amazonaws.com/marketplace-model-endpoints?maxResults=1000`,
          parse: modelIdsFromMarketplaceEndpoints,
        },
        {
          url: `https://bedrock-mantle.${auth.region}.api.aws/v1/models`,
          parse: modelIdsFromOpenAiList,
        },
      ],
      headers,
    );
  }

  if (auth.model) return [auth.model];
  throw new Error("Set BEDROCK_MODEL (or platform/org model) when using IAM access keys.");
}

/** Chat/text models available to these credentials, labeled for Settings pickers. */
export async function listBedrockChatModels(
  credentials?: BedrockCredentialOptions | null,
): Promise<BedrockModelChoice[]> {
  const ids = await listBedrockModelIds(credentials);
  return toBedrockModelChoices(ids);
}

/** Pick a chat model from the account list, then Nova Lite if listing fails. */
export async function resolveBedrockModelId(
  credentials?: BedrockCredentialOptions | null,
  override?: string | null,
): Promise<string> {
  const configured = override?.trim() || resolveModel(credentials?.model);
  if (configured) return configured;
  try {
    return defaultBedrockModelId(await listBedrockChatModels(credentials));
  } catch {
    return FALLBACK_BEDROCK_MODEL;
  }
}

/** Validate credentials with Converse on the resolved account model. */
export async function testBedrockCredentials(
  credentials?: BedrockCredentialOptions | null,
): Promise<void> {
  const client = await BedrockClient.create(credentials);
  await client.generate({
    prompt: "Reply with the single word: ok",
    maxOutputTokens: 16,
    model: await resolveBedrockModelId(credentials),
  });
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
      "AWS Bedrock SDK not installed. Run: pnpm add -D @aws-sdk/client-bedrock-runtime",
    );
  }
}

export class BedrockClient implements AiProviderClient {
  id = "bedrock" as const;

  private runtime: typeof import("@aws-sdk/client-bedrock-runtime");
  private client: InstanceType<typeof import("@aws-sdk/client-bedrock-runtime").BedrockRuntimeClient>;
  private credentials: BedrockCredentialOptions | null | undefined;
  private defaultModel: string | undefined;
  private resolvedModelId: string | undefined;

  constructor(
    runtime: typeof import("@aws-sdk/client-bedrock-runtime"),
    client: InstanceType<typeof import("@aws-sdk/client-bedrock-runtime").BedrockRuntimeClient>,
    defaultModel: string | undefined,
    credentials?: BedrockCredentialOptions | null,
  ) {
    this.runtime = runtime;
    this.client = client;
    this.defaultModel = defaultModel;
    this.credentials = credentials;
  }

  static async create(credentials?: BedrockCredentialOptions | null): Promise<BedrockClient> {
    const runtime = await loadBedrockModules();
    const resolved = resolveBedrockAuth(credentials);
    const region = resolved?.region ?? resolveRegion(credentials?.region);
    const model = resolved?.model ?? resolveModel(credentials?.model);

    const clientConfig: ConstructorParameters<typeof runtime.BedrockRuntimeClient>[0] = { region };

    if (resolved?.mode === "bearer") {
      // Without authSchemePreference the SDK picks SigV4 first and ignores `token`,
      // then fails on ambient/expired AWS credentials ("session has expired").
      clientConfig.token = { token: resolved.apiKey };
      clientConfig.authSchemePreference = ["httpBearerAuth"];
    } else if (resolved?.mode === "iam") {
      clientConfig.credentials = {
        accessKeyId: resolved.accessKeyId,
        secretAccessKey: resolved.secretAccessKey,
        ...(resolved.sessionToken ? { sessionToken: resolved.sessionToken } : {}),
      };
    } else {
      const profile = env("AWS_PROFILE");
      if (profile) {
        clientConfig.profile = profile;
      }
    }

    const client = new runtime.BedrockRuntimeClient(clientConfig);
    return new BedrockClient(runtime, client, model, credentials);
  }

  private async modelId(override?: string): Promise<string> {
    if (override?.trim()) return override.trim();
    if (this.defaultModel) return this.defaultModel;
    if (this.resolvedModelId) return this.resolvedModelId;
    this.resolvedModelId = await resolveBedrockModelId(this.credentials, override);
    return this.resolvedModelId;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const command = new this.runtime.ConverseCommand({
      modelId: await this.modelId(params.model),
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
      modelId: await this.modelId(params.model),
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
