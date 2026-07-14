import { NextResponse } from "next/server";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import {
  cancelAiBillingSession,
  completeAiBillingSession,
  prepareAiBillingSession,
  type AiBillingContext,
  type AiTier,
  type QuotaKind,
} from "@workspace/billing";
import type { RecordUsageInput } from "@/lib/billing/usage";

export type { AiBillingContext, AiTier };

export interface PrepareAiBillingInput {
  userId: number;
  tier: AiTier;
  quotaKind?: QuotaKind;
  companyId?: number;
  runId?: string;
  /** When omitted, resolved via resolveAiClientForUser (org key first). */
  usedByok?: boolean;
}

export type PrepareAiBillingResult =
  | { ok: true; ctx: AiBillingContext; usedByok: boolean }
  | { ok: false; response: NextResponse };

function quotaExhaustedMessage(plan: string, quota: number, kind: QuotaKind): string {
  const noun = kind === "roadmap" ? "roadmap generations" : "article generations";
  return `You've used all ${quota} ${noun} on the platform key this month. Add your API key in Settings → AI Providers for unlimited generations.`;
}

function insufficientCreditsMessage(balance: number, required: number): string {
  return `Insufficient credits (${balance} available, ${required} required). Add your API key in Settings → AI Providers.`;
}

export async function prepareAiBilling(
  input: PrepareAiBillingInput,
): Promise<PrepareAiBillingResult> {
  const resolved: boolean =
    input.usedByok ??
    (await resolveAiClientForUser(input.userId).then((r) => r.source === "user-key"));

  const result = await prepareAiBillingSession({
    userId: input.userId,
    tier: input.tier,
    usedByok: resolved,
    quotaKind: resolved ? undefined : input.quotaKind,
    companyId: input.companyId,
    runId: input.runId,
  });

  if (!result.ok) {
    const err = result.error;
    if (err.reason === "quota_exhausted") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "quota_exhausted",
            message: quotaExhaustedMessage(err.plan, err.quota, input.quotaKind ?? "article"),
            plan: err.plan,
            suggestedPlan: err.suggestedPlan,
            quota: err.quota,
            used: err.used,
          },
          { status: 402 },
        ),
      };
    }
    if (err.reason === "insufficient_credits") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "insufficient_credits",
            message: insufficientCreditsMessage(err.balance, err.required),
            plan: err.plan,
            suggestedPlan: err.suggestedPlan,
            balance: err.balance,
            required: err.required,
          },
          { status: 402 },
        ),
      };
    }
    if (err.reason === "subscription_blocked") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "subscription_blocked",
            message:
              "Your subscription payment is past due. Update billing in Settings or add your API key in Settings → AI Providers.",
            plan: err.plan,
            subscriptionStatus: err.subscriptionStatus,
          },
          { status: 402 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "billing_unavailable", message: "Billing is temporarily unavailable." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, ctx: result.ctx, usedByok: resolved };
}

export async function completeAiBilling(
  ctx: AiBillingContext,
  usage: RecordUsageInput,
): Promise<number> {
  return completeAiBillingSession(ctx, usage);
}

export async function cancelAiBilling(ctx: AiBillingContext, reason?: string): Promise<void> {
  await cancelAiBillingSession(ctx, reason);
}

/** SSE-friendly 402 JSON body (call before returning the stream). */
export function billingDeniedResponse(result: Extract<PrepareAiBillingResult, { ok: false }>): Response {
  return new Response(result.response.body, {
    status: result.response.status,
    headers: { "Content-Type": "application/json" },
  });
}
