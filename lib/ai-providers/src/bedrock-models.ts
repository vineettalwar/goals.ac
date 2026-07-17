/** Selectable Bedrock model ids for admin/org BYOK UI. Not used as a silent default. */
export const BEDROCK_MODEL_CHOICES = [
  {
    id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    label: "Claude Sonnet 4",
  },
  {
    id: "us.anthropic.claude-opus-4-20250514-v1:0",
    label: "Claude Opus 4",
  },
  {
    id: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    label: "Claude 3.7 Sonnet",
  },
  {
    id: "us.amazon.nova-lite-v1:0",
    label: "Amazon Nova Lite",
  },
  {
    id: "us.amazon.nova-pro-v1:0",
    label: "Amazon Nova Pro",
  },
] as const;

export type BedrockModelChoiceId = (typeof BEDROCK_MODEL_CHOICES)[number]["id"];

export const BEDROCK_MODEL_CUSTOM = "__custom__";

export function bedrockModelChoiceLabel(modelId: string | null | undefined): string | null {
  if (!modelId) return null;
  const match = BEDROCK_MODEL_CHOICES.find((c) => c.id === modelId);
  return match?.label ?? modelId;
}
