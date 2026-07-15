import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import {
  organizationMembersTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSiteAdminAccess, type OrgMemberRole } from "./project-access";

const OrgMemberRoleSchema = z.enum(["owner", "site_admin", "editor", "viewer"]);

const AddMemberBody = z.object({
  email: z.string().email(),
  role: OrgMemberRoleSchema,
  assignedProjectId: z.number().int().positive().nullable(),
});

const PatchMemberBody = z.object({
  role: OrgMemberRoleSchema,
  assignedProjectId: z.number().int().positive().nullable(),
});

function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (!role) return null;
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return null;
}

function roleHasAllProjects(orgRole: OrgMemberRole): boolean {
  return orgRole === "owner" || orgRole === "site_admin";
}

function requiresAssignedProject(role: OrgMemberRole): boolean {
  return role === "editor" || role === "viewer";
}

async function updateOrganizationMember(input: {
  organizationId: number;
  memberUserId: number;
  role: OrgMemberRole;
  assignedProjectId: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (requiresAssignedProject(input.role) && input.assignedProjectId == null) {
    return { ok: false, error: "Editors and viewers must have an assigned project" };
  }

  const [target] = await db
    .select({ role: organizationMembersTable.role })
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(organizationMembersTable.userId, input.memberUserId),
      ),
    )
    .limit(1);

  if (target && normalizeOrgRole(target.role) === "owner" && input.role !== "owner") {
    const owners = await db
      .select({ id: organizationMembersTable.id })
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organizationId, input.organizationId),
          eq(organizationMembersTable.role, "owner"),
        ),
      );
    if (owners.length <= 1) {
      return { ok: false, error: "Transfer ownership before demoting the owner" };
    }
  }

  if (input.assignedProjectId != null) {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, input.assignedProjectId),
          eq(websiteProjectsTable.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (!project) {
      return { ok: false, error: "Assigned project must belong to this organization" };
    }
  }

  const result = await db
    .update(organizationMembersTable)
    .set({
      role: input.role,
      assignedProjectId: roleHasAllProjects(input.role) ? null : input.assignedProjectId,
    })
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(organizationMembersTable.userId, input.memberUserId),
      ),
    )
    .returning({ id: organizationMembersTable.id });

  if (result.length === 0) {
    return { ok: false, error: "Member not found" };
  }

  return { ok: true };
}

async function removeOrganizationMember(input: {
  organizationId: number;
  memberUserId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const [member] = await db
    .select({ role: organizationMembersTable.role })
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(organizationMembersTable.userId, input.memberUserId),
      ),
    )
    .limit(1);

  if (!member) {
    return { ok: false, error: "Member not found" };
  }

  if (normalizeOrgRole(member.role) === "owner") {
    return { ok: false, error: "Cannot remove the organization owner" };
  }

  await db
    .delete(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(organizationMembersTable.userId, input.memberUserId),
      ),
    );

  return { ok: true };
}

async function addOrganizationMember(input: {
  organizationId: number;
  userId: number;
  role: OrgMemberRole;
  assignedProjectId: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const [existing] = await db
    .select({ id: organizationMembersTable.id })
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(organizationMembersTable.userId, input.userId),
      ),
    )
    .limit(1);

  if (existing) {
    return updateOrganizationMember({
      organizationId: input.organizationId,
      memberUserId: input.userId,
      role: input.role,
      assignedProjectId: input.assignedProjectId,
    });
  }

  if (requiresAssignedProject(input.role) && input.assignedProjectId == null) {
    return { ok: false, error: "Editors and viewers must have an assigned project" };
  }

  if (input.assignedProjectId != null) {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, input.assignedProjectId),
          eq(websiteProjectsTable.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (!project) {
      return { ok: false, error: "Assigned project must belong to this organization" };
    }
  }

  await db.insert(organizationMembersTable).values({
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    assignedProjectId: roleHasAllProjects(input.role) ? null : input.assignedProjectId,
  });

  return { ok: true };
}

export async function handleOrgMembersWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const memberMatch = path.match(/^\/api\/organizations\/members\/(\d+)$/);

  if (path === "/api/organizations/members" && request.method === "POST") {
    const siteAdmin = await requireSiteAdminAccess(userId);
    if (!siteAdmin.ok) {
      return withCors(
        request,
        Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }),
      );
    }

    const organizationId = siteAdmin.membership.organizationId;
    if (!organizationId) {
      return withCors(request, Response.json({ error: "No organization" }, { status: 400 }));
    }

    const body = await request.json().catch(() => null);
    const parsed = AddMemberBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const [targetUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, parsed.data.email))
      .limit(1);

    if (!targetUser) {
      return withCors(
        request,
        Response.json({ error: "User not found — they must sign up first" }, { status: 404 }),
      );
    }

    const result = await addOrganizationMember({
      organizationId,
      userId: targetUser.id,
      role: parsed.data.role,
      assignedProjectId: parsed.data.assignedProjectId,
    });

    if (!result.ok) {
      return withCors(request, Response.json({ error: result.error }, { status: 400 }));
    }

    return withCors(request, Response.json({ ok: true }, { status: 201 }));
  }

  if (memberMatch && request.method === "PATCH") {
    const siteAdmin = await requireSiteAdminAccess(userId);
    if (!siteAdmin.ok) {
      return withCors(
        request,
        Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }),
      );
    }

    const organizationId = siteAdmin.membership.organizationId;
    if (!organizationId) {
      return withCors(request, Response.json({ error: "No organization" }, { status: 400 }));
    }

    const memberUserId = Number.parseInt(memberMatch[1]!, 10);
    if (Number.isNaN(memberUserId)) {
      return withCors(request, Response.json({ error: "Invalid user id" }, { status: 400 }));
    }

    const body = await request.json().catch(() => null);
    const parsed = PatchMemberBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const result = await updateOrganizationMember({
      organizationId,
      memberUserId,
      role: parsed.data.role,
      assignedProjectId: parsed.data.assignedProjectId,
    });

    if (!result.ok) {
      return withCors(request, Response.json({ error: result.error }, { status: 400 }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  if (memberMatch && request.method === "DELETE") {
    const siteAdmin = await requireSiteAdminAccess(userId);
    if (!siteAdmin.ok) {
      return withCors(
        request,
        Response.json({ error: siteAdmin.error }, { status: siteAdmin.status }),
      );
    }

    const organizationId = siteAdmin.membership.organizationId;
    if (!organizationId) {
      return withCors(request, Response.json({ error: "No organization" }, { status: 400 }));
    }

    const memberUserId = Number.parseInt(memberMatch[1]!, 10);
    if (Number.isNaN(memberUserId)) {
      return withCors(request, Response.json({ error: "Invalid user id" }, { status: 400 }));
    }

    const result = await removeOrganizationMember({
      organizationId,
      memberUserId,
    });

    if (!result.ok) {
      return withCors(request, Response.json({ error: result.error }, { status: 400 }));
    }

    return withCors(request, Response.json({ ok: true }));
  }

  return null;
}
