/**
 * Agent tiers — pipeline stages request a tier, never a model string.
 * The tier→model mapping per provider is the single place model choices live,
 * which is what lets BYOK work across providers (see docs/architecture-roadmap.md §8).
 */
export type AgentTier = "strategy" | "planning" | "execution" | "rapid";

export type ProviderId = "gemini" | "anthropic";

export const TIER_MODELS: Record<ProviderId, Record<AgentTier, string>> = {
  gemini: {
    strategy: "gemini-2.5-pro",
    planning: "gemini-2.5-pro",
    execution: "gemini-2.5-flash",
    rapid: "gemini-2.5-flash-lite",
  },
  anthropic: {
    strategy: "claude-fable-5",
    planning: "claude-opus-4-8",
    execution: "claude-sonnet-5",
    rapid: "claude-haiku-4-5",
  },
};

export function modelForTier(provider: ProviderId, tier: AgentTier): string {
  return TIER_MODELS[provider][tier];
}
