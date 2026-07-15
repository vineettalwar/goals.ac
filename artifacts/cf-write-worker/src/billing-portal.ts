import { createPortalSession, isStripeBillingActive } from "@workspace/billing";
import { withCors } from "@workspace/cf-edge/cors";
import { resolveBillingActor } from "./billing-actor";
import { billingSettingsUrl } from "./billing-app-url";

export async function handleBillingPortalPost(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/billing/portal" || request.method !== "POST") {
    return null;
  }

  const actor = await resolveBillingActor(userId, { requireManage: true });
  if (!actor.ok) {
    return withCors(request, Response.json({ error: actor.error }, { status: actor.status }));
  }

  if (!actor.billing.stripeCustomerId) {
    return withCors(
      request,
      Response.json(
        { error: "No Stripe customer on file — upgrade via checkout first" },
        { status: 400 },
      ),
    );
  }

  if (!(await isStripeBillingActive())) {
    return withCors(
      request,
      Response.json({ error: "Stripe billing is not configured on this deployment" }, { status: 503 }),
    );
  }

  const result = await createPortalSession({
    customerId: actor.billing.stripeCustomerId,
    returnUrl: billingSettingsUrl(request),
  });

  if ("error" in result) {
    return withCors(request, Response.json({ error: result.error }, { status: 503 }));
  }

  return withCors(request, Response.json({ url: result.url }));
}
