import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { releaseAiCall, reserveAiCall, settleAiCall } from "./consumption";
import { getBalance } from "./ledger";
import {
  getSuggestedUpgradePlan,
  isPaidPlan,
  normalizePlanId,
  type PlanId,
} from "./plans";
import { isStripeBillingActive } from "./platform-gates";
import { estimateAiCallCredits, type AiTier } from "./pricing";
import { checkCountQuota, type QuotaKind } from "./quotas";
import { recordUsageEvent, type RecordUsageEventInput } from "./usage-events";
import { ensureWorkspaceForOrganization } from "./workspaces";

export interface AiBillingContext {
  runId: string;
  workspaceId: number;
  organizationId: number | null;
  tier: AiTier;
  usedByok: boolean;
  plan: PlanId;
  reservedCredits: boolean;
}

export interface PrepareAiBillingInput {
  userId: number;
  tier: AiTier;
  usedByok: boolean;
  quotaKind?: QuotaKind;
  companyId?: number;
  runId?: string;
}

export type PrepareAiBillingFailure =
  | {
      reason: "quota_exhausted";
      plan: PlanId;
      quota: number;
      used: number;
      suggestedPlan: ReturnType<typeof getSuggestedUpgradePlan>;
    }
  | {
      reason: "insufficient_credits";
      plan: PlanId;
      balance: number;
      required: number;
      suggestedPlan: ReturnType<typeof getSuggestedUpgradePlan>;
    }
  | { reason: "subscription_blocked"; plan: PlanId; subscriptionStatus: string };

export type PrepareAiBillingResult =
  | { ok: true; ctx: AiBillingContext }
  | { ok: false; error: PrepareAiBillingFailure };

async function resolvePlanForUser(userId: number): Promise<{
  plan: PlanId;
  organizationId: number | null;
}> {
  const [user, membership] = await Promise.all([
    db
      .select({ plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        organizationId: organizationMembersTable.organizationId,
        plan: organizationsTable.plan,
      })
      .from(organizationMembersTable)
      .innerJoin(
        organizationsTable,
        eq(organizationsTable.id, organizationMembersTable.organizationId),
      )
      .where(eq(organizationMembersTable.userId, userId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  return {
    plan: normalizePlanId(membership?.plan ?? user?.plan),
    organizationId: membership?.organizationId ?? null,
  };
}

async function shouldReserveCredits(plan: PlanId, usedByok: boolean): Promise<boolean> {
  if (usedByok) return false;
  if (!isPaidPlan(plan)) return false;
  return isStripeBillingActive();
}

export async function prepareAiBillingSession(
  input: PrepareAiBillingInput,
): Promise<PrepareAiBillingResult> {
  const runId = input.runId ?? randomUUID();
  const { plan, organizationId } = await resolvePlanForUser(input.userId);

  if (!input.usedByok && input.quotaKind) {
    const quotaResult = await checkCountQuota({
      plan,
      kind: input.quotaKind,
      userId: input.userId,
      companyId: input.companyId,
    });
    if (!quotaResult.ok) {
      return {
        ok: false,
        error: {
          reason: "quota_exhausted",
          plan: quotaResult.plan,
          quota: quotaResult.quota,
          used: quotaResult.used,
          suggestedPlan: getSuggestedUpgradePlan(quotaResult.plan),
        },
      };
    }
  }

  if (organizationId != null && !input.usedByok) {
    const [org] = await db
      .select({ subscriptionStatus: organizationsTable.subscriptionStatus })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, organizationId))
      .limit(1);
    const blocked = org?.subscriptionStatus === "past_due" || org?.subscriptionStatus === "unpaid";
    if (blocked) {
      return {
        ok: false,
        error: {
          reason: "subscription_blocked",
          plan,
          subscriptionStatus: org!.subscriptionStatus!,
        },
      };
    }
  }

  let workspaceId = 0;
  if (organizationId != null) {
    workspaceId = await ensureWorkspaceForOrganization({ organizationId });
  }

  const reservedCredits = await shouldReserveCredits(plan, input.usedByok);
  if (reservedCredits) {
    const estimate = estimateAiCallCredits({ tier: input.tier, usedByok: input.usedByok });
    const reserveResult = await reserveAiCall({
      workspaceId,
      runId,
      tier: input.tier,
      usedByok: input.usedByok,
      meta: { userId: input.userId, eventTier: input.tier },
    });
    if (!reserveResult.ok) {
      const balance = await getBalance(workspaceId);
      return {
        ok: false,
        error: {
          reason: "insufficient_credits",
          plan,
          balance,
          required: estimate.total,
          suggestedPlan: getSuggestedUpgradePlan(plan),
        },
      };
    }
  }

  return {
    ok: true,
    ctx: {
      runId,
      workspaceId,
      organizationId,
      tier: input.tier,
      usedByok: input.usedByok,
      plan,
      reservedCredits,
    },
  };
}

export async function completeAiBillingSession(
  ctx: AiBillingContext,
  usage: RecordUsageEventInput,
): Promise<number> {
  const usageEventId = await recordUsageEvent({
    ...usage,
    usedByok: ctx.usedByok,
    tier: usage.tier ?? ctx.tier,
  });

  if (ctx.reservedCredits) {
    await settleAiCall({
      runId: ctx.runId,
      tier: ctx.tier,
      usedByok: ctx.usedByok,
      usageEventId,
    });
  }

  return usageEventId;
}

export async function cancelAiBillingSession(
  ctx: AiBillingContext,
  reason?: string,
): Promise<void> {
  if (!ctx.reservedCredits) return;
  await releaseAiCall({ runId: ctx.runId, reason });
}
