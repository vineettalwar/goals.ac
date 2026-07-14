import { describe, expect, it } from "vitest";
import { getMonthlyCreditsForPlan, PLAN_MONTHLY_CREDITS } from "./plans";

describe("PLAN_MONTHLY_CREDITS", () => {
  it("grants Growth subscribers platform credits on renewal", () => {
    expect(PLAN_MONTHLY_CREDITS.growth).toBe(500);
    expect(getMonthlyCreditsForPlan("growth")).toBe(500);
  });

  it("does not grant Starter or Scale by default", () => {
    expect(getMonthlyCreditsForPlan("starter")).toBeNull();
    expect(getMonthlyCreditsForPlan("scale")).toBeNull();
  });
});
