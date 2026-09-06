import { describe, expect, it } from "vitest";
import {
  getMonthlyCreditsForPlan,
  getSuggestedUpgradePlan,
  isOfferedPlan,
  OFFERED_PLAN_IDS,
  PLAN_DISPLAY_PRICES,
  PLAN_MONTHLY_CREDITS,
} from "./plans";

describe("PLAN_MONTHLY_CREDITS", () => {
  it("grants Growth subscribers platform credits on renewal", () => {
    expect(PLAN_MONTHLY_CREDITS.growth).toBe(500);
    expect(getMonthlyCreditsForPlan("growth")).toBe(500);
  });

  it("does not grant Starter credits", () => {
    expect(getMonthlyCreditsForPlan("starter")).toBeNull();
  });

  it("grants Scale 5000 credits on renewal", () => {
    expect(PLAN_MONTHLY_CREDITS.scale).toBe(5000);
    expect(getMonthlyCreditsForPlan("scale")).toBe(5000);
  });
});

describe("OFFERED_PLAN_IDS", () => {
  it("includes scale as an offered plan", () => {
    expect(OFFERED_PLAN_IDS).toContain("scale");
    expect(isOfferedPlan("scale")).toBe(true);
    expect(isOfferedPlan("growth")).toBe(true);
    expect(isOfferedPlan("starter")).toBe(true);
  });
});

describe("PLAN_DISPLAY_PRICES", () => {
  it("shows €500/mo for Scale", () => {
    expect(PLAN_DISPLAY_PRICES.scale).toBe("€500/mo");
  });
});

describe("getSuggestedUpgradePlan", () => {
  it("suggests Growth for Starter", () => {
    expect(getSuggestedUpgradePlan("starter")).toBe("growth");
  });

  it("suggests Scale for Growth", () => {
    expect(getSuggestedUpgradePlan("growth")).toBe("scale");
  });

  it("returns null for Scale (already top tier)", () => {
    expect(getSuggestedUpgradePlan("scale")).toBeNull();
  });
});
