import { cache } from "react";
import { db } from "@workspace/db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import type { OrgSecuritySettings } from "@workspace/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { resolvePlanProjectQuota } from "@workspace/billing";
import {
  getOrganizationProjectCount,
  normalizePlanId,
  type PlanId,
} from "@/lib/billing/usage";
import {
  hasOrgPermission,
  isSuperAdmin,
  normalizeOrgRole,
  OrgPermission,
  type OrgMemberRole,
} from "@/lib/org/org-access-shared";

export interface OrgMembership {
  organizationId: number;
  orgRole: OrgMemberRole;
  assignedProjectId: number | null;
  organizationPlan: PlanId;
  suspendedAt: Date | null;
  securitySettings: OrgSecuritySettings | null;
}

export async function getOrgMembership(userId: number): Promise<OrgMembership | null> {
  const [row] = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
      assignedProjectId: organizationMembersTable.assignedProjectId,
      organizationPlan: organizationsTable.plan,
      suspendedAt: organizationsTable.suspendedAt,
      securitySettings: organizationsTable.securitySettings,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  if (!row) return null;

  const orgRole = normalizeOrgRole(row.orgRole);
  if (!orgRole) return null;

  return {
    organizationId: row.organizationId,
    orgRole,
    assignedProjectId: row.assignedProjectId,
    organizationPlan: (row.organizationPlan as PlanId) ?? "starter",
    suspendedAt: row.suspendedAt,
    securitySettings: row.securitySettings ?? null,
  };
}

export async function assertOrgNotSuspended(
  userId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) return { ok: true };

  const membership = await getOrgMembership(userId);
  if (membership?.suspendedAt) {
    return { ok: false, status: 403, error: "Organization is suspended" };
  }
  return { ok: true };
}

export async function requireOrgPermission(
  userId: number,
  permission: OrgPermission,
): Promise<
  | { ok: true; membership: OrgMembership | null }
  | { ok: false; status: number; error: string }
> {
  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    const membership = await getOrgMembership(userId);
    return { ok: true, membership };
  }

  const suspended = await assertOrgNotSuspended(userId);
  if (!suspended.ok) return suspended;

  const membership = await getOrgMembership(userId);
  if (!membership) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (!hasOrgPermission(membership.orgRole, permission)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, membership };
}

export async function getUserPlatformRole(userId: number): Promise<string> {
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.role ?? "user";
}

export function roleHasAllProjects(orgRole: OrgMemberRole): boolean {
  return orgRole === "owner" || orgRole === "site_admin";
}

/** Request-scoped dedupe — dashboard/layout often call this more than once. */
export const listAccessibleProjectIds = cache(async function listAccessibleProjectIds(
  userId: number,
  supportOrganizationId?: number | null,
): Promise<number[]> {
  if (supportOrganizationId != null) {
    const rows = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, supportOrganizationId));
    return rows.map((r) => r.id);
  }

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

  if (membership.suspendedAt) return [];

  if (roleHasAllProjects(membership.orgRole)) {
    const rows = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, membership.organizationId));
    return rows.map((r) => r.id);
  }

  if (membership.securitySettings?.allowCrossProjectEditors) {
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
});

export async function listAccessibleProjects(
  userId: number,
  supportOrganizationId?: number | null,
) {
  const ids = await listAccessibleProjectIds(userId, supportOrganizationId);
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
  const suspended = await assertOrgNotSuspended(userId);
  if (!suspended.ok) return suspended;

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

export async function requireIntegrationsManage(
  userId: number,
  projectId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) return access;
    return { ok: true };
  }

  const membership = await getOrgMembership(userId);
  if (membership) {
    if (membership.suspendedAt) {
      return { ok: false, status: 403, error: "Organization is suspended" };
    }
    if (!hasOrgPermission(membership.orgRole, OrgPermission.INTEGRATIONS_MANAGE)) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) return access;
    return { ok: true };
  }

  const [project] = await db
    .select({ userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project || project.userId !== userId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true };
}

export async function requireSiteAdminAccess(
  userId: number,
): Promise<
  | { ok: true; membership: OrgMembership }
  | { ok: false; status: number; error: string }
> {
  const result = await requireOrgPermission(userId, OrgPermission.TEAM_MANAGE);
  if (!result.ok) return result;
  if (!result.membership) {
    return {
      ok: true,
      membership: {
        organizationId: 0,
        orgRole: "site_admin",
        assignedProjectId: null,
        organizationPlan: "starter",
        suspendedAt: null,
        securitySettings: null,
      },
    };
  }
  return { ok: true, membership: result.membership };
}

export async function assertCanCreateProject(
  userId: number,
  organizationId: number,
): Promise<
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      plan?: PlanId;
    }
> {
  const perm = await requireOrgPermission(userId, OrgPermission.PROJECT_WRITE);
  if (!perm.ok) {
    return { ok: false, status: perm.status, error: perm.error };
  }

  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    return { ok: true };
  }

  if (perm.membership && perm.membership.organizationId !== organizationId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const [org] = await db
    .select({ plan: organizationsTable.plan, suspendedAt: organizationsTable.suspendedAt })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  if (org.suspendedAt) {
    return { ok: false, status: 403, error: "Organization is suspended" };
  }

  const quota = await resolvePlanProjectQuota(org.plan);
  if (quota === null) {
    return { ok: true };
  }

  const projectCount = await getOrganizationProjectCount(organizationId);
  if (projectCount >= quota) {
    const plan = normalizePlanId(org.plan);
    return {
      ok: false,
      status: 402,
      error: `You've reached the ${quota}-site limit on Starter. Add your API key in Integrations → AI for more capacity.`,
      code: "quota_exhausted",
      plan,
    };
  }

  return { ok: true };
}

export async function resolveOrganizationIdForUser(userId: number): Promise<number | null> {
  const membership = await getOrgMembership(userId);
  return membership?.organizationId ?? null;
}
