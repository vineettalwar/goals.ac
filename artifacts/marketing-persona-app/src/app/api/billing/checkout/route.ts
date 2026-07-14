import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveBillingActor, startOrganizationCheckout } from "@/lib/billing/billing-service";

const Body = z.object({
  plan: z.enum(["growth"]),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const actor = await resolveBillingActor({ userId: userId!, requireManage: true });
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const result = await startOrganizationCheckout({
    organizationId: actor.organizationId,
    plan: parsed.data.plan,
    customerEmail: actor.email,
    customerId: actor.billing.stripeCustomerId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}
