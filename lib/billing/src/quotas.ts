import { db } from "@workspace/db";
import { usageEventsTable } from "@workspace/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { PlanId } from "./plans";
import { normalizePlanId } from "./plans";
import {
  loadPlanQuotaLimits,
  resolvePlanArticleQuota,
  resolvePlanRoadmapQuota,
} from "./plan-quota-config";

export { loadPlanQuotaLimits, resolvePlanArticleQuota, resolvePlanRoadmapQuota, resolvePlanProjectQuota } from "./plan-quota-config";
export { DEFAULT_PLAN_QUOTA_LIMITS, PLAN_QUOTA_LIMITS } from "./plans";

/** Usage event types that count against the monthly article/content quota. */
export const ARTICLE_QUOTA_EVENT_TYPES = [
  "article_generation",
  "content_generation",
  "content_regenerate",
  "content_repurpose",
  "content_enhance",
  "seo_article_generation",
  "content_strategy_generation",
  "topic_ideas",
  "persona_generation",
  "topical_map",
  "reddit_discovery",
  "chat",
  "competitor_analysis",
  "keyword_analysis",
  "brand_voice_analysis",
  "brand_voice_skill",
  "brand_voice_index",
  "platform_voice_analysis",
  "image_regeneration",
  "social_composer",
  "llm_visibility_check",
  "brief_compilation",
] as const;

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMonthlyArticleCountForCompany(companyId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.companyId, companyId),
        inArray(usageEventsTable.eventType, [...ARTICLE_QUOTA_EVENT_TYPES]),
        gte(usageEventsTable.createdAt, monthStart),
      ),
    );
  return row?.count ?? 0;
}

export async function getMonthlyArticleCountForUser(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.userId, userId),
        inArray(usageEventsTable.eventType, [...ARTICLE_QUOTA_EVENT_TYPES]),
        gte(usageEventsTable.createdAt, monthStart),
      ),
    );
  return row?.count ?? 0;
}

export async function getMonthlyRoadmapCountForUser(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.userId, userId),
        eq(usageEventsTable.eventType, "roadmap_generation"),
        gte(usageEventsTable.createdAt, monthStart),
      ),
    );
  return row?.count ?? 0;
}

export type QuotaKind = "article" | "roadmap";

export interface CountQuotaCheckInput {
  plan: PlanId | string | null | undefined;
  kind: QuotaKind;
  userId: number;
  companyId?: number;
}

export type CountQuotaCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason: "quota_exhausted";
      quota: number;
      used: number;
      plan: PlanId;
    };

export async function checkCountQuota(input: CountQuotaCheckInput): Promise<CountQuotaCheckResult> {
  const plan = normalizePlanId(input.plan);
  const quota =
    input.kind === "article"
      ? await resolvePlanArticleQuota(plan)
      : await resolvePlanRoadmapQuota(plan);

  if (quota === null) {
    return { ok: true };
  }

  const used =
    input.kind === "article"
      ? input.companyId != null
        ? await getMonthlyArticleCountForCompany(input.companyId)
        : await getMonthlyArticleCountForUser(input.userId)
      : await getMonthlyRoadmapCountForUser(input.userId);

  if (used >= quota) {
    return { ok: false, reason: "quota_exhausted", quota, used, plan };
  }

  return { ok: true };
}
