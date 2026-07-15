import { db } from "@workspace/db";
import { planQuotaConfigTable } from "@workspace/db/schema-sqlite";
import {
  DEFAULT_PLAN_QUOTA_LIMITS,
  normalizePlanId,
  PLAN_IDS,
  type PlanId,
  type PlanQuotaLimits,
} from "@workspace/billing/plans";

let cache: { limits: Record<PlanId, PlanQuotaLimits>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

function cloneDefaults(): Record<PlanId, PlanQuotaLimits> {
  return Object.fromEntries(
    PLAN_IDS.map((planId) => [planId, { ...DEFAULT_PLAN_QUOTA_LIMITS[planId] }]),
  ) as Record<PlanId, PlanQuotaLimits>;
}

async function loadPlanQuotaLimits(): Promise<Record<PlanId, PlanQuotaLimits>> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.limits;
  }

  const limits = cloneDefaults();
  const rows = await db.select().from(planQuotaConfigTable);
  for (const row of rows) {
    const planId = normalizePlanId(row.planId);
    limits[planId] = {
      articles: row.articlesPerMonth,
      roadmaps: row.roadmapsPerMonth,
      sites: row.sites,
    };
  }

  cache = { limits, expiresAt: Date.now() + CACHE_TTL_MS };
  return limits;
}

export async function resolvePlanProjectQuota(plan?: string | null): Promise<number | null> {
  const limits = await loadPlanQuotaLimits();
  return limits[normalizePlanId(plan)].sites;
}

export async function resolvePlanArticleQuota(plan?: string | null): Promise<number | null> {
  const limits = await loadPlanQuotaLimits();
  return limits[normalizePlanId(plan)].articles;
}
