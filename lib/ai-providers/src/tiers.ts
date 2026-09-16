/**
 * Agent tiers — pipeline stages request a tier, never a model string.
 * The tier→model mapping per provider is the single place model choices live,
 * which is what lets BYOK work across providers (see docs/architecture-roadmap.md §8).
 */
import type { AiProviderId } from "./config";

export type AgentTier = "strategy" | "planning" | "execution" | "rapid";

export type ProviderId = "gemini" | "anthropic" | "openai" | "openrouter" | "groq" | "nvidia";

export const TIER_MODELS: Record<ProviderId, Record<AgentTier, string>> = {
  gemini: {
    strategy: "gemini-2.5-pro",
    planning: "gemini-2.5-pro",
    execution: "gemini-2.5-flash",
    rapid: "gemini-2.5-flash-lite",
  },
  anthropic: {
    strategy: "claude-opus-4-20250514",
    planning: "claude-sonnet-4-20250514",
    execution: "claude-sonnet-4-20250514",
    rapid: "claude-3-5-haiku-20241022",
  },
  openai: {
    strategy: "gpt-4.1",
    planning: "gpt-4.1",
    execution: "gpt-4.1-mini",
    rapid: "gpt-4.1-nano",
  },
  openrouter: {
    strategy: "openai/gpt-4.1",
    planning: "openai/gpt-4.1",
    execution: "openai/gpt-4.1-mini",
    rapid: "openai/gpt-4.1-nano",
  },
  groq: {
    strategy: "openai/gpt-oss-120b",
    planning: "openai/gpt-oss-120b",
    execution: "openai/gpt-oss-20b",
    rapid: "openai/gpt-oss-20b",
  },
  nvidia: {
    strategy: "nvidia/nemotron-3-super-120b-a12b",
    planning: "nvidia/nemotron-3-super-120b-a12b",
    execution: "nvidia/nemotron-3.5-lightning-30b-a3b",
    rapid: "nvidia/nemotron-3.5-lightning-30b-a3b",
  },
};

export function modelForTier(provider: ProviderId, tier: AgentTier): string {
  return TIER_MODELS[provider][tier];
}

const TIER_PROVIDER_IDS = new Set<ProviderId>(["gemini", "anthropic", "openai", "openrouter", "groq", "nvidia"]);

export function modelForProviderTier(
  providerId: AiProviderId,
  tier: AgentTier,
): string | undefined {
  if (TIER_PROVIDER_IDS.has(providerId as ProviderId)) {
    return modelForTier(providerId as ProviderId, tier);
  }
  return undefined;
}
