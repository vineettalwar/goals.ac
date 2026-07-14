import { db } from "@workspace/db";
import { planQuotaConfigTable } from "@workspace/db/schema";
import {
  DEFAULT_PLAN_QUOTA_LIMITS,
  normalizePlanId,
  PLAN_IDS,
  type PlanId,
  type PlanQuotaLimits,
} from "./plans";

let cache: { limits: Record<PlanId, PlanQuotaLimits>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidatePlanQuotaCache(): void {
  cache = null;
}

function cloneDefaults(): Record<PlanId, PlanQuotaLimits> {
  return Object.fromEntries(
    PLAN_IDS.map((planId) => [planId, { ...DEFAULT_PLAN_QUOTA_LIMITS[planId] }]),
  ) as Record<PlanId, PlanQuotaLimits>;
}

async function loadPlanQuotaLimitsFromDb(): Promise<Record<PlanId, PlanQuotaLimits>> {
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

  return limits;
}

export async function loadPlanQuotaLimits(): Promise<Record<PlanId, PlanQuotaLimits>> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.limits;
  }

  const limits = await loadPlanQuotaLimitsFromDb();
  cache = { limits, expiresAt: Date.now() + CACHE_TTL_MS };
  return limits;
}

export async function resolvePlanArticleQuota(plan?: string | null): Promise<number | null> {
  const limits = await loadPlanQuotaLimits();
  return limits[normalizePlanId(plan)].articles;
}

export async function resolvePlanRoadmapQuota(plan?: string | null): Promise<number | null> {
  const limits = await loadPlanQuotaLimits();
  return limits[normalizePlanId(plan)].roadmaps;
}

export async function resolvePlanProjectQuota(plan?: string | null): Promise<number | null> {
  const limits = await loadPlanQuotaLimits();
  return limits[normalizePlanId(plan)].sites;
}

export async function upsertPlanQuotaLimits(input: {
  planId: PlanId;
  limits: PlanQuotaLimits;
  updatedBy: number;
}): Promise<PlanQuotaLimits> {
  const planId = normalizePlanId(input.planId);

  await db
    .insert(planQuotaConfigTable)
    .values({
      planId,
      articlesPerMonth: input.limits.articles,
      roadmapsPerMonth: input.limits.roadmaps,
      sites: input.limits.sites,
      updatedBy: input.updatedBy,
    })
    .onConflictDoUpdate({
      target: planQuotaConfigTable.planId,
      set: {
        articlesPerMonth: input.limits.articles,
        roadmapsPerMonth: input.limits.roadmaps,
        sites: input.limits.sites,
        updatedBy: input.updatedBy,
      },
    });

  invalidatePlanQuotaCache();
  const all = await loadPlanQuotaLimits();
  return all[planId];
}
