import { NextResponse } from "next/server";
import {
  getBalance,
  getMonthlyCreditsForPlan,
  getWorkspaceIdForOrganization,
} from "@workspace/billing";
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveBillingActor } from "@/lib/billing/billing-service";

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const actor = await resolveBillingActor({
    userId: userId!,
    requireManage: false,
  });
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const workspaceId = await getWorkspaceIdForOrganization(actor.organizationId);
  const balance = workspaceId != null ? await getBalance(workspaceId) : 0;
  const monthlyGrant = getMonthlyCreditsForPlan(actor.billing.plan);

  return NextResponse.json({
    plan: actor.billing.plan,
    balance,
    monthlyGrant,
    workspaceId,
  });
}
