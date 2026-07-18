/** Friendly labels for common Bedrock model ids. Unknown ids show as-is. */
const BEDROCK_MODEL_LABELS: Record<string, string> = {
  "amazon.nova-lite-v1:0": "Amazon Nova Lite",
  "amazon.nova-pro-v1:0": "Amazon Nova Pro",
  "amazon.nova-micro-v1:0": "Amazon Nova Micro",
  "amazon.nova-premier-v1:0": "Amazon Nova Premier",
  "us.amazon.nova-lite-v1:0": "Amazon Nova Lite",
  "us.amazon.nova-pro-v1:0": "Amazon Nova Pro",
  "us.amazon.nova-micro-v1:0": "Amazon Nova Micro",
  "anthropic.claude-sonnet-4-20250514-v1:0": "Claude Sonnet 4",
  "anthropic.claude-opus-4-20250514-v1:0": "Claude Opus 4",
  "anthropic.claude-3-7-sonnet-20250219-v1:0": "Claude 3.7 Sonnet",
  "us.anthropic.claude-sonnet-4-20250514-v1:0": "Claude Sonnet 4",
  "us.anthropic.claude-opus-4-20250514-v1:0": "Claude Opus 4",
  "us.anthropic.claude-3-7-sonnet-20250219-v1:0": "Claude 3.7 Sonnet",
  "meta.llama3-70b-instruct-v1:0": "Llama 3 70B",
  "meta.llama3-8b-instruct-v1:0": "Llama 3 8B",
  "mistral.mistral-large-2402-v1:0": "Mistral Large",
  "mistral.mistral-large-3-675b-instruct": "Mistral Large 3",
  "mistral.mistral-small-2402-v1:0": "Mistral Small",
  "openai.gpt-oss-120b-1:0": "GPT-OSS 120B",
  "openai.gpt-oss-20b-1:0": "GPT-OSS 20B",
  "deepseek.v3.2": "DeepSeek V3.2",
};

/** @deprecated Prefer account-listed models from listBedrockChatModels. Kept for label fallbacks. */
export const BEDROCK_MODEL_CHOICES = [
  { id: "amazon.nova-lite-v1:0", label: "Amazon Nova Lite" },
  { id: "amazon.nova-pro-v1:0", label: "Amazon Nova Pro" },
  { id: "amazon.nova-micro-v1:0", label: "Amazon Nova Micro" },
  { id: "meta.llama3-70b-instruct-v1:0", label: "Llama 3 70B" },
  { id: "mistral.mistral-large-2402-v1:0", label: "Mistral Large" },
  { id: "openai.gpt-oss-120b-1:0", label: "GPT-OSS 120B" },
  { id: "deepseek.v3.2", label: "DeepSeek V3.2" },
] as const;

export type BedrockModelChoiceId = (typeof BEDROCK_MODEL_CHOICES)[number]["id"];

export const BEDROCK_MODEL_CUSTOM = "__custom__";

export type BedrockModelChoice = { id: string; label: string };

export function bedrockModelChoiceLabel(modelId: string | null | undefined): string | null {
  if (!modelId) return null;
  return BEDROCK_MODEL_LABELS[modelId] ?? modelId;
}

/** Drop non-chat / specialty models from a foundation-model list. */
export function filterBedrockChatModelIds(ids: string[]): string[] {
  return ids.filter((id) => {
    const lower = id.toLowerCase();
    if (!id.trim()) return false;
    if (/(embed|image|tts|asr|sonic|whisper|rerank|safeguard)/.test(lower)) return false;
    return true;
  });
}

/** Prefer known studio-capable families, then alphabetical. */
export function sortBedrockChatModelIds(ids: string[]): string[] {
  const rank = (id: string): number => {
    const lower = id.toLowerCase();
    if (lower.includes("nova-pro")) return 0;
    if (lower.includes("nova-lite")) return 1;
    if (lower.includes("nova-micro")) return 2;
    if (lower.includes("nova")) return 3;
    if (lower.includes("claude")) return 4;
    if (lower.includes("llama3-70b") || lower.includes("llama-3-70")) return 5;
    if (lower.includes("mistral-large")) return 6;
    if (lower.includes("gpt-oss-120")) return 7;
    if (lower.includes("deepseek")) return 8;
    return 50;
  };
  return [...ids].sort((a, b) => {
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

export function toBedrockModelChoices(ids: string[]): BedrockModelChoice[] {
  return sortBedrockChatModelIds(filterBedrockChatModelIds(ids)).map((id) => ({
    id,
    label: bedrockModelChoiceLabel(id) ?? id,
  }));
}
