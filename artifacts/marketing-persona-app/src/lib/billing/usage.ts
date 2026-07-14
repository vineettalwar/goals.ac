import { db, countAsInt } from "@workspace/db";
import { usageEventsTable, usersTable, companiesTable, websiteProjectsTable, organizationsTable, organizationMembersTable } from "@workspace/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { getOrgAiSettingsForUser } from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  checkCountQuota,
  normalizePlanId,
  recordUsageEvent,
  resolvePlanArticleQuota,
  type QuotaKind,
} from "@workspace/billing";

export type { PlanId } from "./plans";
export {
  OFFERED_PLAN_IDS,
  PLAN_IDS,
  PLAN_LABELS,
  PLAN_QUOTA_LIMITS,
  PLAN_QUOTAS,
  ROADMAP_QUOTAS,
  PROJECT_QUOTAS,
  getPlanQuota,
  getRoadmapQuota,
  getProjectQuota,
  normalizePlanId,
} from "./plans";
import type { PlanId } from "./plans";

export type { QuotaKind };

export async function getOrganizationProjectCount(organizationId: number): Promise<number> {
  const [row] = await db
    .select({ count: countAsInt() })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.organizationId, organizationId));
  return row?.count ?? 0;
}

// Gemini 2.5 Flash blended pricing estimate: $0.30/M input tokens, $2.50/M output tokens.
const INPUT_COST_PER_TOKEN = 0.3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 2.5 / 1_000_000;

export function estimateGenerationCostUsd(promptTokens: number, outputTokens: number): number {
  return promptTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
}

export interface RecordUsageInput {
  userId: number;
  companyId?: number | null;
  eventType: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  usedByok: boolean;
  provider?: string;
  model?: string;
  tier?: string;
}

export async function recordUsage(input: RecordUsageInput): Promise<number> {
  return recordUsageEvent(input);
}

export interface AssertCountQuotaInput {
  userId: number;
  kind: QuotaKind;
  companyId?: number;
}

export type AssertCountQuotaResult =
  | { ok: true; plan: PlanId }
  | {
      ok: false;
      plan: PlanId;
      quota: number;
      used: number;
    };

/** Count-quota gate using org plan (falls back to user plan). */
export async function assertCountQuota(input: AssertCountQuotaInput): Promise<AssertCountQuotaResult> {
  const [user, membership] = await Promise.all([
    db
      .select({ plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ plan: organizationsTable.plan })
      .from(organizationMembersTable)
      .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
      .where(eq(organizationMembersTable.userId, input.userId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  const plan = normalizePlanId(membership?.plan ?? user?.plan);
  const result = await checkCountQuota({
    plan,
    kind: input.kind,
    userId: input.userId,
    companyId: input.companyId,
  });

  if (!result.ok) {
    return { ok: false, plan: result.plan, quota: result.quota, used: result.used };
  }

  return { ok: true, plan };
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Count of `article_generation` usage events recorded this calendar month for a company.
 * Used for quota enforcement — counts every generation attempt regardless of BYOK,
 * callers should skip quota checks entirely for BYOK generations.
 */
export async function getMonthlyArticleCount(companyId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: countAsInt() })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.companyId, companyId),
        eq(usageEventsTable.eventType, "article_generation"),
        gte(usageEventsTable.createdAt, monthStart)
      )
    );
  return row?.count ?? 0;
}

/**
 * Count of `roadmap_generation` usage events recorded this calendar month for a user.
 * Only platform-key generations are recorded; BYOK generations skip quota checks entirely.
 */
export async function getMonthlyRoadmapCountForUser(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: countAsInt() })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.userId, userId),
        eq(usageEventsTable.eventType, "roadmap_generation"),
        gte(usageEventsTable.createdAt, monthStart)
      )
    );
  return row?.count ?? 0;
}

/**
 * Count of `article_generation` usage events recorded this calendar month for a user
 * (used when there is no company scope available, e.g. aggregate account-level views).
 */
export async function getMonthlyArticleCountForUser(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: countAsInt() })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.userId, userId),
        eq(usageEventsTable.eventType, "article_generation"),
        gte(usageEventsTable.createdAt, monthStart)
      )
    );
  return row?.count ?? 0;
}

export async function getMonthlyByokSpendUsd(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${usageEventsTable.estimatedCostUsd}), 0)` })
    .from(usageEventsTable)
    .where(
      and(
        eq(usageEventsTable.userId, userId),
        eq(usageEventsTable.usedByok, true),
        gte(usageEventsTable.createdAt, monthStart)
      )
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

/** Full usage summary for a user's account, used by the settings usage dashboard. */
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

  const plan = normalizePlanId(membership?.plan ?? user?.plan);
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

/** Look up the owning user id + BYOK status for a company, used by quota checks in generation routes. */
export async function getCompanyOwnerPlanInfo(
  companyId: number
): Promise<{ userId: number; plan: PlanId; usesByok: boolean } | null> {
  const [row] = await db
    .select({
      userId: companiesTable.userId,
      plan: usersTable.plan,
      orgPlan: organizationsTable.plan,
      orgGeminiKey: organizationsTable.encryptedGeminiKey,
      userGeminiKey: usersTable.encryptedGeminiKey,
    })
    .from(companiesTable)
    .innerJoin(usersTable, eq(usersTable.id, companiesTable.userId))
    .leftJoin(organizationMembersTable, eq(organizationMembersTable.userId, companiesTable.userId))
    .leftJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
    .where(eq(companiesTable.id, companyId))
    .limit(1);

  if (!row) return null;
  return {
    userId: row.userId,
    plan: (row.orgPlan as PlanId) ?? (row.plan as PlanId) ?? "starter",
    usesByok: Boolean(row.orgGeminiKey ?? row.userGeminiKey),
  };
}
