import { aiProviderUnavailableMessage } from "../studio/studio-hub-utils";

export type ChatAiProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "nvidia"
  | "bedrock"
  | "ollama";

export type ChatAiOption = {
  id: ChatAiProviderId;
  label: string;
  model: string | null;
  modelEditable: boolean;
};

export type ChatAiStatus = {
  ready: boolean;
  activeProvider: ChatAiProviderId;
  modelLabel: string;
  detail?: string;
  options: ChatAiOption[];
  ollamaBaseUrl: string | null;
};

export type AiStatusPayload = {
  ready?: boolean;
  activeProvider?: string;
  settings?: {
    ollamaBaseUrl?: string | null;
    ollamaModel?: string | null;
    openrouterModel?: string | null;
    nvidiaModel?: string | null;
  };
  gemini?: { configured?: boolean };
  openai?: { configured?: boolean };
  anthropic?: { configured?: boolean };
  openrouter?: { configured?: boolean; model?: string | null };
  groq?: { configured?: boolean };
  nvidia?: { configured?: boolean; model?: string | null };
  bedrock?: { configured?: boolean; model?: string | null };
  ollama?: { model?: string | null; reachable?: boolean; baseUrl?: string | null };
};

const PROVIDER_META: Array<{
  id: ChatAiProviderId;
  label: string;
  modelEditable: boolean;
}> = [
  { id: "gemini", label: "Gemini", modelEditable: false },
  { id: "openai", label: "OpenAI", modelEditable: false },
  { id: "anthropic", label: "Anthropic", modelEditable: false },
  { id: "openrouter", label: "OpenRouter", modelEditable: true },
  { id: "groq", label: "Groq", modelEditable: false },
  { id: "nvidia", label: "NVIDIA", modelEditable: true },
  { id: "bedrock", label: "Bedrock", modelEditable: false },
  { id: "ollama", label: "Ollama", modelEditable: true },
];

function asProviderId(value: string | undefined): ChatAiProviderId {
  return PROVIDER_META.some((row) => row.id === value) ? (value as ChatAiProviderId) : "gemini";
}

function isConnected(id: ChatAiProviderId, data: AiStatusPayload): boolean {
  switch (id) {
    case "gemini":
      return Boolean(data.gemini?.configured);
    case "openai":
      return Boolean(data.openai?.configured);
    case "anthropic":
      return Boolean(data.anthropic?.configured);
    case "openrouter":
      return Boolean(data.openrouter?.configured);
    case "groq":
      return Boolean(data.groq?.configured);
    case "nvidia":
      return Boolean(data.nvidia?.configured);
    case "bedrock":
      return Boolean(data.bedrock?.configured);
    case "ollama":
      return Boolean(data.ollama?.reachable);
    default:
      return false;
  }
}

function modelFor(id: ChatAiProviderId, data: AiStatusPayload): string | null {
  switch (id) {
    case "ollama":
      return data.settings?.ollamaModel || data.ollama?.model || null;
    case "openrouter":
      return data.settings?.openrouterModel || data.openrouter?.model || null;
    case "nvidia":
      return data.settings?.nvidiaModel || data.nvidia?.model || null;
    case "bedrock":
      return data.bedrock?.model || null;
    default:
      return null;
  }
}

export function parseChatAiStatus(data: AiStatusPayload | null | undefined): ChatAiStatus | null {
  if (!data || typeof data.activeProvider !== "string") return null;
  const provider = asProviderId(data.activeProvider);
  const model = modelFor(provider, data);
  const ready = data.ready === true;
  const options = PROVIDER_META.filter((row) => isConnected(row.id, data)).map((row) => ({
    id: row.id,
    label: row.label,
    model: modelFor(row.id, data),
    modelEditable: row.modelEditable,
  }));
  // Keep the active provider visible even when not connected so the picker can show the bad state.
  if (!options.some((row) => row.id === provider)) {
    const meta = PROVIDER_META.find((row) => row.id === provider)!;
    options.unshift({
      id: provider,
      label: meta.label,
      model,
      modelEditable: meta.modelEditable,
    });
  }
  return {
    ready,
    activeProvider: provider,
    modelLabel: model ? `${provider} · ${model}` : provider,
    detail: ready ? undefined : aiProviderUnavailableMessage(provider),
    options,
    ollamaBaseUrl: data.settings?.ollamaBaseUrl || data.ollama?.baseUrl || null,
  };
}

export async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return typeof data?.error === "string" && data.error.trim() ? data.error : fallback;
}

export function providerPatchBody(input: {
  provider: ChatAiProviderId;
  model?: string | null;
  ollamaBaseUrl?: string | null;
}): Record<string, string | null> {
  const model = input.model?.trim() || null;
  return {
    provider: input.provider,
    ollamaBaseUrl: input.provider === "ollama" ? input.ollamaBaseUrl?.trim() || null : null,
    ollamaModel: input.provider === "ollama" ? model : null,
    openrouterModel: input.provider === "openrouter" ? model : null,
    nvidiaModel: input.provider === "nvidia" ? model : null,
  };
}
