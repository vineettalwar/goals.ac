import { describe, expect, it } from "vitest";
import { modelForProviderTier, modelForTier, TIER_MODELS, type AgentTier, type ProviderId } from "./tiers";

describe("AI tier routing", () => {
  it.each(Object.keys(TIER_MODELS) as ProviderId[])(
    "defines every tier for %s",
    (provider) => {
      expect(Object.keys(TIER_MODELS[provider]).sort()).toEqual(
        ["execution", "planning", "rapid", "strategy"],
      );
    },
  );

  it("returns the configured provider model", () => {
    const tiers: AgentTier[] = ["strategy", "planning", "execution", "rapid"];
    for (const tier of tiers) {
      expect(modelForTier("gemini", tier)).toBe(TIER_MODELS.gemini[tier]);
      expect(modelForTier("anthropic", tier)).toBe(TIER_MODELS.anthropic[tier]);
      expect(modelForTier("openai", tier)).toBe(TIER_MODELS.openai[tier]);
    }
  });

  it("modelForProviderTier returns undefined for non-tier providers", () => {
    expect(modelForProviderTier("bedrock", "planning")).toBeUndefined();
    expect(modelForProviderTier("ollama", "planning")).toBeUndefined();
  });

  it("modelForProviderTier returns tier models for direct API providers", () => {
    expect(modelForProviderTier("openai", "execution")).toBe(TIER_MODELS.openai.execution);
    expect(modelForProviderTier("anthropic", "rapid")).toBe(TIER_MODELS.anthropic.rapid);
  });
});
