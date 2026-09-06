import { db } from "@workspace/db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getOrCreateWorkspaceForOrganization, resolvePlanProjectQuota } from "@workspace/billing";
import {
  getOrganizationProjectCount,
  type PlanId,
} from "@/lib/billing/usage";
import { normalizeOrgRole, type OrgMemberRole } from "@/lib/org/org-access-shared";
import { getOrgMembership, roleHasAllProjects } from "@/lib/org/org-membership";

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
  settings: import("@workspace/db/schema").OrgSecuritySettings,
): Promise<void> {
  await db
    .update(organizationsTable)
    .set({ securitySettings: settings })
    .where(eq(organizationsTable.id, organizationId));
}

export async function countOrganizationProjects(organizationId: number): Promise<number> {
  return getOrganizationProjectCount(organizationId);
}
