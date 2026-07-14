import { db } from "@workspace/db";
import { organizationsTable, usersTable } from "@workspace/db/schema";
import {
  createCheckoutSession,
  createPortalSession,
  isStripeBillingActive,
  normalizePlanId,
  type PlanId,
} from "@workspace/billing";
import { eq } from "drizzle-orm";
import { updateOrganizationPlan } from "@/lib/org/org-access";
import { OrgPermission } from "@/lib/org/org-access-shared";

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

function getAppUrl(): string {
  return process.env.NEXTAUTH_URL?.trim() || "http://localhost:3001";
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

  const targetPlan: PlanId = "starter";

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

  return { ok: true, plan: targetPlan, previousPlan: planResult.previousPlan };
}

export async function startOrganizationCheckout(_input: {
  organizationId: number;
  plan: never;
  customerEmail: string;
  customerId?: string | null;
}): Promise<{ error: string }> {
  return { error: "Paid plans are not available. Use Starter with your own API key." };
}

export async function startOrganizationPortal(input: {
  customerId: string;
}): Promise<{ url: string } | { error: string }> {
  if (!(await isStripeBillingActive())) {
    return { error: "Stripe billing is not configured on this deployment" };
  }

  return createPortalSession({
    customerId: input.customerId,
    returnUrl: `${getAppUrl()}/settings?tab=billing`,
  });
}

export async function resolveBillingActor(input: {
  userId: number;
  requireManage?: boolean;
}): Promise<
  | {
      ok: true;
      organizationId: number;
      email: string;
      billing: OrganizationBillingRecord;
      canManage: boolean;
    }
  | { ok: false; status: number; error: string }
> {
  const { requireOrgPermission } = await import("@/lib/org/org-access");
  const managePerm = await requireOrgPermission(input.userId, OrgPermission.BILLING_MANAGE);
  const viewPerm = managePerm.ok
    ? managePerm
    : await requireOrgPermission(input.userId, OrgPermission.BILLING_VIEW);

  if (input.requireManage) {
    if (!managePerm.ok) {
      return { ok: false, status: managePerm.status, error: managePerm.error };
    }
  } else if (!viewPerm.ok) {
    return { ok: false, status: viewPerm.status, error: viewPerm.error };
  }

  const membership = managePerm.ok ? managePerm.membership : viewPerm.ok ? viewPerm.membership : null;
  const organizationId = membership?.organizationId;
  if (!organizationId) {
    return { ok: false, status: 403, error: "No organization membership" };
  }

  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, input.userId))
    .limit(1);

  if (!user?.email) {
    return { ok: false, status: 400, error: "User email is required for billing" };
  }

  const billing = await getOrganizationBillingRecord(organizationId);
  if (!billing) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  return {
    ok: true,
    organizationId,
    email: user.email,
    billing,
    canManage: managePerm.ok,
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
