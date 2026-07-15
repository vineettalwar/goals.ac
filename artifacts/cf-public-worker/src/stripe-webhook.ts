import type Stripe from "stripe";
import {
  constructStripeWebhookEvent,
  grantRenewalCreditsForOrganization,
  grantTopUpCreditsForOrganization,
  isStripeBillingActive,
  retrieveStripeSubscription,
} from "@workspace/billing";
import {
  applyStripeSubscriptionToOrganization,
  getOrganizationBillingRecord,
  subscriptionSnapshotFromStripe,
  updateOrganizationStripeFields,
} from "@workspace/billing/stripe-org-sync";
import { logOrgAudit } from "@workspace/platform-admin";
import { withCors } from "@workspace/cf-edge/cors";

function organizationIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  fallback?: string | null,
): number | null {
  const raw = metadata?.organizationId ?? fallback ?? null;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function syncSubscription(organizationId: number, subscription: Stripe.Subscription) {
  const snapshot = subscriptionSnapshotFromStripe(subscription);
  await applyStripeSubscriptionToOrganization({
    organizationId,
    subscription: snapshot,
  });
}

export async function handleStripeWebhook(request: Request): Promise<Response> {
  if (!(await isStripeBillingActive())) {
    return Response.json({ error: "Stripe billing disabled" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const eventOrError = await constructStripeWebhookEvent(payload, signature);

  if ("error" in eventOrError) {
    return Response.json({ error: eventOrError.error }, { status: 400 });
  }

  const event = eventOrError;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = organizationIdFromMetadata(
          session.metadata,
          session.client_reference_id,
        );
        if (!organizationId) break;

        if (session.mode === "payment" && session.metadata?.kind === "credit_topup") {
          const credits = Number(session.metadata.credits ?? 0);
          if (credits > 0) {
            await grantTopUpCreditsForOrganization({
              organizationId,
              credits,
              stripeCheckoutSessionId: session.id,
            });
          }
          break;
        }

        if (session.mode !== "subscription") break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (session.customer && typeof session.customer === "string") {
          await updateOrganizationStripeFields({
            organizationId,
            stripeCustomerId: session.customer,
          });
        }

        if (subscriptionId) {
          const subscription = await retrieveStripeSubscription(subscriptionId);
          if (subscription) {
            await syncSubscription(organizationId, subscription);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = organizationIdFromMetadata(subscription.metadata);
        if (!organizationId) break;
        await syncSubscription(organizationId, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionRef = (invoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        }).subscription;
        const subscriptionId =
          typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
        if (!subscriptionId) break;

        const subscription = await retrieveStripeSubscription(subscriptionId);
        if (!subscription) break;

        const organizationId = organizationIdFromMetadata(subscription.metadata);
        if (!organizationId) break;

        await updateOrganizationStripeFields({
          organizationId,
          subscriptionStatus: subscription.status,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.amount_paid <= 0) break;

        const billingReason = invoice.billing_reason;
        if (
          billingReason !== "subscription_create" &&
          billingReason !== "subscription_cycle" &&
          billingReason !== "subscription_update"
        ) {
          break;
        }

        const subscriptionRef = (invoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        }).subscription;
        const subscriptionId =
          typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
        if (!subscriptionId) break;

        const subscription = await retrieveStripeSubscription(subscriptionId);
        if (!subscription) break;

        const organizationId = organizationIdFromMetadata(subscription.metadata);
        if (!organizationId) break;

        const snapshot = subscriptionSnapshotFromStripe(subscription);
        const syncResult = await applyStripeSubscriptionToOrganization({
          organizationId,
          subscription: snapshot,
        });

        const billing = await getOrganizationBillingRecord(organizationId);
        if (!billing || !invoice.id) break;

        const plan = syncResult.ok ? syncResult.plan : billing.plan;

        const grantResult = await grantRenewalCreditsForOrganization({
          organizationId,
          plan,
          stripeInvoiceId: invoice.id,
          billingReason,
        });

        if (grantResult.granted) {
          await logOrgAudit({
            organizationId,
            actorUserId: null,
            action: "billing.credits_granted",
            metadata: {
              amount: grantResult.amount,
              workspaceId: grantResult.workspaceId,
              stripeInvoiceId: invoice.id,
              plan: billing.plan,
              billingReason,
            },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return withCors(request, Response.json({ error: "Webhook handler failed" }, { status: 500 }));
  }

  return withCors(request, Response.json({ received: true }));
}
