import { and, eq } from "drizzle-orm";
import { db, creditLedgerTable, jsonTextAt } from "@workspace/db";
import { grantCredits } from "./ledger";
import { listCreditTopUpPacks, type CreditTopUpPack } from "./credit-topup-packs";
import { getMonthlyCreditsForPlan, type PlanId } from "./plans";
import { getOrCreateWorkspaceForOrganization } from "./workspaces";

export interface GrantRenewalCreditsInput {
  organizationId: number;
  plan: PlanId;
  stripeInvoiceId: string;
  billingReason?: string | null;
}

export type GrantRenewalCreditsResult =
  | { granted: true; workspaceId: number; amount: number }
  | { granted: false; reason: "no_credits_for_plan" | "already_granted" | "zero_amount" };

/** Idempotent monthly credit grant keyed by Stripe invoice ID. */
export async function grantRenewalCreditsForOrganization(
  input: GrantRenewalCreditsInput,
): Promise<GrantRenewalCreditsResult> {
  const amount = getMonthlyCreditsForPlan(input.plan);
  if (amount == null) {
    return { granted: false, reason: "no_credits_for_plan" };
  }
  if (amount <= 0) {
    return { granted: false, reason: "zero_amount" };
  }

  const workspaceId = await getOrCreateWorkspaceForOrganization({ organizationId: input.organizationId });

  const [existing] = await db
    .select({ id: creditLedgerTable.id })
    .from(creditLedgerTable)
    .where(
      and(
        eq(creditLedgerTable.workspaceId, workspaceId),
        eq(creditLedgerTable.entryType, "grant"),
        eq(jsonTextAt(creditLedgerTable.meta, "stripeInvoiceId"), input.stripeInvoiceId),
      ),
    )
    .limit(1);

  if (existing) {
    return { granted: false, reason: "already_granted" };
  }

  await grantCredits({
    workspaceId,
    amount,
    meta: {
      stripeInvoiceId: input.stripeInvoiceId,
      organizationId: input.organizationId,
      plan: input.plan,
      source: "stripe_renewal",
      billingReason: input.billingReason ?? null,
    },
  });

  return { granted: true, workspaceId, amount };
}

export type { CreditTopUpPack };
export { listCreditTopUpPacks };

export interface GrantTopUpCreditsInput {
  organizationId: number;
  credits: number;
  stripeCheckoutSessionId: string;
}

export type GrantTopUpCreditsResult =
  | { granted: true; workspaceId: number; amount: number }
  | { granted: false; reason: "already_granted" | "zero_amount" };

export async function grantTopUpCreditsForOrganization(
  input: GrantTopUpCreditsInput,
): Promise<GrantTopUpCreditsResult> {
  if (input.credits <= 0) return { granted: false, reason: "zero_amount" };

  const workspaceId = await getOrCreateWorkspaceForOrganization({ organizationId: input.organizationId });

  const [existing] = await db
    .select({ id: creditLedgerTable.id })
    .from(creditLedgerTable)
    .where(
      and(
        eq(creditLedgerTable.workspaceId, workspaceId),
        eq(creditLedgerTable.entryType, "grant"),
        eq(jsonTextAt(creditLedgerTable.meta, "stripeCheckoutSessionId"), input.stripeCheckoutSessionId),
      ),
    )
    .limit(1);

  if (existing) return { granted: false, reason: "already_granted" };

  await grantCredits({
    workspaceId,
    amount: input.credits,
    meta: {
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      organizationId: input.organizationId,
      source: "stripe_topup",
    },
  });

  return { granted: true, workspaceId, amount: input.credits };
}
