import {
  DEFAULT_PLAN_QUOTA_LIMITS,
  PLAN_DISPLAY_PRICES,
  PLAN_IDS,
  PLAN_LABELS,
  PLAN_MONTHLY_CREDITS,
  type PlanId,
  type PlanQuotaLimits,
} from "./plans";

export type PublicPlanCatalogEntry = {
  id: PlanId;
  label: string;
  price: string;
  credits: number | null;
  quotas: PlanQuotaLimits;
};

export type PublicPlanCatalog = {
  plans: PublicPlanCatalogEntry[];
};

export function buildPublicPlanCatalog(
  limits: Record<PlanId, PlanQuotaLimits> = DEFAULT_PLAN_QUOTA_LIMITS,
): PublicPlanCatalog {
  return {
    plans: PLAN_IDS.map((id) => ({
      id,
      label: PLAN_LABELS[id],
      price: PLAN_DISPLAY_PRICES[id] ?? "Custom",
      credits: PLAN_MONTHLY_CREDITS[id] ?? null,
      quotas: limits[id],
    })),
  };
}
