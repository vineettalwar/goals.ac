import { countAsInt } from "@workspace/db";
import { db } from "./db";
import {
  companiesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { and, eq, inArray } from "drizzle-orm";
import {
  getOrCreateWorkspaceForOrganization,
  normalizePlanId,
  resolvePlanProjectQuota,
  type PlanId,
} from "@workspace/billing";
import type { OrgMemberRole } from "./users";

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

async function getOrganizationProjectCount(organizationId: number): Promise<number> {
  const [row] = await db
    .select({ count: countAsInt() })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.organizationId, organizationId));
  return row?.count ?? 0;
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
  plan: PlanId | string;
}): Promise<{ ok: true; previousPlan: PlanId } | { ok: false; error: string }> {
  const [org] = await db
    .select({ plan: organizationsTable.plan })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, input.organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, error: "Organization not found" };
  }

  const previousPlan = normalizePlanId(org.plan);
  const nextPlan = normalizePlanId(input.plan);
  if (previousPlan === nextPlan) {
    return { ok: true, previousPlan };
  }

  const newQuota = await resolvePlanProjectQuota(nextPlan);
  if (newQuota !== null) {
    const projectCount = await getOrganizationProjectCount(input.organizationId);
    if (projectCount > newQuota) {
      return {
        ok: false,
        error: `Cannot change plan: organization has ${projectCount} sites but ${nextPlan} allows ${newQuota}`,
      };
    }
  }

  await db
    .update(organizationsTable)
    .set({ plan: nextPlan })
    .where(eq(organizationsTable.id, input.organizationId));

  const members = await db
    .select({ userId: organizationMembersTable.userId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.organizationId, input.organizationId));

  const userIds = members.map((member) => member.userId);
  if (userIds.length > 0) {
    await db
      .update(usersTable)
      .set({ plan: nextPlan })
      .where(inArray(usersTable.id, userIds));
  }

  return { ok: true, previousPlan };
}

export interface OnboardOrganizationInput {
  ownerUserId: number;
  organizationName: string;
  plan: string;
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
  const [existingMembership] = await db
    .select({ organizationId: organizationMembersTable.organizationId })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, input.ownerUserId))
    .limit(1);

  if (existingMembership) {
    return { ok: false, error: "User already belongs to an organization" };
  }

  const normalizedPlan = normalizePlanId(input.plan);

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
      plan: normalizedPlan,
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
    .set({ plan: normalizedPlan })
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
