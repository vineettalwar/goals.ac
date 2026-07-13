import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import {
  addOrganizationMember,
  listOrganizationMembers,
  requireSiteAdminAccess,
} from "@/lib/org-access";

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
  role: z.enum(["site_admin", "member"]),
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
