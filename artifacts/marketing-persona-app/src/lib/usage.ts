import { db } from "@workspace/db";
import { usageEventsTable, usersTable, scheduledArticlesTable, companiesTable } from "@workspace/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export type PlanId = "starter" | "growth" | "scale";

// Monthly article generation quotas per plan. `null` means unlimited.
export const PLAN_QUOTAS: Record<PlanId, number | null> = {
  starter: 5,
  growth: 50,
  scale: null,
};

export function getPlanQuota(plan: string | null | undefined): number | null {
  return PLAN_QUOTAS[(plan as PlanId) ?? "starter"] ?? PLAN_QUOTAS.starter;
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
}

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const promptTokens = input.promptTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? promptTokens + outputTokens;
  const estimatedCostUsd =
    input.estimatedCostUsd ?? estimateGenerationCostUsd(promptTokens, outputTokens);

  await db.insert(usageEventsTable).values({
    userId: input.userId,
    companyId: input.companyId ?? null,
    eventType: input.eventType,
    promptTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: estimatedCostUsd.toFixed(6),
    usedByok: input.usedByok,
  });
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
    .select({ count: sql<number>`count(*)::int` })
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
 * Count of `article_generation` usage events recorded this calendar month for a user
 * (used when there is no company scope available, e.g. aggregate account-level views).
 */
export async function getMonthlyArticleCountForUser(userId: number): Promise<number> {
  const monthStart = startOfCurrentMonth();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
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
  const [user] = await db
    .select({ plan: usersTable.plan, encryptedGeminiKey: usersTable.encryptedGeminiKey })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const plan = (user?.plan as PlanId) ?? "starter";
  const usesByok = Boolean(user?.encryptedGeminiKey);
  const quota = getPlanQuota(plan);

  const [articlesThisMonth, byokSpendThisMonthUsd] = await Promise.all([
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
      encryptedGeminiKey: usersTable.encryptedGeminiKey,
    })
    .from(companiesTable)
    .innerJoin(usersTable, eq(usersTable.id, companiesTable.userId))
    .where(eq(companiesTable.id, companyId))
    .limit(1);

  if (!row) return null;
  return {
    userId: row.userId,
    plan: (row.plan as PlanId) ?? "starter",
    usesByok: Boolean(row.encryptedGeminiKey),
  };
}
