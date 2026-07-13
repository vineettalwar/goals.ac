import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { requireSiteAdminAccess, updateOrganizationMember } from "@/lib/org-access";

const PatchMemberBody = z.object({
  role: z.enum(["site_admin", "member"]),
  assignedProjectId: z.number().int().positive().nullable(),
});

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

  return NextResponse.json({ ok: true });
}
