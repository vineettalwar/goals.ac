import { describe, expect, it } from "vitest";
import { buildPublicPlanCatalog } from "./public-plans";
import { DEFAULT_PLAN_QUOTA_LIMITS } from "./plans";

describe("buildPublicPlanCatalog", () => {
  it("returns starter, growth, and scale with defaults", () => {
    const catalog = buildPublicPlanCatalog();
    expect(catalog.plans).toHaveLength(3);
    expect(catalog.plans[0]).toMatchObject({
      id: "starter",
      label: "Starter",
      price: "Free",
      quotas: DEFAULT_PLAN_QUOTA_LIMITS.starter,
    });
    expect(catalog.plans[1]).toMatchObject({
      id: "growth",
      price: "$49/mo",
      credits: 500,
    });
  });

  it("uses admin overrides when provided", () => {
    const catalog = buildPublicPlanCatalog({
      ...DEFAULT_PLAN_QUOTA_LIMITS,
      starter: { sites: 2, roadmaps: 5, articles: 10 },
    });
    expect(catalog.plans[0]?.quotas).toEqual({ sites: 2, roadmaps: 5, articles: 10 });
  });
});
