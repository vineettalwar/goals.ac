import { countAsInt } from "@workspace/db";
import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { count, desc, eq } from "drizzle-orm";
import { getBalance, getWorkspaceIdForOrganization } from "@workspace/billing";
import { toIsoString, toIsoStringOrNull } from "./dates";
import type { AdminOrganizationRow } from "./organizations";
import { listOrgAuditLog } from "./org-audit";
import type { OrgMemberRole } from "./users";

function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (!role) return null;
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return null;
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

export interface AdminOrganizationDetail {
  organization: AdminOrganizationRow & {
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: string | null;
  };
  members: Awaited<ReturnType<typeof listOrganizationMembers>>;
  projects: Array<{
    id: number;
    name: string;
    url: string;
    userId: number;
    createdAt: string;
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
    db
      .select({ count: countAsInt() })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.organizationId, organizationId))
      .then((rows) => rows[0]?.count ?? 0),
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

  const creditBalance = workspaceId != null ? await getBalance(workspaceId) : null;

  return {
    organization: {
      id: orgRow.id,
      name: orgRow.name,
      plan: orgRow.plan ?? "starter",
      ownerId: orgRow.ownerId,
      ownerEmail: orgRow.ownerEmail,
      ownerName: orgRow.ownerName,
      companyId: orgRow.companyId,
      createdAt: toIsoString(orgRow.createdAt),
      suspendedAt: toIsoStringOrNull(orgRow.suspendedAt),
      suspendedReason: orgRow.suspendedReason,
      subscriptionStatus: orgRow.subscriptionStatus,
      stripeCustomerId: orgRow.stripeCustomerId,
      projectCount,
      memberCount,
      stripeSubscriptionId: orgRow.stripeSubscriptionId,
      stripePriceId: orgRow.stripePriceId,
      currentPeriodEnd: toIsoStringOrNull(orgRow.currentPeriodEnd),
    },
    members,
    projects: projects.map((p) => ({ ...p, createdAt: toIsoString(p.createdAt) })),
    auditLog,
    creditBalance,
    workspaceId,
  };
}

export async function listOrganizationOptions(): Promise<Array<{ id: number; name: string }>> {
  const { asc } = await import("drizzle-orm");
  return db
    .select({ id: organizationsTable.id, name: organizationsTable.name })
    .from(organizationsTable)
    .orderBy(asc(organizationsTable.name));
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
  return { ...org, plan: org.plan ?? "starter" };
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

function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "platform_admin" || role === "super_admin";
}

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
