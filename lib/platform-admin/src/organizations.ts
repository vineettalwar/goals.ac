import { db } from "./db";
import {
  organizationMembersTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema-sqlite";
import { count, desc, eq, inArray } from "drizzle-orm";
import { toIsoString, toIsoStringOrNull } from "./dates";

export interface AdminOrganizationRow {
  id: number;
  name: string;
  plan: string;
  ownerId: number;
  ownerEmail: string;
  ownerName: string;
  companyId: number | null;
  createdAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  projectCount: number;
  memberCount: number;
}

export async function listAllOrganizations(limit?: number): Promise<AdminOrganizationRow[]> {
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
    id: org.id,
    name: org.name,
    plan: org.plan ?? "starter",
    ownerId: org.ownerId,
    ownerEmail: org.ownerEmail,
    ownerName: org.ownerName,
    companyId: org.companyId,
    createdAt: toIsoString(org.createdAt),
    suspendedAt: toIsoStringOrNull(org.suspendedAt),
    suspendedReason: org.suspendedReason,
    subscriptionStatus: org.subscriptionStatus,
    stripeCustomerId: org.stripeCustomerId,
    projectCount: projectCountByOrg.get(org.id) ?? 0,
    memberCount: memberCountByOrg.get(org.id) ?? 0,
  }));
}
