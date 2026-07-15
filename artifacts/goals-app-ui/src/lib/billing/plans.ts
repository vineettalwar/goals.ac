/** Client-safe plan constants (no database imports). */

export type PlanId = "starter" | "growth" | "scale";

export const PLAN_IDS = ["starter", "growth", "scale"] as const satisfies readonly PlanId[];

export const OFFERED_PLAN_IDS = ["starter", "growth"] as const satisfies readonly PlanId[];

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export function normalizePlanId(plan: string | null | undefined): PlanId {
  if (plan === "growth" || plan === "scale" || plan === "starter") return plan;
  return "starter";
}

export type PlanQuotaLimits = {
  articles: number | null;
  roadmaps: number | null;
  sites: number | null;
};
