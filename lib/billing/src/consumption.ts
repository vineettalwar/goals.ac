import {
  estimateAiCallCredits,
  type AiTier,
} from "./pricing";
import {
  releaseReservation,
  reserveCredits,
  settleReservationLines,
  type SettlementLine,
} from "./ledger";

export type { AiTier };

export interface ReserveAiCallInput {
  workspaceId: number;
  runId: string;
  tier: AiTier;
  usedByok: boolean;
  meta?: Record<string, unknown>;
}

export type ReserveAiCallResult =
  | { ok: true; estimatedCredits: number }
  | { ok: false; reason: "insufficient_credits" };

export async function reserveAiCall(input: ReserveAiCallInput): Promise<ReserveAiCallResult> {
  const estimate = estimateAiCallCredits({ tier: input.tier, usedByok: input.usedByok });
  if (estimate.total <= 0) {
    return { ok: true, estimatedCredits: 0 };
  }

  const result = await reserveCredits({
    workspaceId: input.workspaceId,
    runId: input.runId,
    amount: estimate.total,
    meta: {
      ...input.meta,
      tier: input.tier,
      usedByok: input.usedByok,
      estimatedCredits: estimate,
    },
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, estimatedCredits: estimate.total };
}

export interface SettleAiCallInput {
  runId: string;
  tier: AiTier;
  usedByok: boolean;
  usageEventId?: number;
}

export async function settleAiCall(input: SettleAiCallInput): Promise<void> {
  const estimate = estimateAiCallCredits({ tier: input.tier, usedByok: input.usedByok });
  const lines: SettlementLine[] = [];

  if (!input.usedByok && estimate.modelCredits > 0) {
    lines.push({ entryType: "model_consumption", actualAmount: estimate.modelCredits });
  }
  if (estimate.orchestrationCredits > 0) {
    lines.push({ entryType: "orchestration", actualAmount: estimate.orchestrationCredits });
  }

  if (lines.length === 0) return;

  await settleReservationLines({
    runId: input.runId,
    lines,
    usageEventId: input.usageEventId,
  });
}

export interface ReleaseAiCallInput {
  runId: string;
  reason?: string;
}

export async function releaseAiCall(input: ReleaseAiCallInput): Promise<void> {
  await releaseReservation({ runId: input.runId, reason: input.reason });
}
