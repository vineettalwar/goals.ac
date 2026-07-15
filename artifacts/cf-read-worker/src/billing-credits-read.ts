import { withCors } from "@workspace/cf-edge/cors";
import {
  getBalance,
  getMonthlyCreditsForPlan,
  getWorkspaceIdForOrganization,
  listCreditTopUpPacks,
} from "@workspace/billing";
import { resolveBillingActor } from "./billing-actor";

export async function handleBillingCreditsGet(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path === "/api/billing/credits/top-up" && request.method === "GET") {
    const packs = listCreditTopUpPacks();
    return withCors(request, Response.json({ packs }));
  }

  if (path !== "/api/billing/credits" || request.method !== "GET") return null;

  const actor = await resolveBillingActor(userId, { requireManage: false });
  if (!actor.ok) {
    return withCors(request, Response.json({ error: actor.error }, { status: actor.status }));
  }

  const workspaceId = await getWorkspaceIdForOrganization(actor.organizationId);
  const balance = workspaceId != null ? await getBalance(workspaceId) : 0;
  const monthlyGrant = getMonthlyCreditsForPlan(actor.billing.plan);
  const packs = listCreditTopUpPacks();

  return withCors(
    request,
    Response.json({
      plan: actor.billing.plan,
      balance,
      monthlyGrant,
      workspaceId,
      packs,
    }),
  );
}
