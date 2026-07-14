/** Plan identifiers — quota + billing config keys (not all are sold). */
export type PlanId = "starter" | "growth" | "scale";

/** Plans customers can subscribe to today. */
export const OFFERED_PLAN_IDS = ["starter", "growth"] as const satisfies readonly PlanId[];

/** All plans with quota configuration (includes future tiers). */
export const PLAN_IDS = ["starter", "growth", "scale"] as const satisfies readonly PlanId[];

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

/** Normalize stored plan strings; unknown values default to Starter. */
export function normalizePlanId(plan: string | null | undefined): PlanId {
  if (plan === "growth" || plan === "scale" || plan === "starter") {
    return plan;
  }
  return "starter";
}

export function isOfferedPlan(plan: string | null | undefined): boolean {
  const id = normalizePlanId(plan);
  return id === "starter" || id === "growth";
}

/** Paid self-serve or sales-assisted tiers above Starter. */
export type PaidPlanId = Extract<PlanId, "growth" | "scale">;

/** Suggest Growth when Starter quota is exhausted. Scale remains sales-assisted. */
export function getSuggestedUpgradePlan(plan?: string | null): PaidPlanId | null {
  if (normalizePlanId(plan) === "starter") return "growth";
  return null;
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  const id = normalizePlanId(plan);
  return id === "growth" || id === "scale";
}

/** Display prices for marketing UI. */
export const PLAN_DISPLAY_PRICES: Partial<Record<PlanId, string>> = {
  starter: "Free",
  growth: "$49/mo",
};

export function getStripePriceIdForPlan(plan: PlanId): string | null {
  return null;
}

export function planFromStripePriceId(_priceId: string | null | undefined): PlanId | null {
  return null;
}

export function isStripeBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * Monthly platform-key credit grants on Stripe renewal (invoice.paid).
 * null = no grant (Starter is free/BYOK; Scale is sales-assisted).
 * Growth: 500 credits ≈ ~70 execution-tier drafts at platform-key rates (7 credits each).
 */
export const PLAN_MONTHLY_CREDITS: Record<PlanId, number | null> = {
  starter: null,
  growth: 500,
  scale: null,
};

export function getMonthlyCreditsForPlan(plan?: string | null): number | null {
  return PLAN_MONTHLY_CREDITS[normalizePlanId(plan)];
}

export interface PlanQuotaLimits {
  articles: number | null;
  roadmaps: number | null;
  sites: number | null;
}

/**
 * Default platform-key quotas per plan (used when no DB override exists).
 * `null` = not configured yet (treated as unlimited). Runtime enforcement reads
 * from `plan_quota_config` via `plan-quota-config.ts`.
 */
export const DEFAULT_PLAN_QUOTA_LIMITS: Record<PlanId, PlanQuotaLimits> = {
  starter: { articles: 5, roadmaps: 3, sites: 1 },
  growth: { articles: 30, roadmaps: 12, sites: 3 },
  scale: { articles: null, roadmaps: null, sites: null },
};

/** @deprecated Use DEFAULT_PLAN_QUOTA_LIMITS or loadPlanQuotaLimits() */
export const PLAN_QUOTA_LIMITS = DEFAULT_PLAN_QUOTA_LIMITS;

/** @deprecated Use resolvePlanArticleQuota() */
export function getPlanArticleQuota(plan?: string | null): number | null {
  return DEFAULT_PLAN_QUOTA_LIMITS[normalizePlanId(plan)].articles;
}

/** @deprecated Use resolvePlanRoadmapQuota() */
export function getPlanRoadmapQuota(plan?: string | null): number | null {
  return DEFAULT_PLAN_QUOTA_LIMITS[normalizePlanId(plan)].roadmaps;
}

/** @deprecated Use resolvePlanProjectQuota() */
export function getPlanProjectQuota(plan?: string | null): number | null {
  return DEFAULT_PLAN_QUOTA_LIMITS[normalizePlanId(plan)].sites;
}
