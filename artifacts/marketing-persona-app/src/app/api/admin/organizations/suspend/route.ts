import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdminApi } from "@/lib/require-platform-admin";
import { suspendOrganization, unsuspendOrganization } from "@/lib/org-access";
import { logOrgAudit } from "@/lib/org-audit";

const suspendSchema = z.object({
  organizationId: z.number().int().positive(),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = suspendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await suspendOrganization({
    organizationId: parsed.data.organizationId,
    reason: parsed.data.reason,
  });

  await logOrgAudit({
    organizationId: parsed.data.organizationId,
    actorUserId: admin.userId,
    action: "org.suspended",
    metadata: { reason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(req.url);
  const organizationId = Number(searchParams.get("organizationId"));
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  await unsuspendOrganization(organizationId);

  await logOrgAudit({
    organizationId,
    actorUserId: admin.userId,
    action: "org.unsuspended",
  });

  return NextResponse.json({ ok: true });
}
