import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import {
  addOrganizationMember,
  listOrganizationMembers,
  OrgMemberRoleSchema,
  requireSiteAdminAccess,
} from "@/lib/org-access";
import { logOrgAudit } from "@/lib/org-audit";

function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const siteAdmin = await requireSiteAdminAccess(userId!);
  if (!siteAdmin.ok) {
    return NextResponse.json({ error: siteAdmin.error }, { status: siteAdmin.status });
  }

  const organizationId = siteAdmin.membership.organizationId;
  if (!organizationId) {
    return NextResponse.json({ members: [] });
  }

  const members = await listOrganizationMembers(organizationId);
  return NextResponse.json({
    members: members.map((m) => ({
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      assignedProjectId: m.assignedProjectId,
    })),
  });
}

const AddMemberBody = z.object({
  email: z.string().email(),
  role: OrgMemberRoleSchema,
  assignedProjectId: z.number().int().positive().nullable(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const siteAdmin = await requireSiteAdminAccess(userId!);
  if (!siteAdmin.ok) {
    return NextResponse.json({ error: siteAdmin.error }, { status: siteAdmin.status });
  }

  const organizationId = siteAdmin.membership.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AddMemberBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [targetUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found — they must sign up first" }, { status: 404 });
  }

  const result = await addOrganizationMember({
    organizationId,
    userId: targetUser.id,
    role: parsed.data.role,
    assignedProjectId: parsed.data.assignedProjectId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logOrgAudit({
    organizationId,
    actorUserId: userId,
    action: "member.added",
    resourceType: "user",
    resourceId: targetUser.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
    ip: clientIp(req),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
