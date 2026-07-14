import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCreditTopUpCheckoutSession,
  isStripeBillingActive,
  listCreditTopUpPacks,
} from "@workspace/billing";
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveBillingActor } from "@/lib/billing/billing-service";

const TopUpBody = z.object({
  packId: z.string().min(1),
});

export async function GET() {
  return NextResponse.json({ packs: listCreditTopUpPacks() });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  if (!(await isStripeBillingActive())) {
    return NextResponse.json(
      { error: "stripe_unavailable", message: "Credit top-ups require Stripe billing to be configured." },
      { status: 503 },
    );
  }

  const actor = await resolveBillingActor({ userId: userId!, requireManage: true });
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = TopUpBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pack = listCreditTopUpPacks().find((item) => item.id === parsed.data.packId);
  if (!pack) {
    return NextResponse.json({ error: "Unknown credit pack" }, { status: 400 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const checkout = await createCreditTopUpCheckoutSession({
    organizationId: actor.organizationId,
    packId: pack.id,
    stripePriceId: pack.stripePriceId,
    credits: pack.credits,
    customerEmail: actor.email,
    customerId: actor.billing.stripeCustomerId,
    successUrl: `${appUrl}/settings?tab=billing&topup=success`,
    cancelUrl: `${appUrl}/settings?tab=billing&topup=cancelled`,
  });

  if ("error" in checkout) {
    return NextResponse.json({ error: checkout.error }, { status: 502 });
  }

  return NextResponse.json({ url: checkout.url });
}
