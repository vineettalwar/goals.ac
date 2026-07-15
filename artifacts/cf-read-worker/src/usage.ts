import { db, countAsInt } from "@workspace/db";
import {
  usageEventsTable,
  usersTable,
  organizationsTable,
  organizationMembersTable,
} from "@workspace/db/schema-sqlite";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { normalizePlanId, type PlanId } from "@workspace/billing/plans";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import { resolvePlanArticleQuota } from "./plan-quotas";

const ARTICLE_QUOTA_EVENT_TYPES = [
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

async function getMonthlyArticleCountForUser(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: countAsInt() })
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

async function getMonthlyByokSpendUsd(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${usageEventsTable.estimatedCostUsd}), 0)` })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.userId, userId),
        eq(usageEventsTable.usedByok, true),
        gte(usageEventsTable.createdAt, monthStart),
      ),
    );
  return row ? Number(row.total) : 0;
}

export interface UsageSummary {
  plan: PlanId;
  articlesThisMonth: number;
  quota: number | null;
  quotaRemaining: number | null;
  usesByok: boolean;
  byokSpendThisMonthUsd: number;
}

export async function getUsageSummaryForUser(userId: number): Promise<UsageSummary> {
  const [user, orgSettings, membership] = await Promise.all([
    db
      .select({ plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    getOrgAiSettingsForUser(userId),
    db
      .select({ plan: organizationsTable.plan })
      .from(organizationMembersTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
      .where(eq(organizationMembersTable.userId, userId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  const plan = normalizePlanId((membership?.plan ?? user?.plan) as string | null | undefined);
  const usesByok = Boolean(orgSettings?.encryptedGeminiKey);
  const [quota, articlesThisMonth, byokSpendThisMonthUsd] = await Promise.all([
    resolvePlanArticleQuota(plan),
    getMonthlyArticleCountForUser(userId),
    getMonthlyByokSpendUsd(userId),
  ]);

  const quotaRemaining = quota === null ? null : Math.max(0, quota - articlesThisMonth);

  return {
    plan,
    articlesThisMonth,
    quota,
    quotaRemaining,
    usesByok,
    byokSpendThisMonthUsd,
  };
}
