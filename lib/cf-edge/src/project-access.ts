import { getDb } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
  type OrgSecuritySettings,
  type WebsiteProject,
} from "@workspace/db/schema-sqlite";
import { and, eq, inArray } from "drizzle-orm";

/** D1-only edge workers — SQLite schema after `setD1Binding()`. */
function db(): GoalsD1Database {
  return getDb() as GoalsD1Database;
}

export type OrgMemberRole = "owner" | "site_admin" | "editor" | "viewer";

export interface OrgMembership {
  organizationId: number;
  orgRole: OrgMemberRole;
  assignedProjectId: number | null;
  suspendedAt: Date | null;
  securitySettings: OrgSecuritySettings | null;
}

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

function roleHasAllProjects(orgRole: OrgMemberRole): boolean {
  return orgRole === "owner" || orgRole === "site_admin";
}

function hasTeamManagePermission(orgRole: OrgMemberRole | null | undefined): boolean {
  return orgRole === "owner" || orgRole === "site_admin";
}

async function getUserPlatformRole(userId: number): Promise<string> {
  const [user] = await db()
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.role ?? "user";
}

export async function getOrgMembership(userId: number): Promise<OrgMembership | null> {
  const [row] = await db()
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
      assignedProjectId: organizationMembersTable.assignedProjectId,
      suspendedAt: organizationsTable.suspendedAt,
      securitySettings: organizationsTable.securitySettings,
    })
    .from(organizationMembersTable)
    .innerJoin(
      organizationsTable,
      eq(organizationsTable.id, organizationMembersTable.organizationId),
    )
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  if (!row) return null;

  const orgRole = normalizeOrgRole(row.orgRole);
  if (!orgRole) return null;

  return {
    organizationId: row.organizationId,
    orgRole,
    assignedProjectId: row.assignedProjectId,
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

export async function listAccessibleProjectIds(userId: number): Promise<number[]> {
  const platformRole = await getUserPlatformRole(userId);
  if (isSuperAdmin(platformRole)) {
    const rows = await db().select({ id: websiteProjectsTable.id }).from(websiteProjectsTable);
    return rows.map((r) => r.id);
  }

  const membership = await getOrgMembership(userId);
  if (!membership) {
    const rows = await db()
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, userId));
    return rows.map((r) => r.id);
  }

  if (membership.suspendedAt) return [];

  if (roleHasAllProjects(membership.orgRole)) {
    const rows = await db()
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, membership.organizationId));
    return rows.map((r) => r.id);
  }

  if (membership.securitySettings?.allowCrossProjectEditors) {
    const rows = await db()
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, membership.organizationId));
    return rows.map((r) => r.id);
  }

  if (membership.assignedProjectId != null) {
    const [project] = await db()
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

export async function getAccessibleProject(
  projectId: number,
  userId: number,
): Promise<WebsiteProject | null> {
  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return null;

  const [project] = await db()
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
        suspendedAt: null,
        securitySettings: null,
      },
    };
  }

  const suspended = await assertOrgNotSuspended(userId);
  if (!suspended.ok) return suspended;

  const membership = await getOrgMembership(userId);
  if (!membership) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (!hasTeamManagePermission(membership.orgRole)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, membership };
}

export async function listAccessibleProjects(userId: number): Promise<WebsiteProject[]> {
  const ids = await listAccessibleProjectIds(userId);
  if (ids.length === 0) return [];

  return db()
    .select()
    .from(websiteProjectsTable)
    .where(inArray(websiteProjectsTable.id, ids));
}
