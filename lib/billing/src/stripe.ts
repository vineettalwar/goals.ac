import Stripe from "stripe";
import {
  getStripePriceIdForPlanResolved,
  invalidatePlatformCredentialsCache,
  resolvePlatformStripeCredentials,
  type PlatformStripeCredentials,
} from "./platform-credentials";
import type { PlanId } from "./plans";

let stripeClient: { secretKey: string; client: Stripe } | null = null;

export function invalidateStripeClientCache(): void {
  stripeClient = null;
  invalidatePlatformCredentialsCache();
}

export async function getStripeClient(): Promise<Stripe | null> {
  const creds = await resolvePlatformStripeCredentials();
  if (!creds?.secretKey) return null;
  if (!stripeClient || stripeClient.secretKey !== creds.secretKey) {
    stripeClient = { secretKey: creds.secretKey, client: new Stripe(creds.secretKey) };
  }
  return stripeClient.client;
}

export interface CreateCheckoutSessionInput {
  organizationId: number;
  plan: Exclude<PlanId, "starter">;
  customerEmail: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ url: string } | { error: string }> {
  const stripe = await getStripeClient();
  if (!stripe) return { error: "Stripe billing is not configured" };

  const priceId = await getStripePriceIdForPlanResolved(input.plan);
  if (!priceId) return { error: `No Stripe price configured for ${input.plan}` };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId ?? undefined,
    customer_email: input.customerId ? undefined : input.customerEmail,
    customer_update: input.customerId ? { address: "auto", name: "auto" } : undefined,
    client_reference_id: String(input.organizationId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    billing_address_collection: "required",
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    metadata: {
      organizationId: String(input.organizationId),
      plan: input.plan,
    },
    subscription_data: {
      metadata: {
        organizationId: String(input.organizationId),
        plan: input.plan,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) return { error: "Stripe did not return a checkout URL" };
  return { url: session.url };
}

export interface CreatePortalSessionInput {
  customerId: string;
  returnUrl: string;
}

export async function createPortalSession(
  input: CreatePortalSessionInput,
): Promise<{ url: string } | { error: string }> {
  const stripe = await getStripeClient();
  if (!stripe) return { error: "Stripe billing is not configured" };

  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });

  return { url: session.url };
}

async function resolveWebhookSecret(
  creds: PlatformStripeCredentials | null,
): Promise<string | null> {
  return creds?.webhookSecret ?? null;
}

export async function constructStripeWebhookEvent(
  payload: string,
  signature: string | null,
): Promise<Stripe.Event | { error: string }> {
  const creds = await resolvePlatformStripeCredentials();
  const stripe = await getStripeClient();
  const secret = await resolveWebhookSecret(creds);
  if (!stripe || !secret) return { error: "Stripe webhooks are not configured" };
  if (!signature) return { error: "Missing Stripe signature" };

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return { error: message };
  }
}

export async function retrieveStripeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = await getStripeClient();
  if (!stripe) return null;
  return stripe.subscriptions.retrieve(subscriptionId);
}

export interface CreateCreditTopUpCheckoutInput {
  organizationId: number;
  packId: string;
  stripePriceId: string;
  credits: number;
  customerEmail: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export async function createCreditTopUpCheckoutSession(
  input: CreateCreditTopUpCheckoutInput,
): Promise<{ url: string } | { error: string }> {
  const stripe = await getStripeClient();
  if (!stripe) return { error: "Stripe billing is not configured" };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: input.customerId ?? undefined,
    customer_email: input.customerId ? undefined : input.customerEmail,
    customer_update: input.customerId ? { address: "auto", name: "auto" } : undefined,
    client_reference_id: String(input.organizationId),
    line_items: [{ price: input.stripePriceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    billing_address_collection: "required",
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    metadata: {
      organizationId: String(input.organizationId),
      packId: input.packId,
      credits: String(input.credits),
      kind: "credit_topup",
    },
  });

  if (!session.url) return { error: "Stripe did not return a checkout URL" };
  return { url: session.url };
}
