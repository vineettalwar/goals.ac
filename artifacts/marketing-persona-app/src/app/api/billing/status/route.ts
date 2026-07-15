import { NextResponse } from "next/server";
import { isStripeBillingActive } from "@workspace/billing";
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveBillingActor } from "@/lib/billing/billing-service";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const actor = await resolveBillingActor({
    userId: userId!,
    requireManage: false,
  });
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const { billing } = actor;

  return NextResponse.json({
    billing: {
      plan: billing.plan,
      subscriptionStatus: billing.subscriptionStatus,
      currentPeriodEnd: billing.currentPeriodEnd?.toISOString() ?? null,
      hasStripeCustomer: Boolean(billing.stripeCustomerId),
      hasActiveSubscription:
        billing.subscriptionStatus === "active" || billing.subscriptionStatus === "trialing",
      stripeConfigured: await isStripeBillingActive(),
      canManageBilling: actor.canManage,
    },
  });
}
