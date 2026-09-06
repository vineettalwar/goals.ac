import { db } from "./db";
import { normalizePlanId, type PlanId } from "@workspace/billing";
import { organizationsTable, usersTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { assertOrgNotSuspended, getOrgMembership, type OrgMemberRole } from "@workspace/cf-edge/project-access";

type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused"
  | string;

function hasBillingViewPermission(orgRole: OrgMemberRole): boolean {
  return orgRole === "owner" || orgRole === "site_admin";
}

function hasBillingManagePermission(orgRole: OrgMemberRole): boolean {
  return orgRole === "owner";
}

function isSuperAdmin(userRole: string | null | undefined): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

export async function resolveBillingActor(
  userId: number,
  options?: { requireManage?: boolean },
): Promise<
  | {
      ok: true;
      organizationId: number;
      email: string;
      billing: {
        plan: PlanId;
        stripeCustomerId: string | null;
        subscriptionStatus: SubscriptionStatus | null;
        currentPeriodEnd: Date | null;
      };
      canManage: boolean;
    }
  | { ok: false; status: number; error: string }
> {
  const [user] = await db
    .select({ role: usersTable.role, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.email) {
    return { ok: false, status: 400, error: "User email is required for billing" };
  }

  const superAdmin = isSuperAdmin(user.role);
  const membership = await getOrgMembership(userId);

  if (!superAdmin) {
    const suspended = await assertOrgNotSuspended(userId);
    if (!suspended.ok) {
      return { ok: false, status: suspended.status, error: suspended.error };
    }

    if (!membership || !hasBillingViewPermission(membership.orgRole)) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
  }

  const organizationId = membership?.organizationId;
  if (organizationId == null) {
    return { ok: false, status: 403, error: "No organization membership" };
  }

  const [org] = await db
    .select({
      plan: organizationsTable.plan,
      stripeCustomerId: organizationsTable.stripeCustomerId,
      subscriptionStatus: organizationsTable.subscriptionStatus,
      currentPeriodEnd: organizationsTable.currentPeriodEnd,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  const canManage = superAdmin || (membership != null && hasBillingManagePermission(membership.orgRole));

  if (options?.requireManage && !canManage) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    organizationId,
    email: user.email,
    billing: {
      plan: normalizePlanId(org.plan),
      stripeCustomerId: org.stripeCustomerId,
      subscriptionStatus: org.subscriptionStatus as SubscriptionStatus | null,
      currentPeriodEnd: org.currentPeriodEnd,
    },
    canManage,
  };
}
