import { db, ilikeCompat } from "@workspace/db";
import {
  companiesTable,
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, asc, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  getOrCreateWorkspaceForOrganization,
  getBalance,
  getWorkspaceIdForOrganization,
} from "@workspace/billing";
import { getOrganizationProjectCount, type PlanId } from "@/lib/billing/usage";
import { normalizeOrgRole, isSuperAdmin, type OrgMemberRole } from "@/lib/org/org-access-shared";
import { listOrgAuditLog } from "@/lib/org/org-audit";
import { getOrgMembership } from "@/lib/org/org-membership";
import { listOrganizationMembers } from "@/lib/org/org-members";

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
