import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveBillingActor, startOrganizationPortal } from "@/lib/billing/billing-service";

export async function POST() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const actor = await resolveBillingActor({
    userId: userId!,
    requireManage: true,
  });
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  if (!actor.billing.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file — upgrade via checkout first" },
      { status: 400 },
    );
  }

  const result = await startOrganizationPortal({
    customerId: actor.billing.stripeCustomerId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ url: result.url });
}
