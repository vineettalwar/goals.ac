import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  organizationMembersTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";

type OrgMemberRole = "owner" | "site_admin" | "editor" | "viewer";

function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (!role) return null;
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return null;
}

function isSuperAdmin(userRole: string | null | undefined): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

function isSiteAdmin(orgRole: OrgMemberRole | null | undefined): boolean {
  return orgRole === "site_admin" || orgRole === "owner";
}

async function requireSiteAdminMembership(userId: number): Promise<
  | { ok: true; organizationId: number }
  | { ok: false; status: number; error: string }
> {
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (isSuperAdmin(user?.role)) {
    const organizationId = await resolveOrganizationIdForUser(userId);
    return { ok: true, organizationId: organizationId ?? 0 };
  }

  const [membership] = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  if (!membership) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const orgRole = normalizeOrgRole(membership.orgRole);
  if (!isSiteAdmin(orgRole)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, organizationId: membership.organizationId };
}

async function resolveOrganizationIdForUser(userId: number): Promise<number | null> {
  const [row] = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);
  return row?.organizationId ?? null;
}

async function listOrganizationMembers(organizationId: number) {
  return db
    .select({
      userId: organizationMembersTable.userId,
      role: organizationMembersTable.role,
      assignedProjectId: organizationMembersTable.assignedProjectId,
      joinedAt: organizationMembersTable.createdAt,
      email: usersTable.email,
      name: usersTable.name,
    })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(eq(organizationMembersTable.organizationId, organizationId))
    .orderBy(organizationMembersTable.id);
}

export async function handleOrgMembersRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (path !== "/api/organizations/members" || request.method !== "GET") {
    return null;
  }

  const access = await requireSiteAdminMembership(userId);
  if (!access.ok) {
    return withCors(request, Response.json({ error: access.error }, { status: access.status }));
  }

  if (!access.organizationId) {
    return withCors(request, Response.json({ members: [] }));
  }

  const members = await listOrganizationMembers(access.organizationId);
  return withCors(
    request,
    Response.json({
      members: members.map((member) => ({
        userId: member.userId,
        email: member.email,
        name: member.name,
        role: member.role,
        assignedProjectId: member.assignedProjectId,
        joinedAt: member.joinedAt?.toISOString() ?? null,
      })),
    }),
  );
}
