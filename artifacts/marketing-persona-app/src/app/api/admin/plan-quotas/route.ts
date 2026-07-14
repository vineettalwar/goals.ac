import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadPlanQuotaLimits,
  upsertPlanQuotaLimits,
  type PlanId,
} from "@workspace/billing";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

const planIdSchema = z.enum(["starter", "growth", "scale"]);
const quotaFieldSchema = z.number().int().min(0).nullable();

const updateSchema = z.object({
  planId: planIdSchema,
  limits: z.object({
    articles: quotaFieldSchema,
    roadmaps: quotaFieldSchema,
    sites: quotaFieldSchema,
  }),
});

export async function GET() {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const limits = await loadPlanQuotaLimits();
  return NextResponse.json({ limits });
}

export async function PATCH(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await upsertPlanQuotaLimits({
    planId: parsed.data.planId as PlanId,
    limits: parsed.data.limits,
    updatedBy: admin.userId!,
  });

  const limits = await loadPlanQuotaLimits();
  return NextResponse.json({ limits });
}
