import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import { updateOrganizationPlan } from "@/lib/org/org-access";
import { logOrgAudit } from "@/lib/org/org-audit";

const updatePlanSchema = z.object({
  organizationId: z.number().int().positive(),
  plan: z.literal("starter"),
  /** Bypass Stripe guard — use only when subscription is already canceled in Stripe. */
  force: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [org] = await db
    .select({
      stripeSubscriptionId: organizationsTable.stripeSubscriptionId,
      stripeCustomerId: organizationsTable.stripeCustomerId,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, parsed.data.organizationId))
    .limit(1);

  if (
    !parsed.data.force &&
    (org?.stripeSubscriptionId || org?.stripeCustomerId)
  ) {
    return NextResponse.json(
      {
        error:
          "Organization has Stripe billing on file. Sync via the customer portal or pass force: true after canceling in Stripe.",
        code: "stripe_subscription_active",
      },
      { status: 409 },
    );
  }

  const result = await updateOrganizationPlan({
    organizationId: parsed.data.organizationId,
    plan: parsed.data.plan,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.previousPlan !== parsed.data.plan) {
    await logOrgAudit({
      organizationId: parsed.data.organizationId,
      actorUserId: admin.userId,
      action: "org.plan_changed",
      metadata: {
        previousPlan: result.previousPlan,
        newPlan: parsed.data.plan,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    plan: parsed.data.plan,
    previousPlan: result.previousPlan,
  });
}
