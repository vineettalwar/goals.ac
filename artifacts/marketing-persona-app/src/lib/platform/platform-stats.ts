import { db } from "@workspace/db";
import {
  orgInvitesTable,
  organizationsTable,
  usersTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";

export interface PlatformStats {
  userCount: number;
  organizationCount: number;
  projectCount: number;
  suspendedOrgCount: number;
  pendingInviteCount: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = new Date();

  const [
    [userRow],
    [orgRow],
    [projectRow],
    [suspendedRow],
    [pendingInviteRow],
  ] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(organizationsTable),
    db.select({ count: count() }).from(websiteProjectsTable),
    db
      .select({ count: count() })
      .from(organizationsTable)
      .where(sql`${organizationsTable.suspendedAt} is not null`),
    db
      .select({ count: count() })
      .from(orgInvitesTable)
      .where(and(isNull(orgInvitesTable.acceptedAt), gt(orgInvitesTable.expiresAt, now))),
  ]);

  return {
    userCount: Number(userRow?.count ?? 0),
    organizationCount: Number(orgRow?.count ?? 0),
    projectCount: Number(projectRow?.count ?? 0),
    suspendedOrgCount: Number(suspendedRow?.count ?? 0),
    pendingInviteCount: Number(pendingInviteRow?.count ?? 0),
  };
}
