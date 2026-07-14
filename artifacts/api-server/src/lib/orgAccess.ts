import type { Request, Response, NextFunction } from "express";
import { db, organizationMembersTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOrgMembership(userId: number) {
  const [row] = await db
    .select({
      organizationId: organizationMembersTable.organizationId,
      orgRole: organizationMembersTable.role,
    })
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, userId))
    .limit(1);

  return row ?? null;
}

export function isSiteAdmin(orgRole: string | null | undefined, userRole: string | null | undefined): boolean {
  if (userRole === "super_admin" || userRole === "admin") return true;
  return orgRole === "owner" || orgRole === "site_admin";
}

export async function requireSiteAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [membership, user] = await Promise.all([
    getOrgMembership(req.user.userId),
    db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.userId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!isSiteAdmin(membership?.orgRole, user?.role ?? req.user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
