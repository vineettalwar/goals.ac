import { db } from "@workspace/db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, eq, inArray, asc } from "drizzle-orm";
import { z } from "zod";
import {
  getProjectQuota,
  getOrganizationProjectCount,
  type PlanId,
} from "@/lib/usage";

export const OrgMemberRoleSchema = z.enum(["site_admin", "member"]);
export type OrgMemberRole = z.infer<typeof OrgMemberRoleSchema>;

export function isSuperAdmin(userRole: string | null | undefined): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

export function isSiteAdmin(orgRole: OrgMemberRole | null | undefined): boolean {
  return orgRole === "site_admin";
}

export interface OrgMembership {
  organizationId: number;
  orgRole: OrgMemberRole;
  assignedProjectId: number | null;
  organizationPlan: PlanId;
}

export async function getOrgMembership(userId: number): Promise<OrgMembership | null> {
  const [row] = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
      assignedProjectId: organizationMembersTable.assignedProjectId,
      organizationPlan: organizationsTable.plan,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  if (!row) return null;

  const parsedRole = OrgMemberRoleSchema.safeParse(row.orgRole);
  if (!parsedRole.success) return null;

  return {
    organizationId: row.organizationId,
    orgRole: parsedRole.data,
    assignedProjectId: row.assignedProjectId,
    organizationPlan: (row.organizationPlan as PlanId) ?? "starter",
  };
}

export async function getUserPlatformRole(userId: number): Promise<string> {
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.role ?? "user";
}

export async function listAccessibleProjectIds(userId: number): Promise<number[]> {
  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    const rows = await db.select({ id: websiteProjectsTable.id }).from(websiteProjectsTable);
    return rows.map((r) => r.id);
  }

  const membership = await getOrgMembership(userId);
  if (!membership) {
    const rows = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId));
    return rows.map((r) => r.id);
  }

  if (membership.orgRole === "site_admin") {
    const rows = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, membership.organizationId));
    return rows.map((r) => r.id);
  }

  if (membership.assignedProjectId != null) {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, membership.assignedProjectId),
          eq(websiteProjectsTable.organizationId, membership.organizationId),
        ),
      )
      .limit(1);
    return project ? [project.id] : [];
  }

  return [];
}

export async function listAccessibleProjects(userId: number) {
  const ids = await listAccessibleProjectIds(userId);
  if (ids.length === 0) return [];

  return db
    .select()
    .from(websiteProjectsTable)
    .where(inArray(websiteProjectsTable.id, ids))
    .orderBy(asc(websiteProjectsTable.id));
}

export async function requireProjectAccess(
  projectId: number,
  userId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const accessibleIds = await listAccessibleProjectIds(userId);
  if (!accessibleIds.includes(projectId)) {
    return { ok: false, status: 404, error: "Project not found" };
  }
  return { ok: true };
}

export async function getAccessibleProject(projectId: number, userId: number) {
  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return null;

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  return project ?? null;
}

export async function requireSiteAdminAccess(
  userId: number,
): Promise<
  | { ok: true; membership: OrgMembership }
  | { ok: false; status: number; error: string }
> {
  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    const membership = await getOrgMembership(userId);
    if (membership) {
      return { ok: true, membership };
    }
    return {
      ok: true,
      membership: {
        organizationId: 0,
        orgRole: "site_admin",
        assignedProjectId: null,
        organizationPlan: "scale",
      },
    };
  }

  const membership = await getOrgMembership(userId);
  if (!membership || membership.orgRole !== "site_admin") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, membership };
}

export async function assertCanCreateProject(
  userId: number,
  organizationId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string; code?: string }> {
  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) {
    return { ok: false, status: siteAdmin.status, error: siteAdmin.error };
  }

  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    return { ok: true };
  }

  if (siteAdmin.membership.organizationId !== organizationId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const [org] = await db
    .select({ plan: organizationsTable.plan })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  const quota = getProjectQuota(org.plan);
  if (quota === null) {
    return { ok: true };
  }

  const count = await getOrganizationProjectCount(organizationId);
  if (count >= quota) {
    return {
      ok: false,
      status: 402,
      error: "Site quota exhausted for your plan",
      code: "quota_exhausted",
    };
  }

  return { ok: true };
}

export async function resolveOrganizationIdForUser(userId: number): Promise<number | null> {
  const membership = await getOrgMembership(userId);
  return membership?.organizationId ?? null;
}

export interface CreateOrganizationInput {
  userId: number;
  name: string;
  plan?: PlanId;
  companyId?: number | null;
}

/** Create org and site_admin membership for a user (idempotent if membership exists). */
export async function ensureOrganizationForUser(input: CreateOrganizationInput): Promise<number> {
  const existing = await getOrgMembership(input.userId);
  if (existing) {
    if (input.companyId != null) {
      await db
        .update(organizationsTable)
        .set({ companyId: input.companyId, name: input.name })
        .where(eq(organizationsTable.id, existing.organizationId));
    }
    return existing.organizationId;
  }

  const [user] = await db
    .select({ plan: usersTable.plan })
    .from(usersTable)
    .where(eq(usersTable.id, input.userId))
    .limit(1);

  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: input.name,
      plan: input.plan ?? (user?.plan as PlanId) ?? "starter",
      ownerId: input.userId,
      companyId: input.companyId ?? null,
    })
    .returning({ id: organizationsTable.id });

  await db.insert(organizationMembersTable).values({
    organizationId: org.id,
    userId: input.userId,
    role: "site_admin",
    assignedProjectId: null,
  });

  return org.id;
}

export async function listOrganizationMembers(organizationId: number) {
  return db
    .select({
      id: organizationMembersTable.id,
      userId: organizationMembersTable.userId,
      role: organizationMembersTable.role,
      assignedProjectId: organizationMembersTable.assignedProjectId,
      email: usersTable.email,
      name: usersTable.name,
    })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(eq(organizationMembersTable.organizationId, organizationId))
    .orderBy(organizationMembersTable.id);
}

export async function updateOrganizationMember(input: {
  organizationId: number;
  memberUserId: number;
  role: OrgMemberRole;
  assignedProjectId: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.role === "member" && input.assignedProjectId == null) {
    return { ok: false, error: "Members must have an assigned project" };
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
      assignedProjectId: input.role === "site_admin" ? null : input.assignedProjectId,
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

export async function addOrganizationMember(input: {
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

  if (input.role === "member" && input.assignedProjectId == null) {
    return { ok: false, error: "Members must have an assigned project" };
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
    assignedProjectId: input.role === "site_admin" ? null : input.assignedProjectId,
  });

  return { ok: true };
}

export async function countOrganizationProjects(organizationId: number): Promise<number> {
  return getOrganizationProjectCount(organizationId);
}
