/** Client-safe plan constants and quota helpers (no database imports). */

export type PlanId = "starter" | "growth" | "scale";

export const OFFERED_PLAN_IDS = ["starter", "growth"] as const satisfies readonly PlanId[];

export const PLAN_IDS = ["starter", "growth", "scale"] as const satisfies readonly PlanId[];

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

/** Display prices for marketing UI (mirrors @workspace/billing/plans). */
export const PLAN_DISPLAY_PRICES: Partial<Record<PlanId, string>> = {
  starter: "Free",
  growth: "$49/mo",
};

/** Monthly platform-key credits included (Growth only). */
export const PLAN_DISPLAY_CREDITS: Partial<Record<PlanId, number>> = {
  growth: 500,
};

export function normalizePlanId(plan: string | null | undefined): PlanId {
  if (plan === "growth" || plan === "scale" || plan === "starter") {
    return plan;
  }
  return "starter";
}

export interface PlanQuotaLimits {
  articles: number | null;
  roadmaps: number | null;
  sites: number | null;
}

/** Default quotas — server enforcement reads admin-configured values from the database. */
export const DEFAULT_PLAN_QUOTA_LIMITS: Record<PlanId, PlanQuotaLimits> = {
  starter: { articles: 5, roadmaps: 3, sites: 1 },
  growth: { articles: 30, roadmaps: 12, sites: 3 },
  scale: { articles: null, roadmaps: null, sites: null },
};

/** @deprecated Prefer API / DEFAULT_PLAN_QUOTA_LIMITS */
export const PLAN_QUOTA_LIMITS = DEFAULT_PLAN_QUOTA_LIMITS;

/** @deprecated Prefer PLAN_QUOTA_LIMITS */
export const PLAN_QUOTAS: Record<PlanId, number | null> = {
  starter: PLAN_QUOTA_LIMITS.starter.articles,
  growth: PLAN_QUOTA_LIMITS.growth.articles,
  scale: PLAN_QUOTA_LIMITS.scale.articles,
};

export function getPlanQuota(plan?: string | null): number | null {
  return PLAN_QUOTA_LIMITS[normalizePlanId(plan)].articles;
}

/** @deprecated Prefer PLAN_QUOTA_LIMITS */
export const ROADMAP_QUOTAS: Record<PlanId, number | null> = {
  starter: PLAN_QUOTA_LIMITS.starter.roadmaps,
  growth: PLAN_QUOTA_LIMITS.growth.roadmaps,
  scale: PLAN_QUOTA_LIMITS.scale.roadmaps,
};

export function getRoadmapQuota(plan?: string | null): number | null {
  return PLAN_QUOTA_LIMITS[normalizePlanId(plan)].roadmaps;
}

/** @deprecated Prefer PLAN_QUOTA_LIMITS */
export const PROJECT_QUOTAS: Record<PlanId, number | null> = {
  starter: PLAN_QUOTA_LIMITS.starter.sites,
  growth: PLAN_QUOTA_LIMITS.growth.sites,
  scale: PLAN_QUOTA_LIMITS.scale.sites,
};

export function getProjectQuota(plan?: string | null): number | null {
  return PLAN_QUOTA_LIMITS[normalizePlanId(plan)].sites;
}
