import { db } from "@workspace/db";
import { usageEventsTable } from "@workspace/db/schema";

const INPUT_COST_PER_TOKEN = 0.3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.5 / 1_000_000;

export function estimateGenerationCostUsd(promptTokens: number, outputTokens: number): number {
  return promptTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}

export interface RecordUsageEventInput {
  userId: number;
  companyId?: number | null;
  eventType: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  usedByok: boolean;
  provider?: string;
  model?: string;
  tier?: string;
}

export async function recordUsageEvent(input: RecordUsageEventInput): Promise<number> {
  const promptTokens = input.promptTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? promptTokens + outputTokens;
  const estimatedCostUsd =
    input.estimatedCostUsd ?? estimateGenerationCostUsd(promptTokens, outputTokens);

  const [row] = await db
    .insert(usageEventsTable)
    .values({
      userId: input.userId,
      companyId: input.companyId ?? null,
      eventType: input.eventType,
      promptTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: estimatedCostUsd.toFixed(6),
      usedByok: input.usedByok,
      provider: input.provider ?? null,
      model: input.model ?? null,
      tier: input.tier ?? null,
    })
    .returning({ id: usageEventsTable.id });

  return row!.id;
}
