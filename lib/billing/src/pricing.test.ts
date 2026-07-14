import { describe, expect, it } from "vitest";
import { estimateAiCallCredits, TIER_CREDIT_COSTS } from "./pricing";
import { normalizePlanId, DEFAULT_PLAN_QUOTA_LIMITS } from "./plans";

describe("estimateAiCallCredits", () => {
  it("charges model + orchestration on platform key", () => {
    const est = estimateAiCallCredits({ tier: "execution", usedByok: false });
    expect(est.modelCredits).toBe(TIER_CREDIT_COSTS.execution);
    expect(est.orchestrationCredits).toBe(2);
    expect(est.total).toBe(TIER_CREDIT_COSTS.execution + 2);
  });

  it("charges orchestration only for BYOK", () => {
    const est = estimateAiCallCredits({ tier: "strategy", usedByok: true });
    expect(est.modelCredits).toBe(0);
    expect(est.orchestrationCredits).toBe(1);
    expect(est.total).toBe(1);
  });
});

describe("normalizePlanId", () => {
  it("preserves known plan ids", () => {
    expect(normalizePlanId("growth")).toBe("growth");
    expect(normalizePlanId(null)).toBe("starter");
  });
});

describe("DEFAULT_PLAN_QUOTA_LIMITS", () => {
  it("limits starter platform-key generations", () => {
    expect(DEFAULT_PLAN_QUOTA_LIMITS.starter.articles).toBe(5);
  });
});
