import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  OrgMemberRoleSchema,
  removeOrganizationMember,
  requireSiteAdminAccess,
  updateOrganizationMember,
} from "@/lib/org/org-access";
import { logOrgAudit } from "@/lib/org/org-audit";

const PatchMemberBody = z.object({
  role: OrgMemberRoleSchema,
  assignedProjectId: z.number().int().positive().nullable(),
});

function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: actorId, error } = await requireAuth();
  if (error) return error;

  const siteAdmin = await requireSiteAdminAccess(actorId!);
  if (!siteAdmin.ok) {
    return NextResponse.json({ error: siteAdmin.error }, { status: siteAdmin.status });
  }

  const organizationId = siteAdmin.membership.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { userId: memberUserIdStr } = await params;
  const memberUserId = Number.parseInt(memberUserIdStr, 10);
  if (Number.isNaN(memberUserId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchMemberBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await updateOrganizationMember({
    organizationId,
    memberUserId,
    role: parsed.data.role,
    assignedProjectId: parsed.data.assignedProjectId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logOrgAudit({
    organizationId,
    actorUserId: actorId,
    action: "member.role_changed",
    resourceType: "user",
    resourceId: memberUserId,
    metadata: { role: parsed.data.role, assignedProjectId: parsed.data.assignedProjectId },
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: actorId, error } = await requireAuth();
  if (error) return error;

  const siteAdmin = await requireSiteAdminAccess(actorId!);
  if (!siteAdmin.ok) {
    return NextResponse.json({ error: siteAdmin.error }, { status: siteAdmin.status });
  }

  const organizationId = siteAdmin.membership.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { userId: memberUserIdStr } = await params;
  const memberUserId = Number.parseInt(memberUserIdStr, 10);
  if (Number.isNaN(memberUserId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const result = await removeOrganizationMember({
    organizationId,
    memberUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logOrgAudit({
    organizationId,
    actorUserId: actorId,
    action: "member.removed",
    resourceType: "user",
    resourceId: memberUserId,
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true });
}
