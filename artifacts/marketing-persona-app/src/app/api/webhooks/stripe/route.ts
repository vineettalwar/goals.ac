import { NextResponse } from "next/server";
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
} from "@/lib/billing/billing-service";
import { logOrgAudit } from "@/lib/org/org-audit";

export const runtime = "nodejs";

function organizationIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  fallback?: string | null,
): number | null {
  const raw = metadata?.organizationId ?? fallback ?? null;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function syncSubscription(
  organizationId: number,
  subscription: Stripe.Subscription,
  actorUserId: number | null,
) {
  const snapshot = subscriptionSnapshotFromStripe(subscription);
  const result = await applyStripeSubscriptionToOrganization({
    organizationId,
    subscription: snapshot,
  });

  if (!result.ok) {
    console.error(
      `Stripe webhook: failed to apply subscription for org ${organizationId}: ${result.error}`,
    );
    return;
  }

  if (result.previousPlan !== result.plan) {
    await logOrgAudit({
      organizationId,
      actorUserId,
      action: "org.plan_changed",
      metadata: {
        previousPlan: result.previousPlan,
        newPlan: result.plan,
        source: "stripe",
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      },
    });
  }
}

export async function POST(req: Request) {
  if (!(await isStripeBillingActive())) {
    return NextResponse.json({ error: "Stripe billing disabled" }, { status: 503 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  const eventOrError = await constructStripeWebhookEvent(payload, signature);

  if ("error" in eventOrError) {
    return NextResponse.json({ error: eventOrError.error }, { status: 400 });
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
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (session.customer && typeof session.customer === "string") {
          await updateOrganizationStripeFields({
            organizationId,
            stripeCustomerId: session.customer,
          });
        }

        if (subscriptionId) {
          const subscription = await retrieveStripeSubscription(subscriptionId);
          if (subscription) {
            await syncSubscription(organizationId, subscription, null);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = organizationIdFromMetadata(subscription.metadata);
        if (!organizationId) break;
        await syncSubscription(organizationId, subscription, null);
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
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
