export type AiTier = "strategy" | "planning" | "execution" | "rapid";

export const TIER_CREDIT_COSTS: Record<AiTier, number> = {
  strategy: 15,
  planning: 8,
  execution: 5,
  rapid: 1,
};

export const ORCHESTRATION_CREDITS = {
  platform: 2,
  byok: 1,
} as const;

export interface AiCallCreditEstimate {
  modelCredits: number;
  orchestrationCredits: number;
  total: number;
}

export function estimateAiCallCredits(input: {
  tier: AiTier;
  usedByok: boolean;
}): AiCallCreditEstimate {
  const orchestrationCredits = input.usedByok
    ? ORCHESTRATION_CREDITS.byok
    : ORCHESTRATION_CREDITS.platform;
  const modelCredits = input.usedByok ? 0 : (TIER_CREDIT_COSTS[input.tier] ?? TIER_CREDIT_COSTS.execution);
  return {
    modelCredits,
    orchestrationCredits,
    total: modelCredits + orchestrationCredits,
  };
}
