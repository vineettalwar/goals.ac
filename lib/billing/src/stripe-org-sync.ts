import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import {
  normalizePlanId,
  type PlanId,
} from "./plans";
import { planFromStripePriceIdResolved } from "./platform-credentials";
import { eq } from "drizzle-orm";
import { updateOrganizationPlan } from "@workspace/platform-admin";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | string;

export interface OrganizationBillingRecord {
  organizationId: number;
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  stripePriceId: string | null;
  currentPeriodEnd: Date | null;
}

export async function getOrganizationBillingRecord(
  organizationId: number,
): Promise<OrganizationBillingRecord | null> {
  const [org] = await db
    .select({
      organizationId: organizationsTable.id,
      plan: organizationsTable.plan,
      stripeCustomerId: organizationsTable.stripeCustomerId,
      stripeSubscriptionId: organizationsTable.stripeSubscriptionId,
      subscriptionStatus: organizationsTable.subscriptionStatus,
      stripePriceId: organizationsTable.stripePriceId,
      currentPeriodEnd: organizationsTable.currentPeriodEnd,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) return null;

  return {
    organizationId: org.organizationId,
    plan: normalizePlanId(org.plan),
    stripeCustomerId: org.stripeCustomerId,
    stripeSubscriptionId: org.stripeSubscriptionId,
    subscriptionStatus: org.subscriptionStatus as SubscriptionStatus | null,
    stripePriceId: org.stripePriceId,
    currentPeriodEnd: org.currentPeriodEnd,
  };
}

export async function updateOrganizationStripeFields(input: {
  organizationId: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  const patch: Partial<typeof organizationsTable.$inferInsert> = {};
  if (input.stripeCustomerId !== undefined) patch.stripeCustomerId = input.stripeCustomerId;
  if (input.stripeSubscriptionId !== undefined) patch.stripeSubscriptionId = input.stripeSubscriptionId;
  if (input.subscriptionStatus !== undefined) patch.subscriptionStatus = input.subscriptionStatus;
  if (input.stripePriceId !== undefined) patch.stripePriceId = input.stripePriceId;
  if (input.currentPeriodEnd !== undefined) patch.currentPeriodEnd = input.currentPeriodEnd;

  if (Object.keys(patch).length === 0) return;

  await db
    .update(organizationsTable)
    .set(patch)
    .where(eq(organizationsTable.id, input.organizationId));
}

export interface StripeSubscriptionSnapshot {
  id: string;
  customerId: string;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export async function applyStripeSubscriptionToOrganization(input: {
  organizationId: number;
  subscription: StripeSubscriptionSnapshot;
}): Promise<{ ok: true; plan: PlanId; previousPlan: PlanId } | { ok: false; error: string }> {
  const existing = await getOrganizationBillingRecord(input.organizationId);
  if (!existing) {
    return { ok: false, error: "Organization not found" };
  }

  const resolvedPlan = input.subscription.priceId
    ? await planFromStripePriceIdResolved(input.subscription.priceId)
    : null;
  const targetPlan: PlanId = resolvedPlan ?? "starter";

  await updateOrganizationStripeFields({
    organizationId: input.organizationId,
    stripeCustomerId: input.subscription.customerId,
    stripeSubscriptionId: input.subscription.id,
    subscriptionStatus: input.subscription.status,
    stripePriceId: input.subscription.priceId,
    currentPeriodEnd: input.subscription.currentPeriodEnd,
  });

  const planResult = await updateOrganizationPlan({
    organizationId: input.organizationId,
    plan: targetPlan,
  });

  if (!planResult.ok) {
    return { ok: false, error: planResult.error };
  }

  return {
    ok: true,
    plan: targetPlan,
    previousPlan: normalizePlanId(planResult.previousPlan),
  };
}

export function subscriptionSnapshotFromStripe(subscription: {
  id: string;
  customer: string | { id: string } | null;
  status: string;
  items: { data: Array<{ price?: { id?: string | null } | null }> };
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
}): StripeSubscriptionSnapshot {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? "";

  const priceId = subscription.items.data[0]?.price?.id ?? null;

  return {
    id: subscription.id,
    customerId,
    status: subscription.status,
    priceId,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}
