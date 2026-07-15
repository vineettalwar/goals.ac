import { z } from "zod";
import { resolveBillingActor } from "./billing-actor";
import {
  createCreditTopUpCheckoutSession,
  isStripeBillingActive,
  listCreditTopUpPacks,
} from "@workspace/billing";
import { withCors } from "@workspace/cf-edge/cors";

const topUpBody = z.object({
  packId: z.string().min(1),
});

export async function handleBillingCreditsWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/billing/credits/top-up" || request.method !== "POST") return null;

  if (!(await isStripeBillingActive())) {
    return withCors(request, Response.json({ error: "Stripe billing disabled" }, { status: 503 }));
  }

  const actor = await resolveBillingActor(userId, { requireManage: true });
  if (!actor.ok) {
    return withCors(request, Response.json({ error: actor.error }, { status: actor.status }));
  }

  const body = await request.json().catch(() => null);
  const parsed = topUpBody.safeParse(body);
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
  }

  const pack = listCreditTopUpPacks().find((item) => item.id === parsed.data.packId);
  if (!pack) {
    return withCors(request, Response.json({ error: "Unknown credit pack" }, { status: 400 }));
  }

  const appUrl = process.env.APP_URL ?? "https://app.goals.ac";
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
    return withCors(request, Response.json({ error: checkout.error }, { status: 502 }));
  }

  return withCors(request, Response.json({ url: checkout.url }));
}
