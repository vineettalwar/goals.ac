import { createCheckoutSession, isStripeBillingActive } from "@workspace/billing";
import { withCors } from "@workspace/cf-edge/cors";
import { z } from "zod";
import { resolveBillingActor } from "./billing-actor";
import { billingSettingsUrl } from "./billing-app-url";

const checkoutBody = z.object({
  plan: z.enum(["growth"]),
});

export async function handleBillingCheckoutPost(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/billing/checkout" || request.method !== "POST") {
    return null;
  }

  const parsed = checkoutBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(request, Response.json({ error: "Invalid plan" }, { status: 400 }));
  }

  const actor = await resolveBillingActor(userId, { requireManage: true });
  if (!actor.ok) {
    return withCors(request, Response.json({ error: actor.error }, { status: actor.status }));
  }

  if (!(await isStripeBillingActive())) {
    return withCors(
      request,
      Response.json({ error: "Stripe billing is not configured on this deployment" }, { status: 400 }),
    );
  }

  if (parsed.data.plan !== "growth") {
    return withCors(
      request,
      Response.json(
        { error: "Only the Growth plan is available for self-serve checkout. Contact us for Scale." },
        { status: 400 },
      ),
    );
  }

  const result = await createCheckoutSession({
    organizationId: actor.organizationId,
    plan: parsed.data.plan,
    customerEmail: actor.email,
    customerId: actor.billing.stripeCustomerId,
    successUrl: billingSettingsUrl(request, "checkout=success"),
    cancelUrl: billingSettingsUrl(request, "checkout=cancel"),
  });

  if ("error" in result) {
    return withCors(request, Response.json({ error: result.error }, { status: 400 }));
  }

  return withCors(request, Response.json({ url: result.url }));
}
