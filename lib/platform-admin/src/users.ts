import { db, ilikeCompat } from "@workspace/db";
import {
  orgInvitesTable,
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";

export type OrgMemberRole = "owner" | "site_admin" | "editor" | "viewer";

function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (!role) return null;
  if (role === "member") return "editor";
  if (role === "owner" || role === "site_admin" || role === "editor" || role === "viewer") {
    return role;
  }
  return null;
}

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  platformRole: string;
  plan: string;
  organizationId: number | null;
  organizationName: string | null;
  orgRole: OrgMemberRole | null;
  projectCount: number;
  createdAt: string;
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
      plan: row.plan ?? "starter",
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      orgRole: normalizeOrgRole(row.orgRole),
      projectCount: projectCountByUser.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
      status,
    };
  });

  return { users, total: Number(totalRow?.count ?? 0) };
}
