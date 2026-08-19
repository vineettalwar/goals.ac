import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  PLAN_IDS,
  PLAN_LABELS,
  normalizePlanId,
  DEFAULT_PLAN_QUOTA_LIMITS,
  type PlanId,
} from "./plans";

const updatePlanSchema = z.object({
  organizationId: z.number().int().positive(),
  plan: z.enum(PLAN_IDS as unknown as [PlanId, ...PlanId[]]),
  force: z.boolean().optional(),
});

describe("plan validation", () => {
  it("accepts starter, growth, scale", () => {
    for (const plan of ["starter", "growth", "scale"] as const) {
      const result = updatePlanSchema.safeParse({ organizationId: 1, plan });
      expect(result.success, `${plan} should be accepted`).toBe(true);
    }
  });

  it("rejects unknown plan values", () => {
    const result = updatePlanSchema.safeParse({ organizationId: 1, plan: "enterprise" });
    expect(result.success).toBe(false);
  });

  it("rejects missing organizationId", () => {
    const result = updatePlanSchema.safeParse({ plan: "starter" });
    expect(result.success).toBe(false);
  });

  it("accepts force flag", () => {
    const result = updatePlanSchema.safeParse({
      organizationId: 1,
      plan: "growth",
      force: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.force).toBe(true);
  });

  it("PLAN_IDS covers all PLAN_LABELS keys", () => {
    expect(new Set(PLAN_IDS)).toEqual(new Set(Object.keys(PLAN_LABELS)));
  });

  it("DEFAULT_PLAN_QUOTA_LIMITS has entry for every plan", () => {
    for (const plan of PLAN_IDS) {
      expect(DEFAULT_PLAN_QUOTA_LIMITS[plan]).toBeDefined();
    }
  });
});

describe("normalizePlanId", () => {
  it("returns valid plan ids unchanged", () => {
    expect(normalizePlanId("starter")).toBe("starter");
    expect(normalizePlanId("growth")).toBe("growth");
    expect(normalizePlanId("scale")).toBe("scale");
  });

  it("falls back to starter for garbage input", () => {
    expect(normalizePlanId(null)).toBe("starter");
    expect(normalizePlanId(undefined)).toBe("starter");
    expect(normalizePlanId("enterprise")).toBe("starter");
    expect(normalizePlanId("")).toBe("starter");
  });
});
