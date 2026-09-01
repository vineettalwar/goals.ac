import { db, ilikeCompat } from "@workspace/db";
import {
  companiesTable,
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import type { OrgSecuritySettings, OrgInviteKind, OrgInvitePrefill } from "@workspace/db/schema";
import { and, asc, count, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import {
  generateInviteToken,
  hashInviteToken,
  isWellFormedInviteToken,
} from "@workspace/security/invite-tokens";
import {
  getOrCreateWorkspaceForOrganization,
  getBalance,
  getWorkspaceIdForOrganization,
  resolvePlanProjectQuota,
} from "@workspace/billing";
import { listOrgAuditLog, logOrgAudit } from "@/lib/org/org-audit";
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

export * from "@/lib/org/org-access-shared";

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

function roleHasAllProjects(orgRole: OrgMemberRole): boolean {
  return orgRole === "owner" || orgRole === "site_admin";
}

export async function listAccessibleProjectIds(
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
}

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

export interface CreateOrganizationInput {
  userId: number;
  name: string;
  plan?: PlanId;
  companyId?: number | null;
}

/** Create org and owner membership for a user (idempotent if membership exists). */
export async function getOrCreateOrganizationForUser(input: CreateOrganizationInput): Promise<number> {
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
    role: "owner",
    assignedProjectId: null,
  });

  await getOrCreateWorkspaceForOrganization({
    organizationId: org.id,
    ownerId: input.userId,
    name: input.name,
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

function requiresAssignedProject(role: OrgMemberRole): boolean {
  return role === "editor" || role === "viewer";
}

export async function updateOrganizationMember(input: {
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

export async function removeOrganizationMember(input: {
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

export async function suspendOrganization(input: {
  organizationId: number;
  reason?: string;
}): Promise<void> {
  await db
    .update(organizationsTable)
    .set({
      suspendedAt: new Date(),
      suspendedReason: input.reason ?? null,
    })
    .where(eq(organizationsTable.id, input.organizationId));
}

export async function unsuspendOrganization(organizationId: number): Promise<void> {
  await db
    .update(organizationsTable)
    .set({
      suspendedAt: null,
      suspendedReason: null,
    })
    .where(eq(organizationsTable.id, organizationId));
}

export async function updateOrganizationPlan(input: {
  organizationId: number;
  plan: PlanId;
}): Promise<{ ok: true; previousPlan: PlanId } | { ok: false; error: string }> {
  const [org] = await db
    .select({ plan: organizationsTable.plan })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, input.organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, error: "Organization not found" };
  }

  const previousPlan = (org.plan as PlanId) ?? "starter";
  if (previousPlan === input.plan) {
    return { ok: true, previousPlan };
  }

  const newQuota = await resolvePlanProjectQuota(input.plan);
  if (newQuota !== null) {
    const projectCount = await getOrganizationProjectCount(input.organizationId);
    if (projectCount > newQuota) {
      return {
        ok: false,
        error: `Cannot change plan: organization has ${projectCount} sites but ${input.plan} allows ${newQuota}`,
      };
    }
  }

  await db
    .update(organizationsTable)
    .set({ plan: input.plan })
    .where(eq(organizationsTable.id, input.organizationId));

  const members = await db
    .select({ userId: organizationMembersTable.userId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.organizationId, input.organizationId));

  const userIds = members.map((member) => member.userId);
  if (userIds.length > 0) {
    await db
      .update(usersTable)
      .set({ plan: input.plan })
      .where(inArray(usersTable.id, userIds));
  }

  return { ok: true, previousPlan };
}

export async function updateOrgSecuritySettings(
  organizationId: number,
  settings: OrgSecuritySettings,
): Promise<void> {
  await db
    .update(organizationsTable)
    .set({ securitySettings: settings })
    .where(eq(organizationsTable.id, organizationId));
}

export async function countOrganizationProjects(organizationId: number): Promise<number> {
  return getOrganizationProjectCount(organizationId);
}

export interface AdminOrganizationRow {
  id: number;
  name: string;
  plan: PlanId;
  ownerId: number;
  ownerEmail: string;
  ownerName: string;
  companyId: number | null;
  createdAt: Date;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  projectCount: number;
  memberCount: number;
}

export async function listAllOrganizations(): Promise<AdminOrganizationRow[]> {
  return listOrganizationsWithCounts();
}

export async function listRecentOrganizations(limit: number): Promise<AdminOrganizationRow[]> {
  return listOrganizationsWithCounts(limit);
}

export async function listOrganizationOptions(): Promise<Array<{ id: number; name: string }>> {
  return db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
    })
    .from(organizationsTable)
    .orderBy(asc(organizationsTable.name));
}

async function listOrganizationsWithCounts(limit?: number): Promise<AdminOrganizationRow[]> {
  const baseQuery = db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      plan: organizationsTable.plan,
      ownerId: organizationsTable.ownerId,
      ownerEmail: usersTable.email,
      ownerName: usersTable.name,
      companyId: organizationsTable.companyId,
      createdAt: organizationsTable.createdAt,
      suspendedAt: organizationsTable.suspendedAt,
      suspendedReason: organizationsTable.suspendedReason,
      subscriptionStatus: organizationsTable.subscriptionStatus,
      stripeCustomerId: organizationsTable.stripeCustomerId,
    })
    .from(organizationsTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationsTable.ownerId))
    .orderBy(desc(organizationsTable.id));

  const orgs = limit != null ? await baseQuery.limit(limit) : await baseQuery;

  if (orgs.length === 0) return [];

  const orgIds = orgs.map((org) => org.id);
  const [projectCounts, memberCounts] = await Promise.all([
    db
      .select({
        organizationId: websiteProjectsTable.organizationId,
        count: count(),
      })
      .from(websiteProjectsTable)
      .where(inArray(websiteProjectsTable.organizationId, orgIds))
      .groupBy(websiteProjectsTable.organizationId),
    db
      .select({
        organizationId: organizationMembersTable.organizationId,
        count: count(),
      })
      .from(organizationMembersTable)
      .where(inArray(organizationMembersTable.organizationId, orgIds))
      .groupBy(organizationMembersTable.organizationId),
  ]);

  const projectCountByOrg = new Map(
    projectCounts.map((row) => [row.organizationId, Number(row.count)]),
  );
  const memberCountByOrg = new Map(
    memberCounts.map((row) => [row.organizationId, Number(row.count)]),
  );

  return orgs.map((org) => ({
    ...org,
    plan: (org.plan as PlanId) ?? "starter",
    projectCount: projectCountByOrg.get(org.id) ?? 0,
    memberCount: memberCountByOrg.get(org.id) ?? 0,
  }));
}

export interface AdminOrganizationDetail {
  organization: AdminOrganizationRow & {
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: Date | null;
  };
  members: Awaited<ReturnType<typeof listOrganizationMembers>>;
  projects: Array<{
    id: number;
    name: string;
    url: string;
    userId: number;
    createdAt: Date;
  }>;
  auditLog: Awaited<ReturnType<typeof listOrgAuditLog>>;
  creditBalance: number | null;
  workspaceId: number | null;
}

export async function getOrganizationAdminDetail(
  organizationId: number,
): Promise<AdminOrganizationDetail | null> {
  const [orgRow] = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      plan: organizationsTable.plan,
      ownerId: organizationsTable.ownerId,
      ownerEmail: usersTable.email,
      ownerName: usersTable.name,
      companyId: organizationsTable.companyId,
      createdAt: organizationsTable.createdAt,
      suspendedAt: organizationsTable.suspendedAt,
      suspendedReason: organizationsTable.suspendedReason,
      subscriptionStatus: organizationsTable.subscriptionStatus,
      stripeCustomerId: organizationsTable.stripeCustomerId,
      stripeSubscriptionId: organizationsTable.stripeSubscriptionId,
      stripePriceId: organizationsTable.stripePriceId,
      currentPeriodEnd: organizationsTable.currentPeriodEnd,
    })
    .from(organizationsTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationsTable.ownerId))
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!orgRow) return null;

  const [projectCount, memberCount, members, projects, auditLog, workspaceId] = await Promise.all([
    getOrganizationProjectCount(organizationId),
    db
      .select({ count: count() })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.organizationId, organizationId))
      .then((rows) => Number(rows[0]?.count ?? 0)),
    listOrganizationMembers(organizationId),
    db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
        userId: websiteProjectsTable.userId,
        createdAt: websiteProjectsTable.createdAt,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, organizationId))
      .orderBy(desc(websiteProjectsTable.id)),
    listOrgAuditLog(organizationId, 40),
    getWorkspaceIdForOrganization(organizationId),
  ]);

  const creditBalance =
    workspaceId != null ? await getBalance(workspaceId) : null;

  return {
    organization: {
      ...orgRow,
      plan: (orgRow.plan as PlanId) ?? "starter",
      projectCount,
      memberCount,
    },
    members,
    projects,
    auditLog,
    creditBalance,
    workspaceId,
  };
}

export interface OnboardOrganizationInput {
  ownerUserId: number;
  organizationName: string;
  plan: PlanId;
  company?: {
    name: string;
    websiteUrl: string;
    industry: string;
    description: string;
    targetAudience: string;
  };
  firstProject?: {
    name: string;
    url: string;
  };
}

/** Create a new org for a user who is not already in one (platform admin use). */
export async function onboardOrganizationAsAdmin(
  input: OnboardOrganizationInput,
): Promise<
  | { ok: true; organizationId: number; companyId: number | null; projectId: number | null }
  | { ok: false; error: string }
> {
  const existing = await getOrgMembership(input.ownerUserId);
  if (existing) {
    return { ok: false, error: "User already belongs to an organization" };
  }

  let companyId: number | null = null;
  if (input.company) {
    const [company] = await db
      .insert(companiesTable)
      .values({
        userId: input.ownerUserId,
        name: input.company.name,
        websiteUrl: input.company.websiteUrl,
        industry: input.company.industry,
        description: input.company.description,
        targetAudience: input.company.targetAudience,
        onboardingComplete: true,
      })
      .returning({ id: companiesTable.id });
    companyId = company.id;
  }

  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: input.organizationName,
      plan: input.plan,
      ownerId: input.ownerUserId,
      companyId,
    })
    .returning({ id: organizationsTable.id });

  await db.insert(organizationMembersTable).values({
    organizationId: org.id,
    userId: input.ownerUserId,
    role: "owner",
    assignedProjectId: null,
  });

  await getOrCreateWorkspaceForOrganization({
    organizationId: org.id,
    ownerId: input.ownerUserId,
    name: input.organizationName,
  });

  await db
    .update(usersTable)
    .set({ plan: input.plan })
    .where(eq(usersTable.id, input.ownerUserId));

  let projectId: number | null = null;
  if (input.firstProject) {
    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId: input.ownerUserId,
        organizationId: org.id,
        name: input.firstProject.name,
        url: input.firstProject.url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning({ id: websiteProjectsTable.id });
    projectId = project.id;
  }

  return { ok: true, organizationId: org.id, companyId, projectId };
}

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  platformRole: string;
  plan: PlanId;
  organizationId: number | null;
  organizationName: string | null;
  orgRole: OrgMemberRole | null;
  projectCount: number;
  createdAt: Date;
  status: "active" | "pending_invite" | "no_org";
}

export interface ListAllUsersInput {
  search?: string;
  organizationId?: number;
  platformRole?: string;
  limit?: number;
  offset?: number;
}

export async function listAllUsers(input: ListAllUsersInput = {}): Promise<{
  users: AdminUserRow[];
  total: number;
}> {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;
  const now = new Date();

  const conditions = [];
  if (input.search?.trim()) {
    const term = `%${input.search.trim()}%`;
    conditions.push(or(ilikeCompat(usersTable.email, term), ilikeCompat(usersTable.name, term)));
  }
  if (input.platformRole) {
    conditions.push(eq(usersTable.role, input.platformRole));
  }
  if (input.organizationId) {
    conditions.push(eq(organizationMembersTable.organizationId, input.organizationId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      platformRole: usersTable.role,
      plan: usersTable.plan,
      organizationId: organizationMembersTable.organizationId,
      organizationName: organizationsTable.name,
      orgRole: organizationMembersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(organizationMembersTable, eq(organizationMembersTable.userId, usersTable.id))
    .leftJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId));

  const [rows, [totalRow]] = await Promise.all([
    (whereClause ? baseQuery.where(whereClause) : baseQuery)
      .orderBy(desc(usersTable.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(usersTable)
      .leftJoin(organizationMembersTable, eq(organizationMembersTable.userId, usersTable.id))
      .leftJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
      .where(whereClause),
  ]);

  if (rows.length === 0) {
    return { users: [], total: Number(totalRow?.count ?? 0) };
  }

  const userIds = rows.map((r) => r.id);
  const emails = rows.map((r) => r.email.toLowerCase());

  const [projectCounts, pendingInvites] = await Promise.all([
    db
      .select({
        userId: websiteProjectsTable.userId,
        count: count(),
      })
      .from(websiteProjectsTable)
      .where(inArray(websiteProjectsTable.userId, userIds))
      .groupBy(websiteProjectsTable.userId),
    db
      .select({ email: orgInvitesTable.email })
      .from(orgInvitesTable)
      .where(
        and(
          inArray(orgInvitesTable.email, emails),
          isNull(orgInvitesTable.acceptedAt),
          gt(orgInvitesTable.expiresAt, now),
        ),
      ),
  ]);

  const projectCountByUser = new Map(
    projectCounts.map((row) => [row.userId, Number(row.count)]),
  );
  const pendingInviteEmails = new Set(pendingInvites.map((i) => i.email.toLowerCase()));

  const users: AdminUserRow[] = rows.map((row) => {
    let status: AdminUserRow["status"] = "no_org";
    if (row.organizationId) {
      status = "active";
    } else if (pendingInviteEmails.has(row.email.toLowerCase())) {
      status = "pending_invite";
    }

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      platformRole: row.platformRole,
      plan: (row.plan as PlanId) ?? "starter",
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      orgRole: normalizeOrgRole(row.orgRole),
      projectCount: projectCountByUser.get(row.id) ?? 0,
      createdAt: row.createdAt,
      status,
    };
  });

  return { users, total: Number(totalRow?.count ?? 0) };
}

export interface PendingInviteRow {
  id: number;
  email: string;
  kind: OrgInviteKind;
  organizationId: number | null;
  organizationName: string | null;
  role: OrgMemberRole;
  assignedProjectId: number | null;
  prefill: OrgInvitePrefill | null;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  sendCount: number;
  lastSentAt: Date | null;
}

/** Pass `organizationId` to scope to one org's member invites; omit for the platform-wide admin list (member + firm). */
export async function listPendingInvites(organizationId?: number): Promise<PendingInviteRow[]> {
  const now = new Date();
  const conditions = [isNull(orgInvitesTable.acceptedAt), isNull(orgInvitesTable.revokedAt), gt(orgInvitesTable.expiresAt, now)];
  if (organizationId != null) {
    conditions.push(eq(orgInvitesTable.organizationId, organizationId));
  }

  const rows = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      kind: orgInvitesTable.kind,
      organizationId: orgInvitesTable.organizationId,
      organizationName: organizationsTable.name,
      role: orgInvitesTable.role,
      assignedProjectId: orgInvitesTable.assignedProjectId,
      prefill: orgInvitesTable.prefill,
      expiresAt: orgInvitesTable.expiresAt,
      createdAt: orgInvitesTable.createdAt,
      revokedAt: orgInvitesTable.revokedAt,
      sendCount: orgInvitesTable.sendCount,
      lastSentAt: orgInvitesTable.lastSentAt,
    })
    .from(orgInvitesTable)
    // Left join: firm invites have no organization yet.
    .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(and(...conditions))
    .orderBy(desc(orgInvitesTable.createdAt));

  return rows.map((row) => ({
    ...row,
    role: normalizeOrgRole(row.role) ?? "editor",
  }));
}

export async function revokeOrgInvite(inviteId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const [invite] = await db
    .select({ id: orgInvitesTable.id, acceptedAt: orgInvitesTable.acceptedAt, revokedAt: orgInvitesTable.revokedAt })
    .from(orgInvitesTable)
    .where(eq(orgInvitesTable.id, inviteId))
    .limit(1);

  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.acceptedAt) return { ok: false, error: "Invite already accepted" };
  if (invite.revokedAt) return { ok: false, error: "Invite already revoked" };

  await db
    .update(orgInvitesTable)
    .set({ revokedAt: new Date() })
    .where(eq(orgInvitesTable.id, inviteId));
  return { ok: true };
}

const INVITE_EXPIRY_DAYS = 7;

/** Turns "jane@acme.com" into "Acme" — the fallback org name when a firm invite carries no `prefill.orgName`. */
function deriveOrgNameFromEmail(email: string): string {
  const domain = email.split("@")[1] ?? email;
  const label = domain.split(".")[0] ?? domain;
  if (!label) return "New organization";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function createOrgInvite(input: {
  organizationId: number;
  email: string;
  role: OrgMemberRole;
  assignedProjectId: number | null;
  invitedByUserId: number;
}): Promise<
  | { ok: true; inviteId: number; token: string }
  | { ok: false; error: string }
> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const [org] = await db
    .select({ id: organizationsTable.id, name: organizationsTable.name })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, input.organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, error: "Organization not found" };
  }

  const now = new Date();
  const [existingPending] = await db
    .select({ id: orgInvitesTable.id })
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.organizationId, input.organizationId),
        eq(orgInvitesTable.email, normalizedEmail),
        isNull(orgInvitesTable.acceptedAt),
        isNull(orgInvitesTable.revokedAt),
        gt(orgInvitesTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (existingPending) {
    return { ok: false, error: "A pending invite already exists for this email and organization" };
  }

  const [existingMember] = await db
    .select({ id: organizationMembersTable.id })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(
      and(
        eq(organizationMembersTable.organizationId, input.organizationId),
        eq(usersTable.email, normalizedEmail),
      ),
    )
    .limit(1);

  if (existingMember) {
    return { ok: false, error: "User is already a member of this organization" };
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      organizationId: input.organizationId,
      email: normalizedEmail,
      role: input.role,
      kind: "member",
      assignedProjectId: input.assignedProjectId,
      token: null,
      tokenHash,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    })
    .returning({ id: orgInvitesTable.id });

  return { ok: true, inviteId: invite.id, token };
}

/**
 * Firm invites carry no `organizationId` — the org does not exist yet (see D2 in the PRD:
 * `organizations.owner_id` is NOT NULL, so it cannot be created before its owner user is).
 * The org is created at acceptance in `acceptOrgInvite` below.
 */
export async function createFirmInvite(input: {
  email: string;
  prefill: OrgInvitePrefill;
  invitedByUserId: number;
}): Promise<{ ok: true; inviteId: number; token: string } | { ok: false; error: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const now = new Date();

  const [existingPending] = await db
    .select({ id: orgInvitesTable.id })
    .from(orgInvitesTable)
    .where(
      and(
        eq(orgInvitesTable.email, normalizedEmail),
        eq(orgInvitesTable.kind, "firm"),
        isNull(orgInvitesTable.acceptedAt),
        isNull(orgInvitesTable.revokedAt),
        gt(orgInvitesTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (existingPending) {
    return { ok: false, error: "A pending firm invite already exists for this email" };
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [invite] = await db
    .insert(orgInvitesTable)
    .values({
      organizationId: null,
      email: normalizedEmail,
      // Forced at acceptance regardless — a firm invite always makes the accepting user the
      // org's owner (A2). Stored here too so the row reflects the outcome.
      role: "owner",
      kind: "firm",
      prefill: input.prefill,
      token: null,
      tokenHash,
      invitedByUserId: input.invitedByUserId,
      expiresAt,
    })
    .returning({ id: orgInvitesTable.id });

  return { ok: true, inviteId: invite.id, token };
}

export interface ResendableInvite {
  email: string;
  kind: OrgInviteKind;
  organizationName: string | null;
  prefill: OrgInvitePrefill | null;
  invitedByUserId: number;
}

/** Rotates the token (old link stops working), bumps send tracking, and refreshes the expiry. */
export async function resendOrgInvite(
  inviteId: number,
): Promise<{ ok: true; token: string; invite: ResendableInvite } | { ok: false; error: string }> {
  const [invite] = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      kind: orgInvitesTable.kind,
      organizationId: orgInvitesTable.organizationId,
      organizationName: organizationsTable.name,
      prefill: orgInvitesTable.prefill,
      invitedByUserId: orgInvitesTable.invitedByUserId,
      acceptedAt: orgInvitesTable.acceptedAt,
      revokedAt: orgInvitesTable.revokedAt,
      sendCount: orgInvitesTable.sendCount,
    })
    .from(orgInvitesTable)
    .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(eq(orgInvitesTable.id, inviteId))
    .limit(1);

  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.acceptedAt) return { ok: false, error: "Invite already accepted" };
  if (invite.revokedAt) return { ok: false, error: "Invite has been revoked" };

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(orgInvitesTable)
    .set({
      token: null,
      tokenHash,
      expiresAt,
      sendCount: (invite.sendCount ?? 0) + 1,
      lastSentAt: new Date(),
    })
    .where(eq(orgInvitesTable.id, inviteId));

  return {
    ok: true,
    token,
    invite: {
      email: invite.email,
      kind: invite.kind,
      organizationName: invite.organizationName,
      prefill: invite.prefill,
      invitedByUserId: invite.invitedByUserId,
    },
  };
}

export interface InviteDetails {
  id: number;
  email: string;
  role: OrgMemberRole;
  kind: OrgInviteKind;
  organizationId: number | null;
  organizationName: string | null;
  prefill: OrgInvitePrefill | null;
  assignedProjectId: number | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expired: boolean;
  revoked: boolean;
}

/**
 * Looks up an invite by its plaintext token. Lookups go through `token_hash`; rows created
 * before this change have a null `token_hash` and are matched on the legacy plaintext `token`
 * column instead (temporary — those rows expire within 7 days of the migration).
 */
export async function getInviteByToken(token: string): Promise<InviteDetails | null> {
  if (!isWellFormedInviteToken(token)) return null;

  const tokenHash = hashInviteToken(token);
  const selection = {
    id: orgInvitesTable.id,
    email: orgInvitesTable.email,
    role: orgInvitesTable.role,
    kind: orgInvitesTable.kind,
    organizationId: orgInvitesTable.organizationId,
    organizationName: organizationsTable.name,
    prefill: orgInvitesTable.prefill,
    assignedProjectId: orgInvitesTable.assignedProjectId,
    expiresAt: orgInvitesTable.expiresAt,
    acceptedAt: orgInvitesTable.acceptedAt,
    revokedAt: orgInvitesTable.revokedAt,
  };

  let [row] = await db
    .select(selection)
    .from(orgInvitesTable)
    .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
    .where(eq(orgInvitesTable.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    // Legacy fallback for invites issued before token hashing shipped.
    [row] = await db
      .select(selection)
      .from(orgInvitesTable)
      .leftJoin(organizationsTable, eq(organizationsTable.id, orgInvitesTable.organizationId))
      .where(eq(orgInvitesTable.token, token))
      .limit(1);
  }

  if (!row) return null;

  const now = new Date();
  return {
    id: row.id,
    email: row.email,
    role: normalizeOrgRole(row.role) ?? "editor",
    kind: row.kind,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    prefill: row.prefill,
    assignedProjectId: row.assignedProjectId,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    expired: row.expiresAt < now,
    revoked: row.revokedAt != null,
  };
}

export async function acceptOrgInvite(input: {
  token: string;
  userId: number;
}): Promise<{ ok: true; organizationId: number; kind: OrgInviteKind } | { ok: false; error: string }> {
  const invite = await getInviteByToken(input.token);
  if (!invite) {
    return { ok: false, error: "Invite not found" };
  }
  if (invite.acceptedAt) {
    return { ok: false, error: "Invite has already been accepted" };
  }
  if (invite.revoked) {
    return { ok: false, error: "Invite has been revoked" };
  }
  if (invite.expired) {
    return { ok: false, error: "Invite has expired" };
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, input.userId))
    .limit(1);

  if (!user) {
    return { ok: false, error: "User not found" };
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      ok: false,
      error: "This invite was sent to a different email address. Sign in with the invited email.",
    };
  }

  if (invite.kind === "firm") {
    // A user can belong to only one organization today (getOrgMembership assumes it), so an
    // existing platform user attaches to the new org only if they aren't in one already.
    const existingMembership = await getOrgMembership(input.userId);
    if (existingMembership) {
      return { ok: false, error: "You already belong to an organization" };
    }

    const prefill = invite.prefill ?? {};
    const orgName = prefill.orgName?.trim() || deriveOrgNameFromEmail(user.email);
    const plan = normalizePlanId(prefill.plan);

    const [org] = await db
      .insert(organizationsTable)
      .values({
        name: orgName,
        plan,
        vertical: prefill.vertical ?? null,
        ownerId: input.userId,
      })
      .returning({ id: organizationsTable.id });

    await db.insert(organizationMembersTable).values({
      organizationId: org.id,
      userId: input.userId,
      role: "owner",
      assignedProjectId: null,
    });

    await getOrCreateWorkspaceForOrganization({
      organizationId: org.id,
      ownerId: input.userId,
      name: orgName,
    });

    await db
      .update(orgInvitesTable)
      .set({ acceptedAt: new Date() })
      .where(eq(orgInvitesTable.id, invite.id));

    await logOrgAudit({
      organizationId: org.id,
      actorUserId: input.userId,
      action: "invite.accepted",
      resourceType: "invite",
      resourceId: invite.id,
      metadata: { email: invite.email, kind: "firm" },
    });

    return { ok: true, organizationId: org.id, kind: "firm" };
  }

  if (invite.organizationId == null) {
    return { ok: false, error: "Invite is missing an organization" };
  }

  const existingMembership = await getOrgMembership(input.userId);
  if (existingMembership && existingMembership.organizationId !== invite.organizationId) {
    return { ok: false, error: "You already belong to another organization" };
  }

  const result = await addOrganizationMember({
    organizationId: invite.organizationId,
    userId: input.userId,
    role: invite.role,
    assignedProjectId: invite.assignedProjectId,
  });

  if (!result.ok) {
    return result;
  }

  await db
    .update(orgInvitesTable)
    .set({ acceptedAt: new Date() })
    .where(eq(orgInvitesTable.id, invite.id));

  return { ok: true, organizationId: invite.organizationId, kind: "member" };
}

export async function getUserForImpersonation(userId: number) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return user ?? null;
}

const IMPERSONATION_ROLE_PRIORITY: OrgMemberRole[] = ["owner", "site_admin", "editor", "viewer"];

export async function resolveOrganizationImpersonationTarget(organizationId: number) {
  const [org] = await db
    .select({ ownerId: organizationsTable.ownerId })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) return null;

  const owner = await getUserForImpersonation(org.ownerId);
  if (owner && !isSuperAdmin(owner.role)) {
    return owner;
  }

  const members = await db
    .select({
      userId: organizationMembersTable.userId,
      orgRole: organizationMembersTable.role,
      email: usersTable.email,
      name: usersTable.name,
      platformRole: usersTable.role,
    })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(eq(organizationMembersTable.organizationId, organizationId));

  const eligible = members
    .filter((member) => !isSuperAdmin(member.platformRole))
    .sort(
      (a, b) =>
        IMPERSONATION_ROLE_PRIORITY.indexOf(a.orgRole as OrgMemberRole) -
        IMPERSONATION_ROLE_PRIORITY.indexOf(b.orgRole as OrgMemberRole),
    );

  const best = eligible[0];
  if (best) {
    return {
      id: best.userId,
      email: best.email,
      name: best.name,
      role: best.platformRole,
    };
  }

  if (owner && !isSuperAdmin(owner.role)) {
    return owner;
  }

  return null;
}

export async function getOrganizationSupportContext(organizationId: number) {
  const [org] = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      companyId: organizationsTable.companyId,
      plan: organizationsTable.plan,
    })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);

  if (!org) return null;

  return {
    ...org,
    plan: (org.plan as PlanId) ?? "starter",
  };
}

